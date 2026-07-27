/**
 * kits-prepush-strict — план строгой сверки описей китов на pre-push
 * (карточка kits-pins-prepush-strict, эпик friction-6).
 *
 * ЗАЧЕМ. Хук гоняет kits:audit --mode latest — sha_drift там только warn, строгую
 * сверку делает CI: дрейф ловится за пять минут прогона вместо секунды локально
 * (26.07: два красных CI — lens-bestiary.mjs развёл witcher, _main-day-issue.mjs —
 * angelina-morning). Гонять pinned по ВСЕМ китам на каждый push дорого; строгость
 * нужна только там, куда push реально дотянулся.
 *
 * Чистое ядро: ни ФС, ни git — вход уже прочитан обвязкой (scripts/kits-prepush-strict.mjs).
 * Кит затронут, если изменённый файл (а) запинен в его описи ЛИБО (б) лежит в его
 * каталоге kits/<id>/ (перепин, манифест, инструменты кита). Новый файл, втянутый в
 * замыкание правкой импортёра, ловится через самого импортёра — он запинен и изменён.
 */

/**
 * @typedef {{ id: string, dir: string, pinnedPaths: string[] }} KitPins
 * @typedef {{ id: string, touched: string[] }} AffectedKit
 */

/** Нормализация к виду описи: repo-relative, прямые слэши. @param {string} p */
export function normalizeRepoPath(p) {
  return String(p).replace(/\\/gu, '/').replace(/^\.\//u, '');
}

/**
 * Какие киты затронуты пушем.
 *
 * @param {{ kits: KitPins[], changedFiles: string[] }} input
 * @returns {AffectedKit[]} — в порядке kits; кит без пересечения не попадает
 */
export function affectedKits({ kits, changedFiles }) {
  const changed = (changedFiles ?? []).map(normalizeRepoPath).filter(Boolean);
  const out = [];
  for (const kit of kits ?? []) {
    const pinned = new Set((kit.pinnedPaths ?? []).map(normalizeRepoPath));
    const dirPrefix = `${normalizeRepoPath(kit.dir)}/`;
    const touched = changed.filter((f) => pinned.has(f) || f.startsWith(dirPrefix));
    if (touched.length > 0) out.push({ id: kit.id, touched });
  }
  return out;
}

/**
 * Подсказка ремонта — точная команда перепина, по одному киту на строку.
 * @param {string[]} kitIds
 * @returns {string}
 */
export function repinHint(kitIds) {
  return kitIds.map((id) => `  ремонт: yarn kits:pins --id ${id} --write (отдельным ревьюируемым коммитом, kits/README.md)`).join('\n');
}
