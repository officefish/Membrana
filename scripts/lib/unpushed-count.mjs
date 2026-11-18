/**
 * Сколько коммитов ветки не существует нигде снаружи (#2350, дефект 3).
 *
 * Правило: незапушенное = коммиты ветки, которых нет НИ в `origin/<ветка>`, НИ в `origin/main`,
 * НИ в вершине PR. Одним `rev-list` с тремя исключениями:
 *
 *   git rev-list --count <ветка> ^origin/main [^origin/<ветка>] [^<headRefOid PR>]
 *
 * Почему не «против одного опорного»: прежний подсчёт брал ЛИБО origin/<ветка>, ЛИБО вершину PR.
 * `pr:ship` после влития промотывает ветку на ствол (land-rebase / ff на origin/main), а
 * origin/<ветка> удаляется; вершина ≠ headRefOid, и `headRefOid..<ветка>` насчитывал squash-коммиты
 * ствола как «незапушенные» — влитое дерево навсегда оставалось в sprint-open (18.11: пять деревьев,
 * 1–5 «незапушенных» при нуле настоящих).
 *
 * Squash: исходные коммиты влитой ветки в origin/main не попадают, но достижимы из вершины PR —
 * исключение `^<headRefOid>` их снимает. Ветка без PR и без копии на сервере считается против
 * ствола честно (раньше — «есть ли хоть что-то» → 1).
 *
 * Fail-closed: любая ошибка git (вершины PR нет локально, ветки нет) → 1, «не знаю» ≠ «пусто».
 *
 * @param {object} p
 * @param {string} p.branch               — локальная ветка
 * @param {string | null | undefined} p.prHeadOid — headRefOid PR, если PR есть
 * @param {(args: string[]) => string} p.git     — git с trim-выводом; бросает при ненулевом коде
 * @param {string} [p.base]               — ствол, по умолчанию origin/main
 * @returns {number}
 */
export function countUnpushed({ branch, prHeadOid, git, base = 'origin/main' }) {
  try {
    const args = ['rev-list', '--count', branch, `^${base}`];
    if (hasRef(git, `refs/remotes/origin/${branch}`)) args.push(`^refs/remotes/origin/${branch}`);
    if (prHeadOid) args.push(`^${prHeadOid}`);
    const n = Number(git(args));
    return Number.isFinite(n) ? n : 1;
  } catch {
    return 1;
  }
}

function hasRef(git, ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
}
