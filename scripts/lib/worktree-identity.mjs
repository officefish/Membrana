/**
 * Опознание чужого дерева по пути пакета — чистое ядро (блок 2, #1647).
 *
 * ЗАЧЕМ. Вердикт `foreign` говорит «пакеты ведут наружу», но не говорит КУДА. Иссью просит
 * знать, в какое дерево и на какой ветке уходит резолюция: без этого агент ищет виновника
 * руками, а состояние динамическое — ролями меняются при каждом `yarn install`.
 *
 * ГЛАВНАЯ ЛОВУШКА, ради которой ядро отдельное: имя одного дерева бывает ПРЕФИКСОМ другого
 * (`Membrana` и `Membrana-tooling`). Сопоставление «по началу строки» приписывает пакет
 * ближайшему по имени дереву и врёт уверенно. 08.08 на этом сорвался живой замер строки 10:
 * `…/Membrana-tooling/packages/core` был объявлен «своим» для `…/Membrana`. Здесь сравнение
 * идёт ПО СЕГМЕНТУ пути, а неопознанное честно зовётся неизвестным.
 *
 * Ни сети, ни ФС, ни git: перечень деревьев приносит порт значением.
 */

/** Путь к сравнимому виду: слэши вперёд, буква диска в нижний регистр, хвостовой слэш снят. */
function normalize(p) {
  const s = String(p ?? '').replaceAll('\\', '/').replace(/\/+$/u, '');
  return /^[A-Za-z]:/u.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

/** `target` лежит внутри `root` — сегментно, а не по префиксу строки. */
function isInside(target, root) {
  const t = normalize(target);
  const r = normalize(root);
  return t === r || t.startsWith(`${r}/`);
}

/**
 * Найти дерево, которому принадлежит путь.
 *
 * Когда путь подходит нескольким деревьям (вложенные worktree — `.worktrees/X` внутри
 * основного), выигрывает САМОЕ ГЛУБОКОЕ совпадение: вложенное дерево ближе к правде, чем
 * его хозяин. Иначе всякий пакет вложенного дерева приписывался бы внешнему.
 *
 * @param {string} target реальный путь пакета
 * @param {ReadonlyArray<{root: string, name?: string, branch?: string|null}>} trees
 * @returns {{root: string, name: string, branch: string|null}|null} null — дерево неизвестно
 */
export function treeOf(target, trees) {
  const list = Array.isArray(trees) ? trees : [];
  let best = null;
  for (const t of list) {
    if (typeof t?.root !== 'string' || t.root === '') continue;
    if (!isInside(target, t.root)) continue;
    if (best === null || normalize(t.root).length > normalize(best.root).length) best = t;
  }
  if (best === null) return null;
  return {
    root: best.root,
    name: best.name ?? normalize(best.root).split('/').filter(Boolean).pop() ?? best.root,
    branch: best.branch ?? null,
  };
}

/**
 * Свести чужие пакеты по деревьям-владельцам.
 *
 * @param {ReadonlyArray<{name: string, realPath: string|null}>} packages
 * @param {string} treeRoot дерево, в котором идёт работа
 * @param {ReadonlyArray<{root: string, name?: string, branch?: string|null}>} trees
 * @returns {{owners: Array<{name: string, branch: string|null, root: string, packages: string[]}>,
 *   unknown: string[]}}
 */
export function attributeForeign(packages, treeRoot, trees) {
  const owners = new Map();
  const unknown = [];
  for (const p of Array.isArray(packages) ? packages : []) {
    if (typeof p?.realPath !== 'string' || p.realPath === '') continue;
    if (isInside(p.realPath, treeRoot)) continue;
    const owner = treeOf(p.realPath, trees);
    if (owner === null) {
      // Дерева нет в перечне — так и говорим. Приписать ближайшему по имени значило бы
      // повторить ту самую префиксную ложь, ради которой это ядро и отдельное.
      unknown.push(String(p?.name ?? '(без имени)'));
      continue;
    }
    const key = normalize(owner.root);
    if (!owners.has(key)) owners.set(key, { name: owner.name, branch: owner.branch, root: owner.root, packages: [] });
    owners.get(key).packages.push(String(p?.name ?? '(без имени)'));
  }
  // Порядок детерминирован: сводка одного состояния не должна меняться от обхода каталога.
  const list = [...owners.values()].sort((a, b) => b.packages.length - a.packages.length || a.name.localeCompare(b.name));
  for (const o of list) o.packages.sort();
  unknown.sort();
  return { owners: list, unknown };
}

/**
 * Строки «кто именно тебя ломает». Печатаются только при чужой резолюции: на своём дереве
 * добавлять нечего, и лишняя строка размыла бы вердикт ядра.
 *
 * @param {ReturnType<typeof attributeForeign>} attribution
 * @returns {string[]}
 */
export function formatAttribution(attribution) {
  const lines = [];
  for (const o of attribution?.owners ?? []) {
    const branch = o.branch ? `ветка ${o.branch}` : 'ветка неизвестна';
    lines.push(`  → ${o.packages.length} пакет(ов) ведут в «${o.name}» · ${branch}`);
  }
  if ((attribution?.unknown ?? []).length > 0) {
    lines.push(`  → ${attribution.unknown.length} пакет(ов) ведут ВНЕ известных деревьев — владелец не опознан`);
  }
  return lines;
}
