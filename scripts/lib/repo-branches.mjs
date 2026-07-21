/**
 * repo-branches — чистые правила инвентаря веток vs origin/main.
 *
 * ahead  = rev-list --count origin/main..BRANCH
 * behind = rev-list --count BRANCH..origin/main
 *
 * НЕ использовать git branch --merged: squash-мёрж врёт (#492).
 * Здесь только чистые функции (без git/fs) — тесты на фикстурах.
 */

/** @typedef {'sync'|'ahead-only'|'behind-only'|'diverged'} BranchBucket */

/**
 * Remote-tracking ref для инвентаря: `origin/<name>`, без bare `origin` и без HEAD.
 * @param {string} ref
 */
export function isOriginTrackingRef(ref) {
  return /^origin\/.+/.test(ref) && ref !== 'origin/HEAD' && !ref.endsWith('/HEAD');
}

/**
 * Классификация ветки по ahead/behind относительно базы.
 * @param {number} ahead
 * @param {number} behind
 * @returns {BranchBucket}
 */
export function classifyBucket(ahead = 0, behind = 0) {
  const a = Number(ahead) || 0;
  const b = Number(behind) || 0;
  if (a === 0 && b === 0) return 'sync';
  if (a > 0 && b === 0) return 'ahead-only';
  if (a === 0 && b > 0) return 'behind-only';
  return 'diverged';
}

const BUCKET_ORDER = {
  diverged: 0,
  'behind-only': 1,
  'ahead-only': 2,
  sync: 3,
};

/**
 * @param {{ahead:number, behind:number, name:string}} a
 * @param {{ahead:number, behind:number, name:string}} b
 */
export function compareBranchRows(a, b) {
  const ba = classifyBucket(a.ahead, a.behind);
  const bb = classifyBucket(b.ahead, b.behind);
  const d = BUCKET_ORDER[ba] - BUCKET_ORDER[bb];
  if (d !== 0) return d;
  const drift = b.ahead + b.behind - (a.ahead + a.behind);
  if (drift !== 0) return drift;
  return String(a.name).localeCompare(String(b.name));
}

/**
 * Markdown-таблица. Ячейки экранируют `|`.
 * @param {string[]} headers
 * @param {string[][]} rows
 */
export function formatMarkdownTable(headers, rows) {
  const esc = (cell) => String(cell ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const head = `| ${headers.map(esc).join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.map(esc).join(' | ')} |`);
  return [head, sep, ...body].join('\n');
}

/**
 * Сводка по бакетам.
 * @param {{ahead:number, behind:number}[]} rows
 * @returns {Record<BranchBucket, number>}
 */
export function summarizeBuckets(rows) {
  /** @type {Record<BranchBucket, number>} */
  const out = { sync: 0, 'ahead-only': 0, 'behind-only': 0, diverged: 0 };
  for (const r of rows) {
    out[classifyBucket(r.ahead, r.behind)] += 1;
  }
  return out;
}

/**
 * @param {object} opts
 * @param {string} [opts.base]
 * @param {string} [opts.currentBranch]
 * @param {boolean} [opts.fetched]
 * @param {{name:string, ahead:number, behind:number, current?:boolean, worktree?:boolean}[]} opts.local
 * @param {{name:string, ahead:number, behind:number, worktree?:boolean}[]} opts.remote
 * @returns {string}
 */
export function renderBranchAudit({
  base = 'origin/main',
  currentBranch = '',
  fetched = false,
  local = [],
  remote = [],
} = {}) {
  const localSorted = [...local].sort(compareBranchRows);
  const remoteSorted = [...remote].sort(compareBranchRows);
  const localBuckets = summarizeBuckets(localSorted);
  const remoteBuckets = summarizeBuckets(remoteSorted);

  const yesNo = (v) => (v ? 'yes' : '');

  const localTable = formatMarkdownTable(
    ['Branch', 'Ahead', 'Behind', 'Bucket', 'Current', 'Worktree'],
    localSorted.map((r) => [
      r.name,
      String(r.ahead),
      String(r.behind),
      classifyBucket(r.ahead, r.behind),
      yesNo(r.current),
      yesNo(r.worktree),
    ]),
  );

  const remoteTable = formatMarkdownTable(
    ['Branch', 'Ahead', 'Behind', 'Bucket', 'Worktree'],
    remoteSorted.map((r) => [
      r.name,
      String(r.ahead),
      String(r.behind),
      classifyBucket(r.ahead, r.behind),
      yesNo(r.worktree),
    ]),
  );

  const bucketKeys = /** @type {BranchBucket[]} */ (['sync', 'ahead-only', 'behind-only', 'diverged']);
  const summaryTable = formatMarkdownTable(
    ['Bucket', 'Local', 'Remote'],
    bucketKeys.map((k) => [k, String(localBuckets[k]), String(remoteBuckets[k])]),
  );

  const lines = [
    `# repo:branches — inventory vs ${base}`,
    '',
    `fetch: ${fetched ? 'yes' : 'skipped (--no-fetch)'} · current: ${currentBranch || '(detached)'} · local: ${localSorted.length} · remote: ${remoteSorted.length}`,
    '',
    'ahead = `rev-list --count origin/main..BRANCH` · behind = `rev-list --count BRANCH..origin/main`',
    '',
    'Do **not** use `git branch --merged` (squash lies). Persona branches are never auto-deleted — see `yarn repo:clean`.',
    '',
    '## Local branches',
    '',
    localSorted.length ? localTable : '_no local branches_',
    '',
    '## Remote origin/*',
    '',
    remoteSorted.length ? remoteTable : '_no remote branches_',
    '',
    '## Buckets summary',
    '',
    summaryTable,
    '',
  ];
  return lines.join('\n');
}

/**
 * @param {string[]} argv
 */
export function parseCli(argv) {
  const reportIndex = argv.indexOf('--report');
  return {
    noFetch: argv.includes('--no-fetch'),
    json: argv.includes('--json'),
    report: reportIndex > -1 ? argv[reportIndex + 1] : null,
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

export const HELP = `Usage: yarn repo:branches [--no-fetch] [--json] [--report <file>]

  Inventory of local + origin/* branches vs origin/main (ahead/behind tables).

  Default: git fetch origin, then print markdown tables to stdout.
  --no-fetch       skip fetch (use existing remote-tracking refs)
  --json           machine-readable JSON instead of markdown
  --report <file>  also write full report to disk (console still prints)
  --help           this text

  Buckets: sync (0/0), ahead-only, behind-only, diverged.
  Does NOT use git branch --merged (squash-merge lies).
  Sibling: yarn repo:clean (delete by PR state), yarn neighbors (session awareness).`;
