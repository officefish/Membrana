/**
 * Зуб формата доклада капитану (хотфикс 27.07, наблюдение капитана №1).
 * Канон: docs/virtual-team/angelina/MORNING_REPORT_FORMAT.md (установлен 24.07).
 * Чистые функции: ни fs, ни сети — обвязка снаружи (scripts/report-check.mjs).
 *
 * Проверяются ДВЕ оси канона:
 *  1. СТРУКТУРА: заголовок «# План на …», вводный абзац, пять секций в порядке
 *     (🎯 → 🔧 → 🔭 → 🧪 → 🧹), заключительный абзац после последней секции.
 *  2. ЧИСТОТА ТЕЛА: запрещены имена файлов, номера Issue/PR, SHA, HTTP-коды,
 *     имена провайдеров/моделей, внутренние URL — технический слой живёт в рабочих
 *     документах, не в докладе.
 *
 * Находки говорят именами, а не «формат неверен».
 */

/** Обязательные секции канона, строго в этом порядке. */
export const REQUIRED_SECTIONS = [
  '## 🎯 Главная задача',
  '## 🔧 В поддержку',
  '## 🔭 На будущее',
  '## 🧪 На пробу',
  '## 🧹 Навести порядок',
];

/** @typedef {{ rule: string, message: string }} Problem */

/**
 * Структурные проблемы доклада против канона.
 * @param {string} md
 * @returns {Problem[]}
 */
export function reportStructureProblems(md) {
  const src = String(md ?? '');
  const problems = [];

  if (!/^#\s+План на\s+\S/mu.test(src)) {
    problems.push({ rule: 'title', message: 'нет заголовка «# План на <день>, <число месяц>»' });
  }

  // Секции: наличие и порядок (сверка по префиксу — хвост заголовка канон допускает разный).
  let lastIdx = -1;
  for (const section of REQUIRED_SECTIONS) {
    const idx = src.indexOf(section);
    if (idx === -1) {
      problems.push({ rule: 'section', message: `нет секции «${section}»` });
      continue;
    }
    if (idx < lastIdx) {
      problems.push({ rule: 'order', message: `секция «${section}» стоит раньше предыдущей по канону` });
    }
    lastIdx = idx;
  }

  // Вводный абзац: между заголовком и первой секцией обязана быть проза.
  const titleMatch = src.match(/^#\s+План на[^\n]*\n/mu);
  const firstSection = src.indexOf(REQUIRED_SECTIONS[0]);
  if (titleMatch && firstSection > -1) {
    const between = src.slice(titleMatch.index + titleMatch[0].length, firstSection).trim();
    if (between.length < 40) {
      problems.push({ rule: 'intro', message: 'нет вводного абзаца (фокус дня и почему выбран) между заголовком и 🎯' });
    }
  }

  // Заключительный абзац: после секции 🧹 обязана быть проза (что оставлено в стороне).
  const lastSection = src.indexOf(REQUIRED_SECTIONS[REQUIRED_SECTIONS.length - 1]);
  if (lastSection > -1) {
    const tail = src.slice(lastSection);
    const afterHeading = tail.replace(/^[^\n]*\n/u, '');
    const nextProse = afterHeading.split(/\n##\s/u)[0];
    // Хвост секции = буллеты; заключительный абзац — прозаическая строка без маркера.
    const proseLines = nextProse.split('\n').filter((l) => l.trim() && !/^\s*[-*•|]/u.test(l) && !/^#/u.test(l));
    if (proseLines.join(' ').trim().length < 40) {
      problems.push({ rule: 'outro', message: 'нет заключительного абзаца (что сознательно оставлено в стороне)' });
    }
  }

  return problems;
}

/** Запрещённые в теле токены: класс → детектор. Порядок = порядок доклада о находках. */
const BODY_BANS = [
  ['issue-номер', /(?<![\w/])#\d{2,}\b/u],
  ['имя файла', /\b[\w./-]+\.(?:mjs|js|ts|tsx|json|md|yml|yaml|toml)\b/u],
  ['SHA', /\b[0-9a-f]{8,40}\b/u],
  ['HTTP-код', /\bHTTP\s*[1-5]\d\d\b/u],
  ['провайдер/модель', /\b(?:anthropic|openrouter|deepseek|grok|xai|claude|sonnet|haiku|opus)\b/iu],
  ['внутренний URL', /\b(?:mmbrn\.tech|membrana\.space)\b/u],
  ['код проверки', /\b(?:C\d|P\d|M\d|B\d{1,2}|rt-\d+)\b/u],
];

/**
 * Проблемы чистоты тела (линза Ожегова: продуктовый слой, не технический).
 * @param {string} md
 * @returns {Problem[]}
 */
export function reportBodyProblems(md) {
  const src = String(md ?? '');
  // Код-блоки из проверки исключаются: канон запрещает жаргон в ПРОЗЕ доклада.
  const prose = src.replace(/```[\s\S]*?```/gu, '').replace(/`[^`\n]*`/gu, '');
  const problems = [];
  for (const [name, re] of BODY_BANS) {
    const m = prose.match(re);
    if (m) problems.push({ rule: 'body', message: `в теле доклада ${name}: «${m[0]}» — технический слой живёт в рабочих документах` });
  }
  return problems;
}

/**
 * Полная проверка: структура + чистота.
 * @param {string} md
 * @returns {{ ok: boolean, problems: Problem[] }}
 */
export function reportFormatProblems(md) {
  const problems = [...reportStructureProblems(md), ...reportBodyProblems(md)];
  return { ok: problems.length === 0, problems };
}
