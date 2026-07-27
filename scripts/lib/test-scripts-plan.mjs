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

export const DEFAULT_TEST_CATALOG = Object.freeze({
  discovery: {
    root: 'scripts',
    suffix: '.test.mjs',
    prune: ['node_modules', 'cache', '.git'],
  },
  groups: [
    { name: 'security', pattern: '(secret|gitleaks|leak)' },
    {
      name: 'rituals',
      pattern:
        '(ritual|morning|evening|standup|main-day|day-plan|digest|telegram|swallow|persona|angelina|bridge|storm|meeting|consilium|insight|feedback|dreams|night|strategy|horizon|audit)',
    },
    {
      name: 'tasks',
      pattern:
        '(task|registry|closure|one-shot|trace|kit|precedent|workshop|procedur|truth|run-ledger|docs-canon|vocabulary|readme|bestiary)',
    },
    {
      name: 'repo',
      pattern:
        '(^pr-|repo|worktree|branch|classify|git-|neighbors|prepush|deploy|build|wire|catalog|package|encoding|bom|long-temp|net-|ssh|office|panel|affine|strategic-docs|live-links|mcp|tailwind|replit|scripts-inventory|test-list)',
    },
    { name: 'domain', fallback: true },
  ],
  skips: {},
});

export const DISCOVERY_PRUNE = Object.freeze(DEFAULT_TEST_CATALOG.discovery.prune);
export const SKIP_WITH_REASON = Object.freeze(DEFAULT_TEST_CATALOG.skips);
export const GROUPS = Object.freeze(DEFAULT_TEST_CATALOG.groups.map((g) => g.name));

export function normalizeCatalog(catalog = DEFAULT_TEST_CATALOG) {
  const groups = Array.isArray(catalog.groups) ? catalog.groups : DEFAULT_TEST_CATALOG.groups;
  const fallback = groups.filter((g) => g.fallback === true);
  if (fallback.length !== 1) throw new Error('test catalog: ровно одна fallback-группа обязательна');
  const names = groups.map((g) => g.name);
  if (new Set(names).size !== names.length) throw new Error('test catalog: имена групп должны быть уникальны');
  return {
    discovery: catalog.discovery ?? DEFAULT_TEST_CATALOG.discovery,
    groups,
    skips: catalog.skips ?? {},
    setups: catalog.setups ?? {},
  };
}

/**
 * Группа файла. Первое подходящее правило побеждает; остальное — `domain`.
 *
 * @param {string} relPath например `scripts/lib/foo.test.mjs`
 * @returns {'security'|'rituals'|'tasks'|'repo'|'domain'}
 */
export function groupOf(relPath, catalog = DEFAULT_TEST_CATALOG) {
  const cfg = normalizeCatalog(catalog);
  const name = String(relPath).replace(/^scripts\//u, '').replace(/\.test\.mjs$/u, '');
  for (const g of cfg.groups) {
    if (g.fallback) continue;
    if (new RegExp(g.pattern, 'u').test(name)) return g.name;
  }
  return cfg.groups.find((g) => g.fallback).name;
}

/**
 * План прогона.
 *
 * @param {{ files: string[], group?: string|null, skips?: Record<string, string>, catalog?: object }} input
 * @returns {{ run: string[], skipped: Array<{ file: string, reason: string }>, group: string|null }}
 */
export function planTestRun(input) {
  const catalog = normalizeCatalog(input.catalog);
  const groups = catalog.groups.map((g) => g.name);
  const skips = input.skips ?? catalog.skips ?? SKIP_WITH_REASON;
  const group = input.group ?? null;
  if (group && !groups.includes(group)) {
    throw new Error(`test:scripts: неизвестная группа «${group}» (есть: ${groups.join(', ')})`);
  }
  const skipped = [];
  const run = [];
  for (const file of [...(input.files ?? [])].sort()) {
    if (Object.prototype.hasOwnProperty.call(skips, file)) {
      skipped.push({ file, reason: skips[file] });
      continue;
    }
    if (group && groupOf(file, catalog) !== group) continue;
    run.push(file);
  }
  return { run, skipped, group };
}
