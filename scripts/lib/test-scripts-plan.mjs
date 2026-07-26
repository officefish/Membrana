/**
 * План прогона тестов `scripts/**` (#1263). Чистое ядро: ни ФС, ни процессов.
 *
 * ЗАЧЕМ ЭТО ЕСТЬ. Список из 210 путей жил одной строкой `test:scripts` в `package.json` и
 * был файлом-перекрёстком: любая ветка, добавившая тест, правила ровно её. 26.07 это дало
 * четыре конфликта подряд (PR #1248, #1253, #1269, #1283), а ревью ветки предсказало зверя
 * B2 ещё до первого из них.
 *
 * ОТНОШЕНИЕ К РЕШЕНИЮ 17.07 (заседание scripts-boundary). Тогда выбрали РУЧНОЙ список с
 * обоснованием: «явный список — сознательный контроль, флейки можно временно исключить
 * строкой», а гвард держит его честным. Цель — (а) никаких молчаливых сирот, (б) возможность
 * исключить осознанно. Оба требования здесь сохранены: набор берётся из дерева (сирота
 * невозможна), исключение остаётся, но обязано нести ПРИЧИНУ.
 *
 * Что решение 17.07 не поймало: гвард читал только верхний уровень `scripts/`, поэтому
 * 11 тестов в `scripts/lib/**` (81 проверка) не гонялись в CI вообще — ровно тот дефект,
 * от которого он защищал, на каталог глубже. Открытие по дереву закрывает и это.
 */

/** Каталоги, в которые не заходим при открытии. */
export const DISCOVERY_PRUNE = Object.freeze(['node_modules', 'cache', '.git']);

/**
 * Осознанные исключения: путь → причина. Пустая причина запрещена тестом — исключение
 * без объяснения через месяц неотличимо от забытого файла.
 * @type {Readonly<Record<string, string>>}
 */
export const SKIP_WITH_REASON = Object.freeze({});

/**
 * Группы — удобный фильтр для локального прогона, не контракт. `test:scripts` без группы
 * гоняет ВСЁ, поэтому ошибка отнесения не может «спрятать» тест.
 */
export const GROUPS = Object.freeze(['security', 'rituals', 'tasks', 'repo', 'domain']);

const RULES = [
  { group: 'security', re: /(secret|gitleaks|leak)/u },
  {
    group: 'rituals',
    re: /(ritual|morning|evening|standup|main-day|day-plan|digest|telegram|swallow|persona|angelina|bridge|storm|meeting|consilium|insight|feedback|dreams|night|strategy|horizon|audit)/u,
  },
  {
    group: 'tasks',
    re: /(task|registry|closure|one-shot|trace|kit|precedent|workshop|procedur|truth|run-ledger|docs-canon|vocabulary|readme|bestiary)/u,
  },
  {
    group: 'repo',
    re: /(^pr-|repo|worktree|branch|classify|git-|neighbors|prepush|deploy|build|wire|catalog|package|encoding|bom|long-temp|net-|ssh|office|panel|affine|strategic-docs|live-links|mcp|tailwind|replit|scripts-inventory|test-list)/u,
  },
];

/**
 * Группа файла. Первое подходящее правило побеждает; остальное — `domain`.
 *
 * @param {string} relPath например `scripts/lib/foo.test.mjs`
 * @returns {'security'|'rituals'|'tasks'|'repo'|'domain'}
 */
export function groupOf(relPath) {
  const name = String(relPath).replace(/^scripts\//u, '').replace(/\.test\.mjs$/u, '');
  for (const { group, re } of RULES) if (re.test(name)) return group;
  return 'domain';
}

/**
 * План прогона.
 *
 * @param {{ files: string[], group?: string|null, skips?: Record<string, string> }} input
 * @returns {{ run: string[], skipped: Array<{ file: string, reason: string }>, group: string|null }}
 */
export function planTestRun(input) {
  const skips = input.skips ?? SKIP_WITH_REASON;
  const group = input.group ?? null;
  if (group && !GROUPS.includes(group)) {
    throw new Error(`test:scripts: неизвестная группа «${group}» (есть: ${GROUPS.join(', ')})`);
  }
  const skipped = [];
  const run = [];
  for (const file of [...(input.files ?? [])].sort()) {
    if (Object.prototype.hasOwnProperty.call(skips, file)) {
      skipped.push({ file, reason: skips[file] });
      continue;
    }
    if (group && groupOf(file) !== group) continue;
    run.push(file);
  }
  return { run, skipped, group };
}
