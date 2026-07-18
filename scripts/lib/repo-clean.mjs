/**
 * repo-clean — чистые правила чистки веток и worktree (#492).
 *
 * Почему не `git branch --merged`: репозиторий мёржит PR **squash**, поэтому
 * коммиты ветки не становятся предками main и штатная проверка их не видит. На
 * замере 2026-07-15 она признала влитыми 9 удалённых веток из 42 реально мёртвых.
 * Единственный надёжный источник истины — состояние PR на GitHub.
 *
 * Здесь только чистые функции (без git/gh/fs) — их гоняют тесты на фикстурах.
 */

/**
 * Долгоживущие ветки персонажей (TASKS_MANAGEMENT §7а) + main.
 * Удалять их нельзя НИКОГДА, сколько бы они ни выглядели заброшенными:
 * у ozhegov последний коммит 2026-05-14, и это норма — ветка персонажа живёт
 * между задачами, а не закрывается вместе с PR.
 */
export const PROTECTED_BRANCHES = new Set([
  'main',
  'vesnin',
  'ozhegov',
  'boyarskiy',
  'dynin',
  'rodchenko',
  'kuryokhin',
]);

/** Причины, по которым ветка НЕ удаляется. Печатаются в отчёте как есть. */
export const KEEP_REASON = {
  protected: 'персона-ветка/main — канон TASKS_MANAGEMENT §7а',
  worktree: 'занята worktree',
  current: 'текущая ветка сессии',
  openPr: 'открытый PR',
  noPrUnpushed: 'нет PR и нет на origin — уникальные коммиты пропадут безвозвратно',
  noPr: 'нет PR — нужен разбор владельцем',
};

/**
 * Последний PR по имени ветки. Веток с несколькими PR хватает (ветку
 * пересобирали) — решает САМЫЙ СВЕЖИЙ, иначе старый CLOSED пометил бы мёртвой
 * ветку с новым открытым PR.
 * @param {{number:number, state:string, headRefName:string}[]} prs
 */
export function latestPrByBranch(prs) {
  const byBranch = new Map();
  for (const pr of prs) {
    const prev = byBranch.get(pr.headRefName);
    if (!prev || pr.number > prev.number) byBranch.set(pr.headRefName, pr);
  }
  return byBranch;
}

/**
 * Решение по одной ветке.
 *
 * fail-closed: удаляем ТОЛЬКО при явном MERGED/CLOSED PR. Всё остальное —
 * оставляем с причиной. Неизвестность не повод стирать чужую работу.
 *
 * @param {object} branch — { name, hasRemote, aheadOfMain }
 * @param {Map<string, {number:number, state:string}>} prByBranch
 * @param {{ worktreeBranches?: Set<string>, currentBranch?: string }} ctx
 * @returns {{ name: string, delete: boolean, reason: string, pr: number|null }}
 */
export function decideBranch(branch, prByBranch, ctx = {}) {
  const { name, hasRemote = false, aheadOfMain = 0 } = branch;
  const worktreeBranches = ctx.worktreeBranches ?? new Set();
  const keep = (reason, pr = null) => ({ name, delete: false, reason, pr });

  if (PROTECTED_BRANCHES.has(name)) return keep(KEEP_REASON.protected);
  if (worktreeBranches.has(name)) return keep(KEEP_REASON.worktree);
  if (ctx.currentBranch && name === ctx.currentBranch) return keep(KEEP_REASON.current);

  const pr = prByBranch.get(name);
  if (pr && (pr.state === 'MERGED' || pr.state === 'CLOSED')) {
    return { name, delete: true, reason: `PR #${pr.number} ${pr.state}`, pr: pr.number };
  }
  if (pr) return keep(KEEP_REASON.openPr, pr.number);

  // Нет PR. Незапушенная ветка с уникальными коммитами — единственная копия
  // работы (живой случай: chore/ritual-day-0715, 4 коммита утреннего ритуала
  // соседней сессии только локально).
  if (!hasRemote && aheadOfMain > 0) return keep(KEEP_REASON.noPrUnpushed);
  return keep(KEEP_REASON.noPr);
}

/**
 * Решение по worktree.
 *
 * Удаляем только когда сходится всё: дерево чистое, не заблокировано, это не
 * главный checkout и не текущая сессия, а спринт ветки — archived в реестре.
 * Любое сомнение → оставить: снести чужую активную сессию дороже, чем не убрать.
 *
 * @param {object} wt — { path, branch, isMain, locked, dirtyCount, isCurrent }
 * @param {(branch:string) => boolean} isArchivedSprint
 */
export function decideWorktree(wt, isArchivedSprint) {
  const keep = (reason) => ({ path: wt.path, branch: wt.branch, remove: false, reason });
  if (wt.isMain) return keep('главный checkout репозитория');
  if (wt.isCurrent) return keep('текущая сессия');
  if (wt.locked) return keep('locked — снимать блокировку осознанно, вручную');
  if (wt.dirtyCount > 0) return keep(`${wt.dirtyCount} незакоммиченных изменений`);
  if (!wt.branch) return keep('detached HEAD — разбирать вручную');
  if (!isArchivedSprint(wt.branch)) return keep('спринт ветки не archived в реестре');
  return { path: wt.path, branch: wt.branch, remove: true, reason: 'спринт archived, дерево чистое' };
}

/**
 * Спринт ветки завершён? Ветка вида `comp/<sprint-id>/alpha` или
 * `cowork/<sprint-id>/<block>` → id спринта берём вторым сегментом и ищем в реестре.
 * Ветка без такой формы → «не знаем» → не трогаем (fail-closed).
 *
 * @param {{tasks: {id:string,status:string}[]}} registry
 */
export function makeArchivedSprintPredicate(registry) {
  const status = new Map(registry.tasks.map((t) => [t.id, t.status]));
  return (branch) => {
    const segments = String(branch).split('/');
    if (segments.length < 2) return false;
    const sprintId = segments[1];
    // Реестр хранит id вида `comp-detection-alarm`, ветка — `comp-detection-alarm-2026-07-10`.
    for (const [id, st] of status) {
      if (st !== 'archived') continue;
      if (sprintId === id || sprintId.startsWith(`${id}-`)) return true;
    }
    return false;
  };
}

/**
 * Файлы в корне, которые лежат там законно, хотя и не отслеживаются.
 * Всё остальное в корне — черновик, которому место во временном каталоге.
 */
export const ROOT_ALLOWED_UNTRACKED = new Set([
  '.env',
  '.env.local',
  '.env.llm-proxy',
  'yarn-error.log',
]);

/** Каталоги-инструменты в корне: их содержимое не наше дело. */
const ROOT_TOOL_PREFIXES = ['.yarn/', 'node_modules/', '.turbo/', '.git/'];

/**
 * Черновики в корне репозитория.
 *
 * Повод (18.07): агент оставил в корне пять файлов — два черновика текстов и
 * три одноразовых скрипта разбора. Работа была настоящей (issue #609, PR #612),
 * но её черновики остались лежать рядом с `package.json`. Канон уже требует
 * держать временное в `%TEMP%`/`$TMPDIR`, а проверки на это не было.
 *
 * Это ПРЕДУПРЕЖДЕНИЕ, а не блок: чужой черновик может быть живой работой, и
 * решать его судьбу должен владелец дерева, а не автоматика. Ровно поэтому
 * функция ничего не удаляет — только называет.
 *
 * @param {string[]} untrackedPaths вывод `git status --porcelain` без префикса
 * @returns {{path: string, hint: string}[]}
 */
export function rootScratchFiles(untrackedPaths) {
  const out = [];
  for (const raw of untrackedPaths) {
    const p = String(raw).trim();
    if (!p) continue;
    if (ROOT_TOOL_PREFIXES.some((prefix) => p.startsWith(prefix))) continue;
    // Вложенное — не корень: каталоги живут по своим правилам.
    if (p.includes('/')) continue;
    if (ROOT_ALLOWED_UNTRACKED.has(p)) continue;
    const hint = /\.(mjs|js|ts|py|sh|ps1)$/.test(p)
      ? 'одноразовый скрипт — во временный каталог'
      : /\.(md|txt)$/.test(p)
        ? 'черновик текста — во временный каталог либо в docs/ осознанно'
        : 'черновик — во временный каталог';
    out.push({ path: p, hint });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** Сводка для отчёта: сгруппировать решения по причине. */
export function groupByReason(decisions) {
  const groups = new Map();
  for (const d of decisions) {
    const key = d.reason;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d.name ?? d.path);
  }
  return groups;
}
