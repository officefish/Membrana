/**
 * scripts/consilium.mjs
 *
 * Консилиум виртуальной команды: один вызов Messages API, протокол в docs/seanses/.
 *
 * yarn consilium "нужен ли отдельный пакет брендбука?"
 * yarn consilium --save-as brandbook "…"
 * yarn consilium --gh-issue 12 "уточнить границы"
 * yarn consilium --topic-file ./agenda.md "…"
 * yarn consilium --seed 42 --dry-run "…"
 * yarn consilium --no-save "…"
 *
 * Требуется ANTHROPIC_API_KEY в .env. Промпт: docs/prompts/CONSILIUM_PROMPT.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';
import {
  CONSILIUM_PROMPT_FILE,
  CONSILIUM_ROLES,
  estimateMemoryTokens,
  formatRoleOrderLine,
  MEMORY_TOKENS_GUARD,
  resolveSeansePath,
  resolveWithMemory,
  shuffleRoles,
} from './lib/consilium-paths.mjs';
import {
  formatRagContextBlock,
  logRagStatus,
  retrieveRagContext,
} from './lib/rag-ritual.mjs';
import {
  CONSILIUM_ROLE_KEY_TO_SLUG,
  personaMemoryPath,
  readPersonaMemory,
} from './lib/persona-memory.mjs';
import {
  extractAgendaIds,
  findUncoveredAgendaItems,
  hasVerdictSection,
  validateProtocol,
  meetingAgendaProblem,
  reconcileReplyCount,
} from './lib/protocol-validator.mjs';

const MAX_PROMPT_SPEC_CHARS = 12_000;
const MAX_VIRTUAL_TEAM_CHARS = 8_000;
const MAX_PERSONA_CHARS = 4_000;
const MAX_CONTEXT_CHARS = 6_000;
const MAX_TOPIC_CHARS = 12_000;
const MAX_TICKET_CHARS = 20_000;
const MAX_ASSEMBLED_CHARS = 95_000;
const MIN_REPLIES_DEFAULT = 20;
const MAX_MEMORY_CHARS_PER_ROLE = 6_000; // 5 ролей в одном промпте — держим компактно

const PERSONA_FILES = {
  teamlead: 'docs/virtual-team/PROMPT_TEAMLEAD.md',
  structurer: 'docs/virtual-team/PROMPT_STRUCTURER.md',
  mathematician: 'docs/virtual-team/PROMPT_MATHEMATICIAN.md',
  musician: 'docs/virtual-team/PROMPT_MUSICIAN.md',
  layout: 'docs/virtual-team/PROMPT_LAYOUT_DEVELOPER.md',
};

const CONTEXT_FILES = [
  { path: 'docs/ARCHITECTURE.md', title: 'Архитектура' },
  { path: 'docs/DESIGN.md', title: 'Дизайн' },
  { path: 'docs/SERVICES.md', title: 'Сервисы' },
];

function printHelp() {
  console.log(`Usage: yarn consilium [options] "<question>"

Консилиум пяти ролей виртуальной команды. Протокол → docs/seanses/<slug>-<date>.md
Промпт-спека: ${CONSILIUM_PROMPT_FILE}

Options:
  --save-as <slug>       Базовое имя файла (без даты).
  --gh-issue <N>         Контекст из GitHub Issue #N (gh CLI).
  --topic-file <path>    Доп. повестка / материалы из markdown.
  --min-replies <N>      Минимум реплик (по умолчанию ${MIN_REPLIES_DEFAULT}).
  --seed <N>             Воспроизводимый порядок ролей.
  --no-context           Не подгружать ARCHITECTURE / DESIGN / SERVICES.
  --no-rag               Не подмешивать RAG archive (по умолчанию useLongTerm).
  --with-memory          Журналы субъектного опыта персон (docs/virtual-team/
                         memory/*.md) — в консилиуме ВКЛЮЧЕНЫ ПО УМОЛЧАНИЮ
                         (#451, фаза 1.5); флаг сохранён для совместимости.
  --no-memory            Выключить журналы для этого запуска.
                         Эквивалент: PERSONA_MEMORY_INJECT=0.
  --secretary-file <md>  Оффлайн-канал (#469 ti-2): протокол написан в IDE-чате,
                         API не вызывается. Валидирует канон (реплики/роли/итог),
                         оборачивает метаданными (канал secretary), кладёт в seanses.
  --no-save              Только stdout.
  --dry-run              Собрать промпт, не вызывать API.
  --help, -h             Справка.

Среда: ANTHROPIC_API_KEY, опционально ANTHROPIC_MODEL.
`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const rest = [];
  let saveAs = '';
  let ghIssue = '';
  let topicFile = '';
  let meeting = '';
  let seed;
  let minReplies = MIN_REPLIES_DEFAULT;
  let noContext = false;
  let noRag = false;
  let noSave = false;
  let dryRun = false;
  let secretaryFile = '';
  // #451 (фаза 1.5): в КОНСИЛИУМЕ память персон включена по умолчанию —
  // решение владельца 2026-07-14 по итогам пилота; в `yarn ask` остаётся opt-in.
  let withMemory = resolveWithMemory(argv, process.env);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--with-memory' || arg === '--no-memory') { continue; }
    if (arg === '--save-as') { saveAs = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--save-as=')) { saveAs = arg.slice('--save-as='.length); continue; }
    if (arg === '--gh-issue') { ghIssue = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--gh-issue=')) { ghIssue = arg.slice('--gh-issue='.length); continue; }
    if (arg === '--topic-file') { topicFile = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--topic-file=')) { topicFile = arg.slice('--topic-file='.length); continue; }
    // ЗАСЕДАНИЕ (docs/MEETING_REGULATION.md): включает S-M1 — ровно один вопрос.
    // Обычный консилиум вправе быть многовопросным, поэтому правило под флагом.
    if (arg === '--meeting') { meeting = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--meeting=')) { meeting = arg.slice('--meeting='.length); continue; }
    if (arg === '--seed') { seed = Number(argv[++i]); continue; }
    if (arg.startsWith('--seed=')) { seed = Number(arg.slice('--seed='.length)); continue; }
    if (arg === '--min-replies') { minReplies = Number(argv[++i]); continue; }
    if (arg.startsWith('--min-replies=')) { minReplies = Number(arg.slice('--min-replies='.length)); continue; }
    if (arg === '--no-context') { noContext = true; continue; }
    if (arg === '--no-rag') { noRag = true; continue; }
    if (arg === '--no-save') { noSave = true; continue; }
    if (arg === '--dry-run') { dryRun = true; continue; }
    if (arg === '--secretary-file') { secretaryFile = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--secretary-file=')) { secretaryFile = arg.slice('--secretary-file='.length); continue; }
    rest.push(arg);
  }

  const question = rest.join(' ').trim();
  if (!question && !secretaryFile) {
    console.error('Не задан вопрос. Пример: yarn consilium "нужен ли пакет X?"');
    process.exit(1);
  }
  if (!Number.isFinite(minReplies) || minReplies < 5) {
    console.error('--min-replies должно быть числом ≥ 5.');
    process.exit(1);
  }
  if (seed !== undefined && !Number.isFinite(seed)) {
    console.error('--seed должно быть числом.');
    process.exit(1);
  }

  return { question, saveAs, ghIssue, topicFile, meeting, seed, minReplies, noContext, noRag, noSave, dryRun, withMemory, secretaryFile };
}

function readBounded(absPath, maxChars, optional = false) {
  if (!existsSync(absPath)) {
    if (optional) return null;
    console.error(`Файл не найден: ${absPath}`);
    process.exit(1);
  }
  let text = readFileSync(absPath, 'utf8');
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + `\n\n[… обрезано до ${maxChars} символов …]\n`;
  }
  return text;
}

function detectRepoSlug() {
  const res = spawnSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const url = (res.stdout || '').trim();
  let m = url.match(/git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (!m) m = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

function fetchGhIssue(num) {
  const slug = detectRepoSlug();
  if (!slug) {
    console.error('Не удалось определить slug репо. Запусти из корня Membrana.');
    process.exit(1);
  }
  const res = spawnSync(
    'gh',
    ['issue', 'view', String(num), '--repo', slug,
      '--json', 'number,title,body,url,labels,state'],
    { encoding: 'utf8' },
  );
  if (res.status !== 0) {
    console.error(`GitHub Issue #${num}:`, res.stderr || '');
    process.exit(1);
  }
  return JSON.parse(res.stdout);
}

function formatGhIssue(issue) {
  const lines = [
    `# GitHub Issue #${issue.number}: ${issue.title}`,
    `URL: ${issue.url}`,
    `State: ${issue.state}`,
    '',
    (issue.body || '').trim() || '(пусто)',
  ];
  let text = lines.join('\n');
  if (text.length > MAX_TICKET_CHARS) {
    text = text.slice(0, MAX_TICKET_CHARS) + `\n\n[… обрезано …]\n`;
  }
  return text;
}

function buildPrompt({ question, topicFile, ghIssueData, noContext, orderedRoles, minReplies, ragBlock, withMemory = false }) {
  const cwd = process.cwd();
  const parts = [];

  const spec = readBounded(resolve(cwd, CONSILIUM_PROMPT_FILE), MAX_PROMPT_SPEC_CHARS);
  const virtualTeam = readBounded(resolve(cwd, 'docs/VIRTUAL_TEAM_PROMPT.md'), MAX_VIRTUAL_TEAM_CHARS, true);

  parts.push(
    '## Инструкция консилиума (docs/prompts/CONSILIUM_PROMPT.md)',
    '',
    spec,
    '',
  );

  if (virtualTeam) {
    parts.push('---', '## Координация ролей (выдержка VIRTUAL_TEAM_PROMPT.md)', '', virtualTeam, '');
  }

  parts.push(
    '---',
    '## Порядок ролей на этот сеанс',
    '',
    `Чередуй реплики в этом порядке (циклически, ≥${minReplies} реплик всего):`,
    '',
    formatRoleOrderLine(orderedRoles),
    '',
    'Метки в протоколе:',
    orderedRoles.map((r) => `${r.tag} — ${r.label}`).join('\n'),
    '',
  );

  parts.push('---', '## Системные промпты ролей (сжато)', '');
  for (const role of CONSILIUM_ROLES) {
    const file = PERSONA_FILES[role.key];
    const text = readBounded(resolve(cwd, file), MAX_PERSONA_CHARS, true);
    if (text) {
      parts.push(`### ${role.label} (${file})`, '', text, '');
    }
  }

  if (withMemory) {
    const memoryParts = [];
    let memoryChars = 0;
    let memoryCount = 0;
    for (const role of CONSILIUM_ROLES) {
      const slug = CONSILIUM_ROLE_KEY_TO_SLUG[role.key];
      const memory = slug ? readPersonaMemory(slug, { cwd, maxChars: MAX_MEMORY_CHARS_PER_ROLE }) : null;
      if (memory) {
        memoryParts.push(`### ${role.label} (${personaMemoryPath(slug)})`, '', memory, '');
        memoryChars += memory.length;
        memoryCount += 1;
      }
    }
    // #451: видимость инъекции + гард суммарного бюджета (25K токенов).
    const memoryTokens = estimateMemoryTokens(memoryChars);
    console.error(
      `[consilium] память персон: ${memoryCount} журналов, ~${memoryTokens} токенов` +
        (memoryTokens > MEMORY_TOKENS_GUARD ? ` — ПРЕВЫШЕН гард ${MEMORY_TOKENS_GUARD}` : ''),
    );
    if (memoryParts.length) {
      parts.push(
        '---',
        '## Журналы субъектного опыта персон',
        '',
        'Прошлые позиции/голоса каждой роли с provenance. Роль опирается на СВОЙ журнал,',
        'ссылается на решённое («мы это решили в …») и явно объявляет смену позиции.',
        '',
        ...memoryParts,
      );
    }
  }

  if (!noContext) {
    parts.push('---', '## Контекст репозитория', '');
    for (const { path, title } of CONTEXT_FILES) {
      const text = readBounded(resolve(cwd, path), MAX_CONTEXT_CHARS, true);
      if (text) parts.push(`### ${title} (${path})`, '', text, '');
    }
  }

  if (ragBlock) {
    parts.push('---', '## RAG archive context (useLongTerm)', '', ragBlock, '');
  }

  if (ghIssueData) {
    parts.push('---', '## GitHub Issue', '', formatGhIssue(ghIssueData), '');
  }

  if (topicFile) {
    const text = readBounded(resolve(cwd, topicFile), MAX_TOPIC_CHARS);
    parts.push('---', `## Повестка (${topicFile})`, '', text, '');
  }

  parts.push(
    '---',
    '## Вопрос на консилиум',
    '',
    question,
    '',
    '---',
    'Сгенерируй полный протокол по формату из инструкции. Только протокол, без преамбулы «как модель я…».',
  );

  let assembled = parts.join('\n');
  if (assembled.length > MAX_ASSEMBLED_CHARS) {
    assembled =
      assembled.slice(0, MAX_ASSEMBLED_CHARS) +
      `\n\n[… общий промпт обрезан до ${MAX_ASSEMBLED_CHARS} символов …]\n`;
  }
  return assembled;
}

function wrapSeanseFile({ body, question, orderedRoles, model, ghIssue, topicFile, relPath }) {
  const stamp = new Date().toISOString();
  const meta = [
    '# Метаданные сеанса',
    '',
    '| Поле | Значение |',
    '|------|----------|',
    `| Дата (UTC) | ${stamp} |`,
    `| Команда | \`yarn consilium\` |`,
    `| Модель | ${model} |`,
    `| Файл | \`${relPath}\` |`,
    `| Порядок ролей | ${formatRoleOrderLine(orderedRoles)} |`,
  ];
  if (ghIssue) meta.push(`| GitHub Issue | #${ghIssue} |`);
  if (topicFile) meta.push(`| Повестка | \`${topicFile}\` |`);
  meta.push(
    '',
    '**Вопрос:**',
    '',
    question,
    '',
    '---',
    '',
    body.trim(),
    '',
  );
  return meta.join('\n');
}

/**
 * Оффлайн-канал протокола (#469 ti-2): валидировать канон готового md,
 * обернуть метаданными (канал secretary), сохранить в seanses. Без API.
 */
function runSecretaryFile(cli, cwd) {
  const srcAbs = resolve(cwd, cli.secretaryFile);
  if (!existsSync(srcAbs)) {
    console.error(`Файл не найден: ${cli.secretaryFile}`);
    process.exit(1);
  }
  const body = readFileSync(srcAbs, 'utf8');
  const agendaMd = cli.topicFile ? readBounded(resolve(cwd, cli.topicFile), MAX_TOPIC_CHARS, true) : null;
  const { ok, problems, stats } = validateProtocol(body, {
    kind: 'consilium',
    minReplies: cli.minReplies,
    agenda: agendaMd || null,
  });
  if (!ok) {
    console.error(`Протокол не прошёл канон консилиума (${problems.length}):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.error(`→ канон OK: реплик ${stats.total}, все ${Object.keys(stats.counts).length} ролей высказались`);

  if (!cli.saveAs) {
    console.error('--secretary-file требует --save-as <slug> (имя протокола в seanses).');
    process.exit(1);
  }
  const relPath = resolveSeansePath({ cwd, saveAs: cli.saveAs, question: cli.saveAs });
  const absPath = resolve(cwd, relPath);
  const header = [
    '<!-- канал: secretary (offline, #469 ti-2) — протокол написан в IDE-чате, LLM не вызывался -->',
    `<!-- валидация канона: реплик ${stats.total}, роли ${Object.entries(stats.counts).map(([r, n]) => `${r}:${n}`).join(' ')} -->`,
    '',
  ].join('\n');
  mkdirSync(resolve(cwd, 'docs/seanses'), { recursive: true });
  const secReconciled = reconcileReplyCount(body);
  if (secReconciled.corrected) {
    console.error(`→ футер реплик исправлен: «${secReconciled.stated}» → факт ${secReconciled.total}`);
  }
  writeFileSync(absPath, header + secReconciled.md.trim() + '\n', 'utf8');
  console.log(`→ протокол (secretary): ${relPath}`);
}

async function main() {
  loadDotEnv();
  const cli = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();

  // #469 ti-2: оффлайн-канал — протокол написан в IDE-чате (LLM недоступен).
  if (cli.secretaryFile) {
    runSecretaryFile(cli, cwd);
    return;
  }

  // TF-5 (#554): предупредить ДО траты рана, если повестка без ID-меток — гейт
  // полноты (rt-6) на такой повестке молчит, то есть декоративен. Две повестки
  // 16.07 были прозаичными, и оба консилиума молча уронили по вопросу.
  if (cli.topicFile) {
    try {
      const agendaIds = extractAgendaIds(readBounded(resolve(cwd, cli.topicFile), MAX_TOPIC_CHARS, true));
      if (agendaIds.length === 0) {
        console.error(
          '\n⚠ Повестка без ID-меток вопросов (rt-6 гейт полноты не сработает).\n' +
            '  Помечай вопросы жирным ID: **A1 — …**, **B2 — …**, **Q3 — …**\n' +
            '  Иначе пропуск вопроса останется незамеченным — паттерн 16.07 (3 консилиума подряд).\n',
        );
      } else {
        console.error(`→ повестка: ${agendaIds.length} вопрос(ов) под гейтом rt-6 (${agendaIds.join(', ')})`);
      }

    } catch {
      // Повестка нечитаема — не мешаем прогону, это забота readBounded ниже.
    }
  }

  // S-M1 (docs/MEETING_REGULATION.md): в заседании повестка несёт ровно один вопрос —
  // иначе ОТКАЗ до прогона. Счётчик выше существовал и раньше: 17.07 он честно напечатал
  // «10 вопросов» и пропустил прогон, который уронил центральный. Информация была на
  // экране, останавливать её было нечему — здесь у неё зубы.
  //
  // НАМЕРЕННО вне try/catch выше: гейт, который глушится catch'ем, — это `|| true`,
  // то есть отсутствие гейта. Нечитаемая повестка при --meeting обязана ронять прогон,
  // а не пропускать его молча.
  if (cli.meeting) {
    const problem = cli.topicFile
      ? meetingAgendaProblem(readBounded(resolve(cwd, cli.topicFile), MAX_TOPIC_CHARS, true))
      : 'заседание без --topic-file: нечего проверять на один вопрос';
    if (problem) {
      console.error(
        `\n✗ S-M1 — заседание «${cli.meeting}»: ${problem}.\n` +
          '  Один вопрос — одно заседание: тогда «уронили молча» не существует,\n' +
          '  вердикт либо есть, либо заседания не было (S-M2).\n' +
          '  Разбей повестку и созывай по одному в порядке из M0.\n' +
          '  Регламент: docs/MEETING_REGULATION.md\n',
      );
      process.exit(2);
    }
  }

  const orderedRoles = shuffleRoles(CONSILIUM_ROLES, cli.seed);
  if (process.stderr.isTTY) {
    console.error(`→ порядок ролей: ${formatRoleOrderLine(orderedRoles)}`);
  }

  let ghIssueData = null;
  if (cli.ghIssue) {
    if (process.stderr.isTTY) console.error(`→ GitHub Issue #${cli.ghIssue}…`);
    ghIssueData = fetchGhIssue(cli.ghIssue);
  }

  let ragBlock = '';
  if (!cli.noRag) {
    const rag = await retrieveRagContext(cli.question, { useLongTerm: true, topK: 8 });
    ragBlock = formatRagContextBlock(rag, {
      title: 'RAG archive (consilium)',
      maxChars: 12_000,
    });
    logRagStatus(rag, 'consilium');
  }

  const promptText = buildPrompt({
    ...cli,
    ghIssueData,
    orderedRoles,
    ragBlock,
  });

  const relPath = resolveSeansePath({
    cwd,
    saveAs: cli.saveAs,
    question: cli.question,
  });
  const absPath = resolve(cwd, relPath);
  const model = defaultModel();

  if (cli.dryRun) {
    console.error(`→ промпт: ${promptText.length} символов`);
    console.error(`→ сохранение: ${cli.noSave ? '(отключено)' : relPath}`);
    console.error(`→ модель: ${model}`);
    process.exit(0);
  }

  let key;
  try {
    key = getAnthropicKey();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  if (process.stderr.isTTY) {
    console.error(`→ консилиум · model: ${model}`);
  }

  const bodyJson = {
    model,
    max_tokens: 16_384,
    messages: [{ role: 'user', content: [{ type: 'text', text: promptText }] }],
  };

  let answer = '';
  try {
    const { ok, status, text } = await anthropicPost(
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
      printAnthropicHttpError(status, text);
      // exitCode + return, а не process.exit(): сокеты HTTP-вызова ещё живы, и обрыв
      // процесса роняет libuv на Windows ассертом UV_HANDLE_CLOSING → 127 вместо 1
      // (тот же класс, что чинился в code-review.mjs). Это штатный путь «нет кредита».
      process.exitCode = 1;
      return;
    }
    const json = JSON.parse(text);
    const parts = json?.content ?? [];
    answer = parts.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
    if (!answer) answer = JSON.stringify(parts, null, 2);
  } catch (e) {
    console.error(e);
    // См. коммент выше: сокеты живы → exitCode + return вместо обрыва процесса.
    process.exitCode = 1;
    return;
  }

  // Сверить прозаический футер «Реплик в диалоге: N» с фактом (модель порой врёт;
  // 17.07 M0: 21 против фактических 20). Приводим к детерминированному числу.
  const reconciled = reconcileReplyCount(answer);
  if (reconciled.corrected) {
    console.error(`→ футер реплик исправлен: модель «${reconciled.stated}» → факт ${reconciled.total}`);
  }
  answer = reconciled.md;

  console.log(answer);

  if (!cli.noSave) {
    mkdirSync(resolve(cwd, 'docs/seanses'), { recursive: true });
    const fileBody = wrapSeanseFile({
      body: answer,
      question: cli.question,
      orderedRoles,
      model,
      ghIssue: cli.ghIssue,
      topicFile: cli.topicFile,
      relPath,
    });
    writeFileSync(absPath, fileBody, 'utf8');
    console.error(`→ протокол: ${relPath}`);

    // rt-6 (#539/#558): гейт полноты повестки. ЧЕСТНАЯ ОГОВОРКА: rt-6 грепает
    // ID-МЕТКУ в теле, а НЕ вердикт — он не отличает «вопрос уронен» от «отвечен под
    // другим заголовком без метки» (17.07: консилиум ВИЗОР дал итоговую таблицу без
    // меток V1..V4 → rt-6 соврал «не покрыта»). Поэтому сообщение разводит два
    // случая через наличие секции вердикта и не заявляет «уронено» как факт.
    if (cli.topicFile) {
      try {
        const agenda = readFileSync(resolve(cwd, cli.topicFile), 'utf8');
        const uncovered = findUncoveredAgendaItems(agenda, answer);
        if (uncovered.length > 0) {
          const verdictPresent = hasVerdictSection(answer);
          console.error(
            `\n⚠ rt-6: ID-метки не найдены в теле: ${uncovered.join(', ')}.\n` +
              '  rt-6 грепает МЕТКУ, не вердикт (#558) — это не значит «уронено».\n' +
              (verdictPresent
                ? '  Секция вердикта ЕСТЬ → вероятно, отвечены под другим заголовком без метки. Сверь глазами.\n'
                : '  Секции вердикта НЕТ → вопросы могли быть уронены (паттерн 16.07). Допроси команду.\n') +
              '  Либо проставь метки в теле, либо зафиксируй «не готово к решению».',
          );
        } else {
          console.error('→ rt-6: все ID-метки повестки присутствуют в теле.');
        }
      } catch {
        // Повестка без ID-меток или нечитаема — гейт не мешает, просто молчит.
      }
    }
  }

}

main();
