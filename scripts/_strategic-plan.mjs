/**
 * Общий движок стратегического планирования.
 *
 * Принимает период (since/until), горизонт плана («следующий день» / «следующая неделя»),
 * путь к выходному файлу и метку команды. На вход Claude подаёт:
 *   1) docs/WHITE_PAPER.md — стратегическая цель проекта;
 *   2) выдержки из docs/ARCHITECTURE.md и docs/SERVICES.md — границы пакетов;
 *   3) git log за период (subjects + file name-status, при --full добавляется --shortstat);
 *   4) короткий снимок состояния репозитория (ветка, статус, верхний уровень дерева).
 *
 * Результат: один markdown-документ, перезаписывает выходной файл.
 *
 * Используется тонкими обёртками `strategic-plan-day.mjs` и `strategic-plan-week.mjs`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';

const MAX_BUFFER = 12 * 1024 * 1024;

/** Верхняя граница символов контекста перед запросом к API. */
const MAX_CONTEXT_CHARS = 90_000;

/** Сколько символов WHITE_PAPER.md максимум подаём в промпт. */
const MAX_WHITE_PAPER_CHARS = 30_000;

/** Из ARCHITECTURE/SERVICES берём только верхушку — этого достаточно для соответствия слоям. */
const MAX_ARCH_CHARS = 6_000;

/**
 * WEEKLY_ANALYZERS_RESEARCH.md — еженедельный «радар» новых внешних аналайзеров
 * (HF Hub + arXiv). Подключается ТОЛЬКО к недельному плану, не к дневному.
 * Берём верхушку: сводка + таблица новых кандидатов + предлагаемые правки §4.
 */
const MAX_ANALYZERS_RESEARCH_CHARS = 12_000;

function captureError(e) {
  const err = e.stderr?.toString?.() ?? '';
  const out = e.stdout?.toString?.() ?? '';
  return (err || out || e.message || '').trim() || '(команда завершилась с ошибкой)';
}

function runGit(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      cwd: process.cwd(),
      maxBuffer: MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trimEnd();
  } catch (e) {
    return captureError(e);
  }
}

function readBoundedFile(absPath, maxChars) {
  if (!existsSync(absPath)) return null;
  let text = readFileSync(absPath, 'utf8');
  if (text.length > maxChars) {
    text =
      text.slice(0, maxChars) +
      `\n\n[… документ обрезан до ${maxChars} символов для запроса …]\n`;
  }
  return text;
}

/**
 * git log за интервал. Формат — один блок на коммит:
 *   ----- COMMIT <hash> | <iso date> | <author> | <subject>
 *   <body, если есть>
 *   M\tpath/to/file
 *   A\tpath/to/other
 */
function collectCommitLog({ since, until, full }) {
  const fmt = '----- COMMIT %h | %ad | %an | %s%n%b';
  const args = [
    'log',
    `--since=${since}`,
    '--no-merges',
    '--date=iso',
    '--name-status',
  ];
  if (until) args.splice(2, 0, `--until=${until}`);
  if (full) args.push('--shortstat');
  args.push(`--pretty=format:${fmt}`);

  const out = runGit(args);
  return out && out.trim() ? out : '(коммитов за период не найдено)';
}

function collectStatusSnapshot() {
  const branch = runGit(['branch', '--show-current']) || 'detached';
  const last = runGit(['log', '-1', '--format=%h - %s (%an, %ar)']) || 'no commits';
  const status = runGit(['status', '--short']) || '(чистое рабочее дерево)';
  const tracked = runGit(['ls-files']);
  const trackedCount = tracked ? tracked.split(/\r?\n/).filter(Boolean).length : 0;
  return [
    `Branch: ${branch}`,
    `Last commit: ${last}`,
    `Tracked files: ${trackedCount}`,
    '--- working tree status ---',
    status,
  ].join('\n');
}

function buildSystemHeader({ horizonLabel, rangeLabel }) {
  return (
    `Ты — стратегический планировщик проекта Membrana. Тебе даны:\n` +
    `  1) WHITE_PAPER.md — конечная цель проекта.\n` +
    `  2) Выдержки из ARCHITECTURE.md и SERVICES.md — обязательные границы пакетов.\n` +
    `  3) История git за период «${rangeLabel}».\n` +
    `  4) Краткий снимок состояния репозитория.\n\n` +
    `Твоя задача: дать ОДИН markdown-документ — «План на ${horizonLabel}», ` +
    `привязанный к стратегической цели из WHITE_PAPER. Не выдумывай факты ` +
    `вне предоставленного контекста. Если по коммитам нет ясной картины — ` +
    `так и напиши и предложи разведывательные шаги.`
  );
}

function buildTaskBody({ horizonLabel, rangeLabel, outputFileName }) {
  return [
    `# Задание`,
    ``,
    `Сформируй markdown-документ «План на ${horizonLabel}» со следующей структурой ` +
      `(используй именно эти заголовки уровня ## и ###, без отклонений):`,
    ``,
    `## 1. Что сделано за период (${rangeLabel})`,
    `- 3–8 пунктов по коммитам: что фактически изменилось в коде, документации, CI.`,
    `- Группируй по пакетам монорепо (\`@membrana/core\`, \`agenda\`, \`device-board\`, \`packages/services/*\`, \`apps/client\`, корневая инфра).`,
    `- Если коммитов нет — честно отметь это и переходи к разделу 2.`,
    ``,
    `## 2. Привязка к стратегической цели`,
    `- На каком этапе дорожной карты из WHITE_PAPER (см. раздел «Дорожная карта») мы сейчас.`,
    `- Что из сделанного приближает к этапу, что — нейтрально, что — отвлекает.`,
    `- Назови недостающие сервисы (например \`drone-detector-service\`, \`tdoa-service\`, \`localizer-service\`, \`tracker-service\`, \`transport-service\`), если по коммитам видно, что их пора начинать.`,
    ``,
    `## 3. Риски и долг`,
    `- Технические риски, накопленный долг, нарушения границ пакетов (если видны по diff-у).`,
    `- Известные ограничения из WHITE_PAPER, релевантные текущему состоянию (синхронизация, многолучёвость и т.п.).`,
    ``,
    `## 4. План на ${horizonLabel}`,
    `Список конкретных задач. Для КАЖДОЙ задачи укажи:`,
    `- **Цель** — одна фраза, что должно появиться.`,
    `- **Пакет / слой** — куда ложится по \`SERVICES.md\` (foundation / analyzer / agenda / device-board / client / infra).`,
    `- **Связь с WHITE_PAPER** — на какой этап / принцип ссылается.`,
    `- **Definition of Done** — 2–4 проверяемых пункта.`,
    `- **Роль виртуальной команды** (Teamlead / Структурщик / Математик / Музыкант / Верстальщик), которая ведёт задачу.`,
    `- **Размер** — S / M / L (по техническим деталям, БЕЗ календарных оценок в днях/неделях).`,
    ``,
    `## 5. Что НЕ делаем на этом горизонте`,
    `- 2–5 пунктов, что осознанно откладываем, и почему (опираясь на этапы WHITE_PAPER).`,
    ``,
    `## 6. Проверки в конце периода`,
    `- 3–6 пунктов, как мы поймём, что план выполнен (артефакты, метрики, тесты, демонстрация).`,
    ``,
    `Ограничения формата:`,
    `- Язык — русский.`,
    `- Никаких сроков в днях/неделях/часах — только размер задачи и зависимости.`,
    `- Не предлагай ломать архитектурные правила из ARCHITECTURE.md / SERVICES.md.`,
    `- Не цитируй WHITE_PAPER длинными блоками — ссылайся на разделы.`,
    `- Документ пишется в файл \`${outputFileName}\` и должен быть самодостаточен.`,
  ].join('\n');
}

/**
 * @typedef {Object} StrategicPlanOptions
 * @property {string} since           Аргумент для `git log --since=...` (например, "1 day ago").
 * @property {string} [until]         Опциональный `--until=...`.
 * @property {string} rangeLabel      Человекочитаемая метка периода (для промпта и шапки).
 * @property {string} horizonLabel    Горизонт плана (например, "следующий день").
 * @property {string} outputPath      Абсолютный путь к выходному markdown-файлу.
 * @property {string} commandName     Имя yarn-команды (для шапки файла).
 * @property {boolean} [full]         Расширенный режим (добавляет --shortstat в git log).
 * @property {boolean} [includeAnalyzersResearch]  Подключать ли `docs/WEEKLY_ANALYZERS_RESEARCH.md`
 *                                    в контекст промпта. Включается ТОЛЬКО для недельного плана.
 */

/**
 * @param {StrategicPlanOptions} options
 */
export async function runStrategicPlan(options) {
  loadDotEnv();

  let key;
  try {
    key = getAnthropicKey();
  } catch (e) {
    console.error(e.message);
    console.error('См. .env.example.');
    process.exit(1);
  }

  const archPath = resolve(process.cwd(), 'docs/ARCHITECTURE.md');
  const servicesPath = resolve(process.cwd(), 'docs/SERVICES.md');

  // WHITE_PAPER.md живёт в docs/. На случай старых веток или переноса —
  // фолбэк в корень репозитория, без падения на отсутствии второго файла.
  const whitePaperCandidates = [
    resolve(process.cwd(), 'docs/WHITE_PAPER.md'),
    resolve(process.cwd(), 'WHITE_PAPER.md'),
  ];
  let whitePaper = null;
  let whitePaperPathUsed = null;
  for (const candidate of whitePaperCandidates) {
    const text = readBoundedFile(candidate, MAX_WHITE_PAPER_CHARS);
    if (text) {
      whitePaper = text;
      whitePaperPathUsed = candidate;
      break;
    }
  }
  if (!whitePaper) {
    console.error(
      'WHITE_PAPER.md не найден ни в docs/, ни в корне репозитория. Стратегическая цель не задана.',
    );
    process.exit(1);
  }
  const architecture = readBoundedFile(archPath, MAX_ARCH_CHARS) ?? '(docs/ARCHITECTURE.md не найден)';
  const services = readBoundedFile(servicesPath, MAX_ARCH_CHARS) ?? '(docs/SERVICES.md не найден)';

  let analyzersResearch = null;
  if (options.includeAnalyzersResearch) {
    const researchPath = resolve(process.cwd(), 'docs/WEEKLY_ANALYZERS_RESEARCH.md');
    analyzersResearch = readBoundedFile(researchPath, MAX_ANALYZERS_RESEARCH_CHARS);
  }

  const commits = collectCommitLog({
    since: options.since,
    until: options.until,
    full: Boolean(options.full),
  });
  const status = collectStatusSnapshot();

  const outputFileRel = options.outputPath.replace(process.cwd() + '/', '');

  const systemHeader = buildSystemHeader({
    horizonLabel: options.horizonLabel,
    rangeLabel: options.rangeLabel,
  });
  const task = buildTaskBody({
    horizonLabel: options.horizonLabel,
    rangeLabel: options.rangeLabel,
    outputFileName: outputFileRel,
  });

  const whitePaperRel = whitePaperPathUsed.replace(process.cwd() + '/', '');
  const sections = [
    systemHeader,
    '',
    '---',
    `## ${whitePaperRel}`,
    '',
    whitePaper,
    '',
    '---',
    '## docs/ARCHITECTURE.md (выдержка)',
    '',
    architecture,
    '',
    '---',
    '## docs/SERVICES.md (выдержка)',
    '',
    services,
    '',
  ];
  if (analyzersResearch) {
    sections.push(
      '---',
      '## docs/WEEKLY_ANALYZERS_RESEARCH.md (свежий радар новых аналайзеров)',
      '',
      'Учитывай этот документ при формировании раздела 4 плана: если в нём есть',
      'кандидаты с высоким Σ и предлагаемые правки §4 INTEGRATIONS_STRATEGY.md —',
      'явно отрази в плане задачу «проверить кандидат X на нашем датасете», но',
      'НЕ ломай приоритеты §1 INTEGRATIONS_STRATEGY.md (локально > сервер > API;',
      'без обучения > с обучением; без кредитов > с кредитами).',
      '',
      analyzersResearch,
      '',
    );
  }
  sections.push(
    '---',
    `## git log за период «${options.rangeLabel}»`,
    '',
    commits,
    '',
    '---',
    '## Состояние репозитория',
    '',
    status,
    '',
    '---',
    task,
  );
  const assembled = sections.join('\n');

  const bodyText =
    assembled.length > MAX_CONTEXT_CHARS
      ? assembled.slice(0, MAX_CONTEXT_CHARS) +
        `\n\n[… контекст обрезан до ${MAX_CONTEXT_CHARS} символов …]\n`
      : assembled;

  const model = defaultModel();
  // План имеет 6 обязательных разделов с детализацией по задачам (поля «Цель / DoD /
  // Роль / Размер»). На реальных периодах 4096 токенов обрезались на середине раздела 4
  // (см. первый авто-запуск 2026-05-14). 8192 — комфортный потолок для claude-haiku-4-5
  // (модель допускает значительно больше); если упрёмся снова — увеличим адресно.
  const bodyJson = {
    model,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: bodyText }],
      },
    ],
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
        const parts = json?.content ?? [];
        out = parts
          .filter((b) => b?.type === 'text')
          .map((b) => b.text)
          .join('\n');
        if (!out) out = JSON.stringify(parts, null, 2);
      } catch {
        out = text;
      }
      writePlanFile({
        outputPath: options.outputPath,
        commandName: options.commandName,
        rangeLabel: options.rangeLabel,
        horizonLabel: options.horizonLabel,
        body: out,
      });
      console.log(out);
      console.error('Записано:', options.outputPath);
    }
  } catch (e) {
    console.error(e);
    exitCode = 1;
  }

  if (exitCode === 0) {
    await new Promise((r) => setTimeout(r, 150));
  }
  process.exit(exitCode);
}

function writePlanFile({ outputPath, commandName, rangeLabel, horizonLabel, body }) {
  const stamp = new Date().toISOString();
  const header =
    `<!-- Сгенерировано: ${stamp} (${commandName}) -->\n` +
    `<!-- Период: ${rangeLabel}; горизонт: ${horizonLabel} -->\n` +
    `<!-- Источник цели: WHITE_PAPER.md -->\n\n`;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, header + body, 'utf8');
}

/**
 * Универсальный парсер CLI для тонких обёрток: поддерживает --help, --full, --since.
 */
export function parseCommonArgs(argv, { commandName, defaultSince, defaultHorizon }) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: node scripts/${commandName}.mjs [--full] [--since="<git --since>"] [--help]

  --full           Добавить --shortstat к git log (больше деталей по diff-у).
  --since=<expr>   Переопределить интервал (по умолчанию: "${defaultSince}").
                   Принимает любое значение, понятное git --since
                   (например: "midnight", "2 days ago", "2026-05-10").
  --help           Эта справка.

Требуется ANTHROPIC_API_KEY в .env. Опционально ANTHROPIC_MODEL.
Горизонт плана: «${defaultHorizon}».`);
    process.exit(0);
  }
  const full = argv.includes('--full');
  let since = defaultSince;
  for (const a of argv) {
    if (a.startsWith('--since=')) since = a.slice('--since='.length);
  }
  return { full, since };
}
