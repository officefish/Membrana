/**
 * Утренний land-каскад night-triage docs-report PR (Night Build format v2).
 * Чистая классификация / порядок — без gh. CLI: scripts/night-land-reports.mjs.
 *
 * Allowlist: ровно один ADDED файл под docs/reports/night-triage/**
 * Title: ~ Night triage. Merge: oldest-first после gh pr ready.
 */

/** @typedef {{ path: string, status: string }} PrFile */
/**
 * @typedef {{
 *   number: number,
 *   title: string,
 *   createdAt: string,
 *   isDraft?: boolean,
 *   files?: PrFile[],
 * }} LandPrInput
 */
/**
 * @typedef {{
 *   number: number,
 *   title: string,
 *   createdAt: string,
 *   isDraft: boolean,
 *   eligible: boolean,
 *   reason: string,
 *   files: PrFile[],
 * }} LandPrClassified
 */

export const LAND_ALLOWLIST_PREFIX = 'docs/reports/night-triage/';
/** Title ~ Night triage / night-triage (пробел или дефис между словами). */
export const NIGHT_TRIAGE_TITLE_RE = /night[\s-]*triage/iu;

/**
 * @param {string} title
 * @returns {boolean}
 */
export function isNightTriageTitle(title) {
  return NIGHT_TRIAGE_TITLE_RE.test(String(title ?? ''));
}

/**
 * Path под allowlist (prefix + не пустой хвост, без `..`).
 * @param {string} filePath
 * @returns {boolean}
 */
export function isAllowlistedLandPath(filePath) {
  const p = String(filePath ?? '').replace(/\\/g, '/');
  if (!p.startsWith(LAND_ALLOWLIST_PREFIX)) return false;
  const rest = p.slice(LAND_ALLOWLIST_PREFIX.length);
  if (!rest || rest.includes('..')) return false;
  return true;
}

/**
 * Классификация одного open PR для land-каскада.
 * @param {LandPrInput} pr
 * @returns {LandPrClassified}
 */
export function classifyLandReportPr(pr) {
  const number = Number(pr?.number);
  const title = String(pr?.title ?? '');
  const createdAt = String(pr?.createdAt ?? '');
  const isDraft = Boolean(pr?.isDraft);
  const files = Array.isArray(pr?.files) ? pr.files.map((f) => ({
    path: String(f.path ?? f.filename ?? ''),
    status: String(f.status ?? '').toLowerCase(),
  })) : [];

  /** @type {LandPrClassified} */
  const base = { number, title, createdAt, isDraft, eligible: false, reason: '', files };

  if (!Number.isFinite(number) || number <= 0) {
    return { ...base, reason: 'invalid-number' };
  }
  if (!isNightTriageTitle(title)) {
    return { ...base, reason: 'title-not-night-triage' };
  }
  if (files.length === 0) {
    return { ...base, reason: 'no-files' };
  }
  if (files.length !== 1) {
    return { ...base, reason: `multi-file(${files.length})` };
  }
  const only = files[0];
  if (!isAllowlistedLandPath(only.path)) {
    return { ...base, reason: `path-outside-allowlist:${only.path}` };
  }
  if (only.status !== 'added') {
    return { ...base, reason: `not-added:${only.status || 'unknown'}` };
  }

  return { ...base, eligible: true, reason: 'ok' };
}

/**
 * Eligible oldest-first по createdAt (ISO); при равных — по number.
 * @param {LandPrClassified[]} classified
 * @returns {LandPrClassified[]}
 */
export function orderLandReportPrs(classified) {
  return [...classified]
    .filter((c) => c.eligible)
    .sort((a, b) => {
      const ta = Date.parse(a.createdAt) || 0;
      const tb = Date.parse(b.createdAt) || 0;
      if (ta !== tb) return ta - tb;
      return a.number - b.number;
    });
}

/**
 * План каскада: eligible (ordered) + skipped + шаги ready/merge.
 * Без --execute шаги только описываются (dry-run).
 * @param {LandPrInput[]} prs
 * @param {{ execute?: boolean }} [opts]
 */
export function planLandReports(prs, opts = {}) {
  const execute = Boolean(opts.execute);
  const classified = (prs ?? []).map(classifyLandReportPr);
  const eligible = orderLandReportPrs(classified);
  const skipped = classified.filter((c) => !c.eligible);
  const steps = eligible.flatMap((pr) => {
    /** @type {{op: string, pr: number, note: string}[]} */
    const s = [];
    if (pr.isDraft) {
      s.push({ op: 'ready', pr: pr.number, note: 'gh pr ready (draft → reviewable)' });
    }
    s.push({ op: 'squash-merge', pr: pr.number, note: 'gh pr merge --squash' });
    return s;
  });
  return { execute, dryRun: !execute, eligible, skipped, steps };
}
