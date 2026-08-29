/**
 * Каталоги воркспейсов — ОДИН носитель на всех, читается у корневого манифеста.
 *
 * ЗАЧЕМ. Два сторожа границ (`verify:image-workspace-deps`, `verify:declared-imports`) держали
 * свой список каталогов константой, скопированной с `workspaces` корневого `package.json`.
 * Ревью #2233 назвало это слепой зоной от дрейфа — и дрейф уже случился: корень объявляет
 * `apps/demos/Research-Tree`, а обе копии о нём не знали. То есть пакет существовал, а сторожа
 * его не судили и молчали об этом.
 *
 * Это тот же класс, что мы чиним весь день: два носителя одного знания расходятся, и
 * расхождение не кричит. Лекарство — не третья копия, а чтение у источника.
 *
 * ДВЕ ФОРМЫ ЗАПИСИ, и обе законны в yarn:
 *   `packages/services/*` — каталог, чьи ПОДКАТАЛОГИ суть пакеты;
 *   `apps/demos/Research-Tree` — точный путь одного пакета.
 * Смешивать их нельзя: обход первого идёт по детям, второго — по самому пути.
 */

/**
 * Разбор `workspaces` корневого манифеста.
 * @param {{workspaces?: string[] | {packages?: string[]}}} rootPkg
 * @returns {{globs: string[], exact: string[]}} globs — каталоги-родители, exact — сами пакеты
 */
export function workspaceLocations(rootPkg) {
  const raw = Array.isArray(rootPkg?.workspaces)
    ? rootPkg.workspaces
    : (rootPkg?.workspaces?.packages ?? []);
  const globs = [];
  const exact = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || entry.length === 0) continue;
    if (entry.endsWith('/*')) globs.push(entry.slice(0, -2));
    else if (!entry.includes('*')) exact.push(entry);
    // Шаблоны сложнее одного хвостового `*` (`**`, `*` в середине) намеренно не поддержаны:
    // молча приблизительный разбор хуже явного пробела. Появятся — здесь и будет видно.
  }
  return { globs, exact };
}

/**
 * Пути, по которым сторожа ищут пакеты. Возвращает и родительские каталоги, и точные пути —
 * вызывающий обходит первые по детям, вторые берёт как есть.
 * @param {object} rootPkg
 */
export function workspaceSearchPaths(rootPkg) {
  const { globs, exact } = workspaceLocations(rootPkg);
  return { parents: globs, packages: exact };
}
