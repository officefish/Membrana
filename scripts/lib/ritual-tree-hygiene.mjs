/**
 * Гигиена дерева для утреннего ритуала (#1232 Ф1–Ф2).
 *
 * Ритуалу не нужен чекаут `main`: нужно `freshEnough(дерево, origin/main) ∧ clean(дерево)`.
 * Порог отставания объявлен явно (по умолчанию 0). `main` никому не выдаётся —
 * держатель с путём дерева = находка, не «факт среды».
 *
 * Чистое ядро: без git/сети. Снимки подает адаптер (morning-care / CLI).
 */

/** @typedef {{ path: string, branch: string|null }} WorktreeHolder */

export const DEFAULT_BASE_REF = 'origin/main';
/** Коммитов позади origin/main, при которых дерево ещё «достаточно свежо». */
export const DEFAULT_MAX_BEHIND = 0;
export const PROTECTED_BASE = 'main';

/**
 * @param {string|null|undefined} porcelain — вывод `git status --porcelain`
 * @returns {boolean}
 */
export function isClean(porcelain) {
  return String(porcelain ?? '').trim().length === 0;
}

/**
 * @param {number} behind — `rev-list --count HEAD..origin/main`
 * @param {number} [maxBehind]
 * @returns {boolean}
 */
export function isFreshEnough(behind, maxBehind = DEFAULT_MAX_BEHIND) {
  const n = Number(behind);
  if (!Number.isFinite(n) || n < 0) return false;
  return n <= maxBehind;
}

/**
 * Предикат готовности дерева к ритуалу (вместо «HEAD == main»).
 * @param {{ behind: number, dirtyCount: number, maxBehind?: number, dirtyPaths?: string[] }} snap
 * @returns {{ ok: boolean, blockedBy: string[] }}
 */
export function ritualTreeReady(snap) {
  const maxBehind = snap.maxBehind ?? DEFAULT_MAX_BEHIND;
  const behind = Number(snap.behind) || 0;
  const dirtyCount = Number(snap.dirtyCount) || 0;
  const blockedBy = [];

  if (!isFreshEnough(behind, maxBehind)) {
    blockedBy.push(`свежесть: отстаём от ${DEFAULT_BASE_REF} на ${behind} (порог ${maxBehind})`);
  }
  if (dirtyCount > 0) {
    const sample = (snap.dirtyPaths ?? []).slice(0, 8);
    const tail = dirtyCount > sample.length ? ` … ещё ${dirtyCount - sample.length}` : '';
    const list = sample.length ? `: ${sample.join(', ')}${tail}` : '';
    blockedBy.push(
      `чистота: грязно (${dirtyCount} путей)${list} — эскалация владельцу, не переключать ветку и не сносить чужое`,
    );
  }
  return { ok: blockedBy.length === 0, blockedBy };
}

/**
 * Разбор `git worktree list --porcelain`.
 * @param {string} porcelain
 * @returns {WorktreeHolder[]}
 */
export function parseWorktreeHolders(porcelain) {
  /** @type {WorktreeHolder[]} */
  const out = [];
  let path = null;
  let branch = null;
  let bare = false;
  const flush = () => {
    if (path && !bare) out.push({ path, branch });
    path = null;
    branch = null;
    bare = false;
  };
  for (const line of String(porcelain ?? '').split(/\r?\n/u)) {
    if (line.startsWith('worktree ')) {
      flush();
      path = line.slice('worktree '.length).trim();
    } else if (line.startsWith('branch ')) {
      branch = line.replace(/^branch refs\/heads\//u, '').trim();
    } else if (line === 'detached') {
      branch = null;
    } else if (line === 'bare') {
      bare = true;
    } else if (line === '') {
      flush();
    }
  }
  flush();
  return out;
}

/**
 * Кто держит защищённую базу (обычно `main`), кроме текущего дерева.
 * @param {WorktreeHolder[]} holders
 * @param {string} currentRoot
 * @param {string} [baseBranch]
 * @returns {WorktreeHolder[]}
 */
export function findBaseHolders(holders, currentRoot, baseBranch = PROTECTED_BASE) {
  const cur = String(currentRoot ?? '')
    .replace(/\\/g, '/')
    .toLowerCase();
  return (holders ?? []).filter((h) => {
    if (h.branch !== baseBranch) return false;
    const p = String(h.path ?? '')
      .replace(/\\/g, '/')
      .toLowerCase();
    return p !== cur;
  });
}

/**
 * Текущее дерево само на main — тоже находка («main не выдаётся никому»).
 * @param {string|null|undefined} currentBranch
 * @param {string} [baseBranch]
 * @returns {boolean}
 */
export function selfHoldsBase(currentBranch, baseBranch = PROTECTED_BASE) {
  return currentBranch === baseBranch;
}

/**
 * @param {WorktreeHolder[]} holders
 * @param {{ selfOnBase?: boolean, baseBranch?: string }} [opts]
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function baseHolderGuard(holders, opts = {}) {
  const baseBranch = opts.baseBranch ?? PROTECTED_BASE;
  const findings = [];
  for (const h of holders) {
    const name = basenamePath(h.path);
    findings.push(
      `${baseBranch} держит «${name}» (${h.path}) — находка, не норма; ритуалу чекаут ${baseBranch} не нужен`,
    );
  }
  if (opts.selfOnBase) {
    findings.push(
      `это дерево само на ${baseBranch} — ${baseBranch} не выдаётся никому; уйди на idle/feature (база — только для ветвления)`,
    );
  }
  return { ok: findings.length === 0, findings };
}

/** @param {string} p */
export function basenamePath(p) {
  const norm = String(p ?? '').replace(/\\/g, '/');
  const parts = norm.split('/').filter(Boolean);
  return parts[parts.length - 1] || norm || '?';
}

/**
 * Запрет коммита/push из HEAD == main (мимо явного обхода).
 * @param {string|null|undefined} branch
 * @param {{ allow?: boolean }} [opts]
 * @returns {{ ok: boolean, reason: string|null }}
 */
export function allowCommitOnBranch(branch, opts = {}) {
  if (opts.allow) return { ok: true, reason: null };
  if (branch === PROTECTED_BASE) {
    return {
      ok: false,
      reason: `HEAD == ${PROTECTED_BASE}: коммит/отправка из main запрещены (мимо заявки). Обход: ALLOW_MAIN_COMMIT=1`,
    };
  }
  return { ok: true, reason: null };
}
