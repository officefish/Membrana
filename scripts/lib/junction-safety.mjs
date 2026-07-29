/**
 * junction-safety — защита сноса деревьев от связей, ведущих наружу (#1436).
 *
 * Инциденты класса: 20.07 (ручной rm сквозь junction — 2019 файлов main tree),
 * 29.07 (repo-clean --worktrees --force — 2097 файлов main tree). Вектор один:
 * рекурсивное удаление проходит СКВОЗЬ junction/симлинк, чья цель лежит вне
 * сносимого дерева, и убивает чужие файлы.
 *
 * Закон: перед сносом дерева каждая связь, указывающая наружу, снимается КАК
 * СВЯЗЬ (rmdir/unlink самого линка), цель не трогается. Чистые функции здесь,
 * ФС-обход и снятие — в repo-clean.mjs.
 */
import { isAbsolute, resolve, sep } from 'node:path';

/**
 * Цель связи в абсолютной форме: относительная цель резолвится от каталога линка.
 * @param {string} linkAbsPath абсолютный путь самого линка
 * @param {string} rawTarget цель из readlink (как записана)
 * @returns {string}
 */
export function resolveLinkTarget(linkAbsPath, rawTarget) {
  const linkDir = resolve(linkAbsPath, '..');
  return isAbsolute(rawTarget) ? resolve(rawTarget) : resolve(linkDir, rawTarget);
}

/**
 * Связь ведёт НАРУЖУ дерева? Сравнение по нормализованным путям, без учёта
 * регистра (Windows). Граница каталога честная: /a/b не «внутри» /a/bc.
 * @param {string} targetAbsPath @param {string} treeRootAbsPath
 * @returns {boolean}
 */
export function targetIsOutsideTree(targetAbsPath, treeRootAbsPath) {
  const norm = (p) => resolve(p).toLowerCase();
  const target = norm(targetAbsPath);
  const root = norm(treeRootAbsPath);
  return target !== root && !target.startsWith(root + sep);
}

/**
 * Новые unstaged-удаления после операции: что пропало из дерева, чего не было
 * в списке «до». Вход — сырые `git status --porcelain` до и после.
 * @param {string} porcelainBefore @param {string} porcelainAfter
 * @returns {string[]} пути новых ` D`-строк
 */
export function newDeletions(porcelainBefore, porcelainAfter) {
  // Ловим удаление в ЛЮБОЙ колонке статуса: ` D` (unstaged), `D ` (staged),
  // `DD`/`AD` (конфликт/смесь). Снос сквозь связь оставляет unstaged, но
  // сузиться до одной формы — значит поверить, что вектор ровно один (P2 ревью).
  const deleted = (raw) =>
    String(raw ?? '')
      .split(/\r?\n/u)
      .filter((l) => /^(D.|.D) /u.test(l))
      .map((l) => l.slice(3).trim());
  const before = new Set(deleted(porcelainBefore));
  return deleted(porcelainAfter).filter((p) => !before.has(p));
}
