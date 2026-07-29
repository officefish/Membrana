/**
 * Чистое ядро диагноста воркспейс-ссылок (#1465 Ф1).
 *
 * Задача — назвать ПРИЧИНУ. `TS2307: Cannot find module '@membrana/rag-service'`
 * показывает на файл-потребитель, и 29.07 диагноз занял несколько заходов: правки
 * пришлось прятать в stash и гонять базовую линию, чтобы доказать их непричастность.
 * Причина же была одна строка: ссылка ведёт в ГЛАВНОЕ дерево, а там пакет не собран.
 * `turbo` тут не спасает — он отдаёт `cache hit` и собирает копию в СВОЁМ дереве.
 *
 * Ввод не читает файловую систему: io живёт в scripts/workspace-links.mjs.
 */

/** Исходы диагноза — перечень закрытый. */
export const LINK_STATES = ['ok', 'dangling', 'no_manifest', 'unbuilt'];

/**
 * Входы, отсутствие которых ЛОМАЕТ резолв. `types` решает — по нему спотыкается
 * typecheck (живой случай rag 29.07).
 *
 * `main` проверяем только у импортируемых пакетов. У приложений (`private: true`:
 * background-office, background-media, background-cabinet, membrana-studio) `dist/main.js` —
 * артефакт ЗАПУСКА, его отсутствие резолв ничем не ломает. Без этого различения первый
 * же прогон дал 7 находок вместо 3, и четыре из них были шумом.
 *
 * @param {{types?: string, typings?: string, main?: string, private?: boolean}} manifest
 */
export function declaredEntries(manifest) {
  const entries = [];
  const types = manifest.types ?? manifest.typings;
  if (types) entries.push(types);
  if (manifest.main && manifest.private !== true) entries.push(manifest.main);
  // Современный пакет может объявлять вход ТОЛЬКО через exports — без types/main такой
  // остался бы слепой зоной (у rag-service оба поля есть, но полагаться на это нельзя).
  const root = manifest.exports?.['.'];
  if (root && typeof root === 'object') {
    for (const key of ['types', 'import', 'require', 'default']) {
      const value = root[key];
      if (typeof value === 'string' && !entries.includes(value)) entries.push(value);
    }
  } else if (typeof root === 'string' && !entries.includes(root)) {
    entries.push(root);
  }
  return entries;
}

/** Красное — только то, из-за чего резолв УЖЕ ломается или сломается при импорте. */
const RED_STATES = new Set(['dangling', 'unbuilt']);

/**
 * @param {{name: string, target: string|null, outside: boolean,
 *          manifest: {types?: string, main?: string}|null,
 *          missing: string[]}} link
 *   target — куда реально ведёт ссылка (realpath) либо null, если не разрешилась;
 *   outside — цель лежит вне текущего дерева (соседний worktree);
 *   missing — объявленные в манифесте входы, которых по этому пути нет.
 * @returns {{name: string, state: string, reason: string}}
 */
export function classifyLink(link) {
  const { name, target, outside, manifest, missing } = link;
  if (!target) {
    return { name, state: 'dangling', reason: 'ссылка никуда не ведёт — дерево переехало или install не проходил' };
  }
  if (!manifest) {
    return { name, state: 'no_manifest', reason: `по пути ${target} нет читаемого package.json` };
  }
  if (missing.length > 0) {
    const where = outside ? 'в ДРУГОМ дереве' : 'в этом дереве';
    return {
      name,
      state: 'unbuilt',
      reason:
        `объявлен вход ${missing.join(', ')}, но его нет ${where}: ${target} — ` +
        'пакет не собран там, куда ведёт ссылка',
    };
  }
  return { name, state: 'ok', reason: '' };
}

/**
 * @param {{name: string, state: string, reason: string}[]} links
 * @returns {{state: 'clean'|'broken', total: number, findings: object[], advice: string}}
 */
export function summarize(links) {
  const findings = links.filter((l) => RED_STATES.has(l.state));
  const outside = findings.some((f) => /в ДРУГОМ дереве/u.test(f.reason));
  return {
    state: findings.length > 0 ? 'broken' : 'clean',
    total: links.length,
    findings,
    advice:
      findings.length === 0
        ? 'ссылки воркспейса целы — «cannot find module» ищи не здесь'
        : outside
          ? 'собрать пакет в том дереве, куда ведёт ссылка (turbo соберёт СВОЮ копию — не ту)'
          : 'собрать пакет в этом дереве',
  };
}
