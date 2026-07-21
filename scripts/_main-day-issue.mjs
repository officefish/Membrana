/**
 * Движок синтеза центральной задачи дня → docs/MAIN_DAY_ISSUE.md.
 * Запускать **после** plan:day и standup. Code-review — вечером; утром читается DAILY_CODE_REVIEW.md.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';
import {
  assembleStandupPrompt,
  collectOpenIssues,
  collectStatusSnapshot,
  guardDailyCodeReviewInput,
  readBounded,
} from './_daily-standup.mjs';
import {
  CURRENT_TASK_BUFFER_REL,
  MAIN_DAY_ISSUE_REL,
  formatRegistryBlock,
  validateFocusId,
} from './lib/main-day-issue-paths.mjs';
import { headRevision } from './lib/git-day-context.mjs';
import { provenanceHeader, readEntry, gitFsIo } from './lib/angelina-adapter.mjs';
import { frame } from './lib/day-plan-frame.mjs';
import { readDated } from './lib/read-dated.mjs';
import {
  buildDetectionPlanningConstraintsBullets,
  FFT_METRICS_POTENTIAL_AND_LIMITS_REL,
} from './lib/detection-planning-priorities.mjs';
import {
  listActive,
  listPendingGithubClose,
  loadRegistry,
} from './lib/task-registry.mjs';
import {
  MAIN_DAY_RAG_QUERY,
  formatRagContextBlock,
  logRagStatus,
  retrieveRagContext,
} from './lib/rag-ritual.mjs';

const MAX_CONTEXT_CHARS = 95_000;
const MAX_DOC_CHARS = 22_000;
const MAX_BUFFER_CHARS = 8_000;
const MAX_PROMPT_EXCERPT = 10_000;

const INPUT_DOCS = [
  { rel: 'docs/DAILY_STANDUP.md', required: true, label: 'Стендап дня (главный вход)' },
  {
    rel: FFT_METRICS_POTENTIAL_AND_LIMITS_REL,
    required: false,
    label: 'FFT/trends: потолок эшелона 0 и приоритеты (эпик #84)',
  },
  { rel: 'docs/STRATEGY_DAY.md', required: false, label: 'Горизонт дня (генератор #592 — веха, не список задач)', maxAgeDays: 0 },
  { rel: 'docs/STRATEGIC_PLAN_DAY.md', required: false, label: 'План на день (устар. генератор — вещдок, пока не удалён)' },
  { rel: 'docs/truth/registry.json', required: false, label: 'Граф правды — кристаллы-посылки дня (S7: генератор читает граф, был grep=0)' },
  { rel: 'docs/tasks/main-day-assertions.json', required: false, label: 'МАГИСТРАЛЬ ВЛАДЕЛЬЦА (sources[0].claim) — приоритет над синтезом; probe и генератор читают ОДИН источник' },
  {
    rel: 'docs/DAILY_CODE_REVIEW.md',
    required: false,
    label: 'Вчерашнее вечернее code-review (вход, не генерировать утром)',
    // Кросс-дневное ребро: утро ЗАКОННО читает ревью прошлого вечера. Поэтому 1,
    // а не 0 — требование «сегодня» вставало бы каждое утро. Но ревью трёхдневной
    // давности уже не вход, а вещдок того, что вечер не отработал.
    maxAgeDays: 1,
  },
  { rel: 'docs/STRATEGIC_PLAN_WEEK.md', required: false, label: 'План на неделю' },
  { rel: MAIN_DAY_ISSUE_REL, required: false, label: 'Предыдущий MAIN_DAY_ISSUE' },
  {
    rel: CURRENT_TASK_BUFFER_REL,
    required: false,
    label: 'Вспомогательный буфер CURRENT_TASK (черновики; может содержать шум)',
  },
  { rel: 'docs/DAY_ISSUES.md', required: false, label: 'Бэклог DAY_ISSUES' },
  {
    rel: 'docs/NIGHT_HUNT_PR_REVIEW.md',
    required: false,
    label: 'Night Hunt PR (утренний обзор ночных отчётов)',
  },
];

/** Локальный календарный день — «сегодня» для гейта свежести входов. */
function localDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function collectDocBlocks() {
  const blocks = [];
  const missingRequired = [];
  const staleInputs = [];
  const today = localDayKey();

  for (const { rel, required, label, maxAgeDays } of INPUT_DOCS) {
    const abs = resolve(process.cwd(), rel);
    const maxChars = rel === CURRENT_TASK_BUFFER_REL ? MAX_BUFFER_CHARS : MAX_DOC_CHARS;
    const text = readBounded(abs, maxChars);
    if (!text) {
      if (required) missingRequired.push(rel);
      if (rel === CURRENT_TASK_BUFFER_REL) {
        blocks.push(`### ${label}\n\n(\`${rel}\` пуст или отсутствует — нормально)\n`);
      } else {
        blocks.push(`### ${label}\n\n(\`${rel}\` отсутствует)\n`);
      }
      continue;
    }

    // ГЕЙТ СВЕЖЕСТИ ВХОДА (узел F, спринт ritual-step-manifest-sf). Утро НЕ
    // блокируем — план строить надо. Но протухший вход обязан стать ВИДИМЫМ, и
    // именно в артефакте, а не только в консоли: читатель MAIN_DAY_ISSUE должен
    // знать, что план построен на трёхдневном ревью. Молчаливое чтение
    // протухшего входа и было инцидентом.
    const stale = Number.isInteger(maxAgeDays)
      ? readDated(rel, { today, maxAgeDays, label }).why
      : null;
    if (stale) {
      staleInputs.push(stale);
      console.warn(`[main-day-issue] ⚠ ${stale}`);
      blocks.push(`### ${label} (\`${rel}\`)\n\n> ⚠ **ВХОД НЕСВЕЖ:** ${stale}\n\n${text}\n`);
      continue;
    }

    blocks.push(`### ${label} (\`${rel}\`)\n\n${text}\n`);
  }

  return { blocks: blocks.join('\n'), missingRequired, staleInputs };
}

function collectActivePromptExcerpts(active, { full }) {
  const limit = full ? MAX_PROMPT_EXCERPT : 5_000;
  const blocks = [];

  for (const t of active) {
    if (!t.promptPath) {
      blocks.push(`#### Task \`${t.id}\`\n\n(промпт не зарегистрирован)\n`);
      continue;
    }
    const abs = resolve(process.cwd(), t.promptPath);
    const text = readBounded(abs, limit);
    blocks.push(
      `#### Task \`${t.id}\` — \`${t.promptPath}\`\n\n${text ?? '(файл промпта не найден)'}\n`,
    );
  }

  return blocks.length ? blocks.join('\n') : '(нет активных промптов)';
}

/**
 * Гейт скелета (K, M2): какие заголовки слотов каркаса отсутствуют в теле. Пустая выдача =
 * скелет цел. Экспорт — для юнит-теста без LLM.
 * @param {string} body
 * @returns {string[]}
 */
export function missingSlotHeadings(body) {
  const text = String(body ?? '');
  return frame()
    .filter((s) => !new RegExp(`^##\\s+${s.title}\\s*$`, 'mu').test(text))
    .map((s) => s.title);
}

function buildGenerationPrompt({ outputRel, focusOverride, activeCount, issueCount }) {
  const today = new Date().toISOString().slice(0, 10);
  const focusHint = focusOverride
    ? `Оператор зафиксировал primary focus: \`${focusOverride}\` — используй его, если не противоречит стендапу и реестру (иначе объясни конфликт).`
    : 'Выбери **один** primary focus из active task-промптов реестра или явно зафиксируй «фокус вне реестра» с обоснованием.';

  return [
    '# Задание',
    '',
    `Сформируй **центральную задачу дня** на **${today}** для репозитория Membrana.`,
    'Это **не** повтор стендапа: стендап широкий, **MAIN_DAY_ISSUE** — **единственный обязательный мандат** на сегодня.',
    '`docs/CURRENT_TASK.md` во входах — только вспомогательный буфер; **не** копируй оттуда без проверки по стендапу и реестру.',
    '',
    focusHint,
    '',
    '## Обязательная структура (заголовки ## — строго)',
    '',
    '## Метаданные',
    'Таблица: | Поле | Значение |',
    '- `primaryFocusId` — id из реестра или `none`',
    '- `primaryTitle` — одна строка',
    '- `githubIssue` — #N или —',
    '- `size` — S/M/L',
    '- `promptPath` — путь к task-промпту или —',
    '- `сгенерировано` — дата',
    '',
    // 5-блочный каркас (K, вердикт M2): заголовки слотов задаёт ДЕТЕРМИНИРОВАННЫЙ слой
    // (frame() из day-plan-frame.mjs), LLM владеет только текстом внутри. Пустой слот —
    // легальное явное состояние («— пусто —»), не исчезновение заголовка.
    ...frame().flatMap((s) => [
      `## ${s.title}`,
      s.kind === 'magistral'
        ? 'ОДНА задача L/L+ — сильнейший прогресс дня; 3–6 предложений + критерий успеха к вечеру.'
        : s.kind === 'reinforcement'
          ? 'ДВЕ задачи M+ в поддержку магистрали (bullet list).'
          : s.kind === 'perspective'
            ? '2–3 темы-вектора (не обязательства); bullet list.'
            : s.kind === 'experimental'
              ? '2–3 предложения из инсайтов и снов; bullet list.'
              : 'Санитарные по вчерашнему дню (архитектура/линт/тесты/бестиарий/безопасность); bullet list.',
      'Если наполнить нечем — напиши «— пусто —» под заголовком, НЕ убирай заголовок.',
      '',
    ]),
    '## Почему это магистраль (таблица обоснования)',
    'Колонки строго: | Утверждение | Происхождение | Первоисточник | Свежесть |',
    '- **Происхождение** — откуда факт: `код` / `issue` / `снимок-хардкод` / `план` / `сессия`.',
    '- **Первоисточник** — корень цепочки, а НЕ промежуточный документ. Если STRATEGIC_PLAN_DAY',
    '  цитирует `detection-planning-priorities.mjs`, первоисточник — второй, со своей датой.',
    '- **Свежесть** — дата первоисточника.',
    '',
    'Считай голоса по РАЗЛИЧНЫМ первоисточникам, а не по строкам. Источники, производные',
    'от одного снимка, коррелированы полностью — их суммарный вес равен весу ОДНОГО',
    '(так же, как коррелированные детекторы в ансамбле не усиливают друг друга).',
    'Отражения одного первоисточника сгруппируй и подпиши ТЕКСТОМ: «1 источник, N отражений».',
    '',
    'Живой прецедент 16.07: STRATEGIC_PLAN_DAY, форсайт и стендап дали три галочки —',
    'все три были отражением одного снимка от 06.07. Единственный несогласный источник',
    '(вчерашний MAIN_DAY_ISSUE, опиравшийся на факт мёржа) оказался единственным правым',
    'и был отброшен как «противоречие». Не повтори: несогласный независимый факт весит',
    'больше, чем три отражения согласного снимка.',
    '',
    '## Посылки (обязательно, если фокус строится на «работы ещё нет»)',
    'Таблица: | Посылка | Маркер | Вердикт |',
    '- **Посылка** — утверждение, на котором держится назначение работы («fusion в коде не живёт»).',
    '- **Маркер** — ПРОВЕРЯЕМОЕ доказательство: `symbol:<имя>` или `file:<путь>`. Не «issue open».',
    '- **Вердикт** — `holds` / `violated` / `unknown`; при `violated` пометь развилку ТЕКСТОМ',
    '  «ПОСЫЛКА НАРУШЕНА» и НЕ назначай эту работу.',
    'Если развилки A/B нет — напиши «развилки нет, посылок не требуется».',
    '',
    '## Сегодня делаем',
    'Нумерованный список 3–7 пунктов; каждый — проверяемый результат (не «поработать над»).',
    '',
    '## Definition of Done (фокус)',
    '5–8 чекбоксов `- [ ] …` только для primary focus.',
    '',
    '## Сознательно не делаем сегодня',
    'Bullet list: что из стендапа/issues/temp **откладываем**, чтобы не расползтись.',
    '',
    '## Вторично (если останется время)',
    'Не больше **2** пунктов.',
    '',
    '## Зависимости и риски',
    '2–4 пункта; блокеры назвать явно.',
    '',
    '## Ссылки',
    '- Bullet links на DAILY_STANDUP, task-промпт, Issue.',
    '',
    'Ограничения:',
    '- Язык — русский.',
    `- Активных task-промптов в реестре: ${activeCount}; открытых Issues в контексте: ${issueCount}.`,
    '- **Ровно один** primary focus; вторичных — не больше двух.',
    '- Не выдумывай закрытые задачи и пакеты.',
    '- Если активных задач несколько — выбери одну по приоритету WHITE_PAPER / стендапа / L-before-S; остальные только в «не делаем» или «вторично».',
    '- Не дублируй стендап целиком — только решение «что делаем сейчас».',
    '- **Маркер в коде первичен, Issue вторичен** (консилиум 2026-07-16). «Issue open» НЕ означает',
    '  «работа не сделана»: 16.07 план назначил магистралью написать `fuseDetectorConfidences`,',
    '  слитый 13.07 — issue висел лишь потому, что PR дал «(#415)» вместо «Closes #415».',
    '  Прежде чем назначить работу на основании «этого ещё нет» — назови маркер (символ/файл),',
    '  которым это проверяется. Расхождение «issue open, а символ есть» — НАХОДКА (реестр протух),',
    '  её надо подсветить, а не тихо обойти. Гейт: `yarn main-day-probe`.',
    '- **Не** выбирай primary focus «benchmark harmonic/cepstral/flux / Этап 1.A» — см. FFT_METRICS_POTENTIAL_AND_LIMITS.md §6; приоритет — trends DRONE_TIGHT, validated data, эшелон 2.',
    ...buildDetectionPlanningConstraintsBullets(),
    `- Файл: \`${outputRel}\` (канонический фокус дня).`,
  ].join('\n');
}

/**
 * @param {{ dryRun: boolean, full: boolean, issueLimit: number, focusOverride: string, outputPath: string, commandName: string, warnMissingStandup: boolean }} options
 */
export async function runMainDayIssue(options) {
  loadDotEnv();

  try {
    guardDailyCodeReviewInput();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = err && typeof err === 'object' && 'exitCode' in err ? Number(err.exitCode) || 2 : 2;
    return;
  }

  const registry = loadRegistry();
  const active = listActive(registry);
  const pendingClose = listPendingGithubClose(registry);

  if (options.focusOverride) {
    const v = validateFocusId(options.focusOverride, active);
    if (!v.ok) {
      console.error(v.message);
      console.error('Активные id:', active.map((t) => t.id).join(', ') || '(нет)');
      process.exitCode = 1;
      return;
    }
  }

  const { blocks: docBlocks, missingRequired } = collectDocBlocks();
  if (options.warnMissingStandup && missingRequired.length > 0) {
    console.error('Предупреждение: отсутствуют обязательные входы:', missingRequired.join(', '));
    console.error(
      'Рекомендуемый порядок: yarn plan:day && yarn standup && yarn main-day-issue (code-review — вечером)',
    );
  }

  const virtualTeamPath = resolve(process.cwd(), 'docs/VIRTUAL_TEAM_PROMPT.md');
  if (!existsSync(virtualTeamPath)) {
    console.error('Не найден docs/VIRTUAL_TEAM_PROMPT.md');
    process.exitCode = 1;
    return;
  }
  const virtualTeamPrompt = readFileSync(virtualTeamPath, 'utf8');

  const issues = await collectOpenIssues({ limit: options.issueLimit });
  const status = collectStatusSnapshot();
  const registryBlock = formatRegistryBlock(active, { pendingGithubClose: pendingClose });
  const promptExcerpts = collectActivePromptExcerpts(active, { full: options.full });
  const outputRel = relative(process.cwd(), options.outputPath).replace(/\\/g, '/');

  let ragBlock = '';
  if (!options.noRag) {
    const rag = await retrieveRagContext(MAIN_DAY_RAG_QUERY, { topK: 5 });
    ragBlock = formatRagContextBlock(rag, { title: 'RAG operative (main-day-issue)' });
    logRagStatus(rag, 'main-day-issue');
  }

  const sections = [
    'Ты — Teamlead (Vesnin) виртуальной команды Membrana.',
    'На основе стендапа, ревью, плана и реестра задач зафиксируй **один** обязательный фокус дня в MAIN_DAY_ISSUE.',
    '**МАГИСТРАЛЬ БЕРЁТСЯ ИЗ ВОЛЕИЗЪЯВЛЕНИЯ ВЛАДЕЛЬЦА, НЕ СИНТЕЗИРУЕТСЯ.** Если `docs/tasks/main-day-assertions.json` содержит `sources[]` — магистраль дня есть `sources[0].claim` (это прямой выбор/слово владельца с указателем). Синтезировать свою магистраль из входов ЗАПРЕЩЕНО, пока owner-source задан: это ровно ошибка, против которой построен probe (16.07 план назначил фантом; 18.07 генератор чуть не выбрал #598/#599 вопреки владельческому «подключить генератор»). Входы (стендап/ревью/горизонт/граф) — КОНТЕКСТ для раскрытия магистрали, а не источник её выбора. Только если `sources` пуст — синтезируй и пометь honestly «магистраль не задана владельцем».',
  '',
    '---',
    '## Промпт виртуальной команды (полный)',
    '',
    virtualTeamPrompt,
    '',
    '---',
    '## Входные документы',
    '',
    docBlocks,
    '',
    ...(ragBlock
      ? ['---', '## RAG operative context', '', ragBlock, '']
      : []),
    '---',
    '## Реестр task-промптов',
    '',
    registryBlock,
    '',
    '---',
    '## Выдержки из активных task-промптов',
    '',
    promptExcerpts,
    '',
    '---',
    `## Открытые GitHub Issues (источник: ${issues.source ?? 'нет'})`,
    '',
    issues.text,
    '',
    '---',
    '## Состояние репозитория',
    '',
    status,
    '',
    '---',
  ];

  // Задание собирается ОТДЕЛЬНО и защищено от обрезки: режется контекст, не скелет
  // слотов (инцидент 21.07 — задание в хвосте выпало из 95К, гейт M2 валил все 5
  // слотов; тот же баг стендапа 16.07 закрыт assembleStandupPrompt со строгим тестом).
  const generationPrompt = buildGenerationPrompt({
    outputRel,
    focusOverride: options.focusOverride,
    activeCount: active.length,
    issueCount: issues.count,
  });
  const bodyText = assembleStandupPrompt({
    context: sections.join('\n'),
    assignment: generationPrompt,
    maxChars: MAX_CONTEXT_CHARS,
  });

  if (options.dryRun) {
    console.log(bodyText);
    console.error(
      `\n[dry-run] ${bodyText.length} символов; active tasks: ${active.length}; issues: ${issues.count}.`,
    );
    return;
  }

  let key;
  try {
    key = getAnthropicKey();
  } catch (e) {
    console.error(e.message);
    console.error('См. .env.example. Без API: yarn main-day-issue:dry');
    process.exitCode = 1;
    return;
  }

  const model = defaultModel();
  const bodyJson = {
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: [{ type: 'text', text: bodyText }] }],
  };

  let exitCode = 0;
  try {
    const { ok, status: httpStatus, text } = await anthropicPost(
      'https://api.anthropic.com/v1/messages',
      {
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        bodyJson,
      },
    );

    if (!ok) {
      printAnthropicHttpError(httpStatus, text);
      exitCode = 1;
    } else {
      let out = '';
      try {
        const json = JSON.parse(text);
        out = (json?.content ?? [])
          .filter((b) => b?.type === 'text')
          .map((b) => b.text)
          .join('\n');
        if (!out) out = JSON.stringify(json?.content ?? [], null, 2);
      } catch {
        out = text;
      }
      // Гейт скелета (K, M2): все 5 заголовков слотов на месте, иначе ГРОМКИЙ отказ —
      // структура детерминирована, LLM не вправе её ронять. Файл при провале не пишем.
      const missingSlots = missingSlotHeadings(out);
      if (missingSlots.length > 0) {
        console.error(
          `✖ гейт скелета (M2): LLM уронил слот(ы): ${missingSlots.join(', ')} — файл НЕ записан. Перезапусти генерацию.`,
        );
        exitCode = 22;
      } else {
        writeMainDayIssueFile({
          outputPath: options.outputPath,
          commandName: options.commandName,
          body: out,
          meta: {
            primaryFocusOverride: options.focusOverride || null,
            activeTasks: active.map((t) => t.id),
            issues: issues.count,
          },
        });
        console.log(out);
        console.error('Записано:', options.outputPath);
      }
    }
  } catch (e) {
    console.error(e);
    exitCode = 1;
  }

  process.exitCode = exitCode;
}

function writeMainDayIssueFile({ outputPath, commandName, body, meta }) {
  const stamp = new Date().toISOString();
  const io = gitFsIo(process.cwd(), { execFileSync, readFileSync, existsSync, join });
  const readAt = {
    STRATEGY_DAY: readEntry(io, 'docs/STRATEGY_DAY.md'),
    DAILY_STANDUP: readEntry(io, 'docs/DAILY_STANDUP.md'),
  };
  const header =
    `<!-- Сгенерировано: ${stamp} (${commandName}@${headRevision()}) -->\n` +
    `<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->\n` +
    `<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->\n` +
    `${provenanceHeader({ author: 'vesnin', readAt })}\n` +
    `<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->\n` +
    (meta.primaryFocusOverride
      ? `<!-- focus override: ${meta.primaryFocusOverride} -->\n`
      : '') +
    `<!-- active в реестре: ${meta.activeTasks.join(', ') || '—'} -->\n\n`;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, header + body, 'utf8');
}

export function parseMainDayIssueArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: node scripts/main-day-issue.mjs [options]

  Синтез центральной задачи дня → docs/MAIN_DAY_ISSUE.md.
  Запускать ПОСЛЕ: yarn plan:day && yarn standup (code-review — вечером, см. DEVELOPER_RHYTHM.md)

  --full          Больше текста из task-промптов.
  --dry-run       Контекст в stdout, без API.
  --no-rag        Не подмешивать operative RAG.
  --focus=<id>    Зафиксировать primary focus (id из реестра).
  --issues=<N>    Лимит GitHub Issues (по умолчанию 20).
  --allow-missing-standup  Не предупреждать, если нет DAILY_STANDUP.md
  --help          Справка.

  Требуется ANTHROPIC_API_KEY (кроме --dry-run).

  См. docs/CURRENT_TASK.md — вспомогательный буфер (может содержать шум).`);
    process.exit(0);
  }

  const full = argv.includes('--full');
  const dryRun = argv.includes('--dry-run');
  const noRag = argv.includes('--no-rag');
  const warnMissingStandup = !argv.includes('--allow-missing-standup');
  let issueLimit = full ? 35 : 20;
  let focusOverride = '';

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--issues=')) {
      const n = Number(a.slice('--issues='.length));
      if (Number.isFinite(n) && n > 0) issueLimit = Math.min(100, Math.floor(n));
      continue;
    }
    if (a.startsWith('--focus=')) {
      focusOverride = a.slice('--focus='.length).trim();
      continue;
    }
    if (a === '--focus') {
      focusOverride = (argv[++i] ?? '').trim();
    }
  }

  return { full, dryRun, issueLimit, focusOverride, warnMissingStandup, noRag };
}
