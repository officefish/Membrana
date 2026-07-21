/**
 * repo-branches-decompose — 7 hygiene-категорий веток (first match wins).
 *
 * Чистые правила без git/gh/fs — тесты на фикстурах.
 * Инвентарь ahead/behind берётся из scripts/lib/repo-branches.mjs (не reimplement rev-list).
 */
import { classifyBucket, formatMarkdownTable } from './repo-branches.mjs';

/** @typedef {'worktree-active'|'personas'|'baseline'|'in-flight'|'experiment-leftover'|'zombie'|'salvage'} HygieneCategory */

/** Персоны (канон сессии; не путать с полным PROTECTED_BRANCHES в repo-clean). */
export const PERSONA_BRANCHES = new Set(['ozhegov', 'dynin', 'vesnin', 'boyarskiy']);

export const HYGIENE_CATEGORY_ORDER = /** @type {const} */ ([
  'worktree-active',
  'personas',
  'baseline',
  'in-flight',
  'experiment-leftover',
  'zombie',
  'salvage',
]);

/** @type {Record<HygieneCategory, { title: string; priority: number; blurb: string }>} */
export const HYGIENE_META = {
  'worktree-active': {
    title: '1. Worktree-активные',
    priority: 1,
    blurb: 'Worktree=yes или текущая ветка сессии — не трогать.',
  },
  personas: {
    title: '2. Персоны',
    priority: 2,
    blurb: 'ozhegov / dynin / vesnin / boyarskiy — никогда не auto-delete.',
  },
  baseline: {
    title: '3. Baseline / sync-якоря',
    priority: 3,
    blurb: '`main` или `base/*` — якоря синхронизации.',
  },
  'in-flight': {
    title: '4. Доставка в полёте',
    priority: 4,
    blurb: 'Head открытого GitHub PR (нужен `gh`; иначе категория пуста).',
  },
  'experiment-leftover': {
    title: '5. Эксперимент leftover',
    priority: 5,
    blurb: 'Префиксы cowork/ comp/ codex/ night/ + parallel-persona* + chore/ritual-day*.',
  },
  zombie: {
    title: '6. Застой / zombie',
    priority: 6,
    blurb: 'ahead==0 vs origin/main, либо remote night-triage/claude без open PR.',
  },
  salvage: {
    title: '7. Salvage',
    priority: 7,
    blurb: 'Остаток с ahead>0 и без open PR — спасти коммиты до чистки.',
  },
};

/**
 * Имя без `origin/` для сопоставления local/remote twins и PR headRefName.
 * @param {string} name
 */
export function shortBranchName(name) {
  return String(name ?? '').replace(/^origin\//, '');
}

/**
 * @param {string} shortName
 */
export function isExperimentLeftover(shortName) {
  const n = String(shortName ?? '');
  if (
    n.startsWith('cowork/') ||
    n.startsWith('comp/') ||
    n.startsWith('codex/') ||
    n.startsWith('night/')
  ) {
    return true;
  }
  if (n.startsWith('parallel-persona')) return true;
  if (n.startsWith('chore/ritual-day')) return true;
  return false;
}

/**
 * Remote agent-zombie patterns (category 6, remotes only).
 * @param {string} shortName
 */
export function isRemoteAgentZombie(shortName) {
  const n = String(shortName ?? '');
  return n.startsWith('night-triage') || n.startsWith('claude/') || n === 'claude';
}

/**
 * Классификация одной ветки. First match wins (порядок 1→7).
 *
 * @param {object} branch
 * @param {string} branch.name
 * @param {number} [branch.ahead]
 * @param {number} [branch.behind]
 * @param {boolean} [branch.current]
 * @param {boolean} [branch.worktree]
 * @param {'local'|'remote'} [branch.scope]
 * @param {object} [ctx]
 * @param {Map<string, {number:number}>} [ctx.openPrByHead] — key = short branch name
 * @param {string} [ctx.currentBranch]
 * @returns {{
 *   category: HygieneCategory,
 *   why: string,
 *   action: string,
 *   prNumber: number|null,
 *   shortName: string,
 *   bucket: string,
 * }}
 */
export function classifyHygieneCategory(branch, ctx = {}) {
  const shortName = shortBranchName(branch.name);
  const ahead = Number(branch.ahead) || 0;
  const behind = Number(branch.behind) || 0;
  const bucket = classifyBucket(ahead, behind);
  const scope =
    branch.scope ?? (String(branch.name).startsWith('origin/') ? 'remote' : 'local');
  const openPrByHead = ctx.openPrByHead ?? new Map();
  const currentBranch = ctx.currentBranch ?? '';

  const isCurrent =
    Boolean(branch.current) || (currentBranch !== '' && shortName === currentBranch);

  if (Boolean(branch.worktree) || isCurrent) {
    return {
      category: 'worktree-active',
      why: branch.worktree && isCurrent ? 'worktree + current' : branch.worktree ? 'worktree=yes' : 'current branch',
      action: 'keep — active',
      prNumber: null,
      shortName,
      bucket,
    };
  }

  if (PERSONA_BRANCHES.has(shortName)) {
    return {
      category: 'personas',
      why: 'persona branch (canon)',
      action: 'never auto-delete',
      prNumber: null,
      shortName,
      bucket,
    };
  }

  if (shortName === 'main' || shortName.startsWith('base/')) {
    return {
      category: 'baseline',
      why: shortName === 'main' ? 'main baseline' : 'base/* sync anchor',
      action: 'keep — anchor',
      prNumber: null,
      shortName,
      bucket,
    };
  }

  const pr = openPrByHead.get(shortName);
  if (pr && pr.number != null) {
    return {
      category: 'in-flight',
      why: `open PR #${pr.number}`,
      action: 'wait PR',
      prNumber: Number(pr.number) || null,
      shortName,
      bucket,
    };
  }

  if (isExperimentLeftover(shortName)) {
    return {
      category: 'experiment-leftover',
      why: 'experiment/ritual leftover prefix',
      action: 'review leftover',
      prNumber: null,
      shortName,
      bucket,
    };
  }

  if (ahead === 0) {
    return {
      category: 'zombie',
      why: behind > 0 ? 'ahead==0 behind-only' : 'ahead==0 sync/stale',
      action: 'repo:clean? after human ok',
      prNumber: null,
      shortName,
      bucket,
    };
  }

  if (scope === 'remote' && isRemoteAgentZombie(shortName)) {
    return {
      category: 'zombie',
      why: 'remote night-triage/claude without open PR',
      action: 'repo:clean? after human ok',
      prNumber: null,
      shortName,
      bucket,
    };
  }

  return {
    category: 'salvage',
    why: 'ahead>0, no open PR',
    action: 'salvage commits first',
    prNumber: null,
    shortName,
    bucket,
  };
}

/**
 * @param {{category: HygieneCategory, behind?: number, ahead?: number, prNumber?: number|null, name: string}} a
 * @param {{category: HygieneCategory, behind?: number, ahead?: number, prNumber?: number|null, name: string}} b
 * @param {HygieneCategory} category
 */
export function compareHygieneRows(a, b, category) {
  if (category === 'in-flight') {
    const d = (Number(b.prNumber) || 0) - (Number(a.prNumber) || 0);
    if (d !== 0) return d;
    return String(a.name).localeCompare(String(b.name));
  }
  if (category === 'salvage') {
    const d = (Number(b.ahead) || 0) - (Number(a.ahead) || 0);
    if (d !== 0) return d;
    return String(a.name).localeCompare(String(b.name));
  }
  const d = (Number(b.behind) || 0) - (Number(a.behind) || 0);
  if (d !== 0) return d;
  return String(a.name).localeCompare(String(b.name));
}

/**
 * Разложить inventory по 7 категориям. Remote twin с локальным тезкой не дублируется.
 *
 * @param {object} inventory
 * @param {{name:string, ahead:number, behind:number, current?:boolean, worktree?:boolean}[]} inventory.local
 * @param {{name:string, ahead:number, behind:number, worktree?:boolean}[]} inventory.remote
 * @param {string} [inventory.currentBranch]
 * @param {object} [opts]
 * @param {Map<string, {number:number}>} [opts.openPrByHead]
 * @param {boolean} [opts.ghAvailable]
 * @returns {{
 *   rows: object[],
 *   byCategory: Record<HygieneCategory, object[]>,
 *   counts: Record<HygieneCategory, {local: number, remote: number, total: number}>,
 *   skippedRemoteTwins: number,
 * }}
 */
export function decomposeBranches(inventory, opts = {}) {
  const openPrByHead = opts.openPrByHead ?? new Map();
  const currentBranch = inventory.currentBranch ?? '';
  const localNames = new Set((inventory.local ?? []).map((r) => shortBranchName(r.name)));

  /** @type {object[]} */
  const rows = [];

  for (const r of inventory.local ?? []) {
    const classified = classifyHygieneCategory(
      { ...r, scope: 'local' },
      { openPrByHead, currentBranch },
    );
    rows.push({
      ...r,
      scope: 'local',
      ...classified,
    });
  }

  let skippedRemoteTwins = 0;
  for (const r of inventory.remote ?? []) {
    const short = shortBranchName(r.name);
    if (localNames.has(short)) {
      skippedRemoteTwins += 1;
      continue;
    }
    const classified = classifyHygieneCategory(
      { ...r, scope: 'remote' },
      { openPrByHead, currentBranch },
    );
    rows.push({
      ...r,
      scope: 'remote',
      ...classified,
    });
  }

  /** @type {Record<HygieneCategory, object[]>} */
  const byCategory = {
    'worktree-active': [],
    personas: [],
    baseline: [],
    'in-flight': [],
    'experiment-leftover': [],
    zombie: [],
    salvage: [],
  };

  for (const row of rows) {
    byCategory[/** @type {HygieneCategory} */ (row.category)].push(row);
  }

  for (const cat of HYGIENE_CATEGORY_ORDER) {
    byCategory[cat].sort((a, b) => compareHygieneRows(a, b, cat));
  }

  /** @type {Record<HygieneCategory, {local: number, remote: number, total: number}>} */
  const counts = /** @type {any} */ ({});
  for (const cat of HYGIENE_CATEGORY_ORDER) {
    const list = byCategory[cat];
    const local = list.filter((r) => r.scope === 'local').length;
    const remote = list.filter((r) => r.scope === 'remote').length;
    counts[cat] = { local, remote, total: list.length };
  }

  return { rows, byCategory, counts, skippedRemoteTwins };
}

/**
 * @param {object} opts
 * @param {string} [opts.base]
 * @param {string} [opts.currentBranch]
 * @param {boolean} [opts.fetched]
 * @param {boolean} [opts.ghAvailable]
 * @param {string} [opts.ghNote]
 * @param {ReturnType<typeof decomposeBranches>} opts.decomposition
 */
export function renderHygieneDecompose({
  base = 'origin/main',
  currentBranch = '',
  fetched = false,
  ghAvailable = true,
  ghNote = '',
  decomposition,
} = {}) {
  const { byCategory, counts, skippedRemoteTwins } = decomposition;

  const taxonomyLines = [
    '# repo:branches:decompose — 7 hygiene categories',
    '',
    `base: ${base} · fetch: ${fetched ? 'yes' : 'skipped (--no-fetch)'} · current: ${currentBranch || '(detached)'} · gh open-PR: ${ghAvailable ? 'yes' : 'unavailable'}`,
    '',
    '## Taxonomy (first match wins)',
    '',
    '| # | Category | Rule |',
    '| --- | --- | --- |',
    ...HYGIENE_CATEGORY_ORDER.map((id) => {
      const m = HYGIENE_META[id];
      return `| ${m.priority} | ${m.title.replace(/^\d+\.\s*/, '')} | ${m.blurb} |`;
    }),
    '',
    'Sort: default behind DESC · cat.4 PR# DESC · cat.7 ahead DESC.',
    'Remote twin skipped when local exists (no double-count).',
    'Not for auto-delete. Personas never auto-delete. Use `yarn repo:clean` only after human ok.',
    '',
  ];

  if (!ghAvailable) {
    taxonomyLines.push(
      `> **Note:** \`gh\` unavailable — category 4 empty; open-PR heads fall through to 5/6/7 by other rules.${ghNote ? ` (${ghNote})` : ''}`,
      '',
    );
  }

  if (skippedRemoteTwins > 0) {
    taxonomyLines.push(
      `_Skipped remote twins with local counterpart: ${skippedRemoteTwins}_`,
      '',
    );
  }

  const summaryTable = formatMarkdownTable(
    ['Category', 'Local', 'Remote', 'Total'],
    HYGIENE_CATEGORY_ORDER.map((id) => {
      const c = counts[id];
      return [HYGIENE_META[id].title, String(c.local), String(c.remote), String(c.total)];
    }),
  );

  const sectionLines = [
    '## Summary',
    '',
    summaryTable,
    '',
  ];

  for (const id of HYGIENE_CATEGORY_ORDER) {
    const meta = HYGIENE_META[id];
    const list = byCategory[id];
    sectionLines.push(`## ${meta.title}`, '', meta.blurb, '');
    if (!list.length) {
      sectionLines.push('_none_', '');
      continue;
    }
    const table = formatMarkdownTable(
      ['Branch', 'Ahead', 'Behind', 'Bucket', 'Why/Note', 'Suggested action'],
      list.map((r) => [
        r.name,
        String(r.ahead),
        String(r.behind),
        r.bucket,
        r.why,
        r.action,
      ]),
    );
    sectionLines.push(table, '');
  }

  return [...taxonomyLines, ...sectionLines].join('\n');
}

/**
 * @param {string[]} argv
 */
export function parseDecomposeCli(argv) {
  const reportIndex = argv.indexOf('--report');
  return {
    noFetch: argv.includes('--no-fetch'),
    json: argv.includes('--json'),
    report: reportIndex > -1 ? argv[reportIndex + 1] : null,
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

export const DECOMPOSE_HELP = `Usage: yarn repo:branches:decompose [--no-fetch] [--json] [--report <file>]

  Decompose local + origin/* branches into 7 mutually exclusive hygiene categories
  (first match wins). Reuses yarn repo:branches inventory (ahead/behind/worktree).

  Default: git fetch origin, then print markdown tables to stdout.
  --no-fetch       skip fetch (use existing remote-tracking refs)
  --json           machine-readable JSON instead of markdown
  --report <file>  also write full report to disk (console still prints)
  --help           this text

  Categories: worktree-active → personas → baseline → in-flight (open PR) →
  experiment-leftover → zombie → salvage.

  If gh is missing/unavailable, category 4 stays empty and those heads fall through.
  Does NOT delete branches. Sibling: yarn repo:branches (inventory), yarn repo:clean
  (delete by PR state — only after human ok).`;
