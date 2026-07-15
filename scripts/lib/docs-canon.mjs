/**
 * docs-canon — чистые правила сверки живого канона с репозиторием (#497).
 *
 * Зачем: канон обещал то, чего нет. Спорные команды НИКОГДА не существовали
 * (0 коммитов по `git log -S`), а не «устарели»: регламенты описывали систему,
 * которую собирались построить. Без гарда это вернётся.
 *
 * Два правила, выведенные из разбора реальных ложных срабатываний:
 *
 * 1. **Архивы не трогать.** `day-sprint/`, `seanses/`, `discussions/`, `insights/`,
 *    `tasks/archive/` — исторические записи. Closure-отчёт от июня законно
 *    упоминает команду, которой уже нет; «починить» его = фальсифицировать историю.
 * 2. **Честная пометка — не ошибка.** Док, который сам пишет «не реализовано»,
 *    «Запланировано», «не существует», «optional», говорит правду. Ругаться на
 *    него — учить людей глушить гард.
 */

/** Встроенные команды yarn — не наши скрипты. */
export const YARN_BUILTINS = new Set([
  'install', 'add', 'remove', 'dlx', 'workspace', 'workspaces', 'run', 'why', 'up',
  'init', 'node', 'set', 'config', 'link', 'bin', 'cache', 'info', 'pack', 'exec',
  'plugin', 'turbo', 'version', 'patch', 'unlink', 'rebuild',
]);

/**
 * Маркеры честности. Если они стоят в той же строке, что и команда, — это
 * осознанная пометка «пока нет», а не ложь канона.
 */
export const HONEST_MARKERS = [
  'не реализовано',
  'не существует',
  'не существуют',
  'запланировано',
  'бэклог',
  'backlog',
  'optional',
  'опционально',
  'планируется',
  'замысел',
  'не реализован',
];

export function hasHonestMarker(line) {
  const lower = String(line).toLowerCase();
  return HONEST_MARKERS.some((m) => lower.includes(m));
}

/**
 * Канон или архив? Архивы — только чтение истории.
 * @param {string} relPath — путь с прямыми слэшами
 */
export function isArchiveDoc(relPath) {
  return /^docs\/(day-sprint|seanses|discussions|insights|tasks\/archive|archive|reviews)\//.test(
    relPath,
  );
}

/**
 * Живой канон: верхнеуровневые доки, регламенты, deploy-рантбуки, корневые правила.
 * Всё прочее (в т.ч. промпты конкретных задач) — не канон: они описывают свой момент.
 */
export function isCanonDoc(relPath) {
  if (isArchiveDoc(relPath)) return false;
  if (relPath === 'AGENTS.md' || relPath === '.cursorrules') return true;
  if (/^docs\/[^/]+\.md$/.test(relPath)) return true;
  if (/^docs\/deploy\/[^/]+\.md$/.test(relPath)) return true;
  if (/^docs\/prompts\/[^/]*(REGULATION|WORKFLOW)[^/]*\.md$/.test(relPath)) return true;
  return false;
}

/**
 * Найти в тексте yarn-команды, которых нет в package.json.
 *
 * Подкоманды: `yarn insight research <id>` — это существующий `insight`, а не
 * несуществующий `insight:research`. Живой случай: INSIGHT_REGULATION писал
 * `yarn insight:research`, и команда падала — функциональность есть, синтаксис в доке врал.
 *
 * @param {string} text
 * @param {Set<string>} scripts — ключи package.json scripts
 * @returns {{ command: string, line: number, lineText: string }[]}
 */
/**
 * Куски строки внутри `code`-спанов. Обещанием считается только команда В КОДЕ:
 * доки пишут реальные команды кодом, а в прозе «(yarn download)» или «команда
 * yarn ritual:evening:remote» — это упоминание, а не контракт. Иначе гард ловит
 * пересказ и его учатся глушить.
 */
function codeSpans(lineText) {
  return [...String(lineText).matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

export function findMissingCommands(text, scripts) {
  const out = [];
  const lines = text.split('\n');
  let inFence = false;
  for (const [index, lineText] of lines.entries()) {
    if (/^\s*```/.test(lineText)) {
      inFence = !inFence;
      continue;
    }
    if (hasHonestMarker(lineText)) continue;
    const haystacks = inFence ? [lineText] : codeSpans(lineText);
    for (const haystack of haystacks) {
      for (const m of haystack.matchAll(/yarn\s+([a-z0-9][a-z0-9:._-]*)/g)) {
        const next = haystack[m.index + m[0].length] ?? '';
        // Глоб/плейсхолдер — шаблон, а не команда: `yarn cabinet:*:prod`,
        // `yarn competition:synthesis-<sprint>`.
        if (next === '*' || next === '<') continue;
        // Хвостовая пунктуация прозы: «yarn ask.» → «yarn ask».
        const cmd = m[1].replace(/[.:_-]+$/, '');
        if (!cmd || YARN_BUILTINS.has(cmd) || scripts.has(cmd)) continue;
        if (/^\d+$/.test(cmd)) continue; // «yarn 4» — версия
        out.push({ command: cmd, line: index + 1, lineText: lineText.trim() });
      }
    }
  }
  return out;
}

/**
 * Ссылки на файлы скриптов, которых нет.
 * @param {string} text
 * @param {(path: string) => boolean} exists
 */
export function findMissingScriptPaths(text, exists) {
  const out = [];
  for (const [index, lineText] of text.split('\n').entries()) {
    if (hasHonestMarker(lineText)) continue;
    for (const m of lineText.matchAll(/`(scripts\/[\w./-]+\.(?:mjs|js|py|ts))`/g)) {
      if (exists(m[1])) continue;
      out.push({ path: m[1], line: index + 1, lineText: lineText.trim() });
    }
  }
  return out;
}
