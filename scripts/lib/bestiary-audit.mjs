/**
 * Аудит покрытия бестиария specimen’ами (B2 / #881).
 * Источник классов — BESTIARY в lens-bestiary; хранилище — docs/audit/bestiary/specimens/.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { aimBestiary, BESTIARY } from './lens-bestiary.mjs';

/** Ruleset для самопроверки: все экспорты/артефакты — «сироты». */
export const ORPHAN_RULESET = {
  consumersOf: () => 0,
  readersOf: () => 0,
};

/**
 * @param {string} specimensRoot abs path docs/audit/bestiary/specimens
 * @param {string} defectClass
 * @returns {string[]} abs paths of specimen source files
 */
export function listSpecimenFiles(specimensRoot, defectClass) {
  const dir = join(specimensRoot, defectClass);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => /\.(mjs|js|cjs|ts)$/.test(n))
    .map((n) => join(dir, n));
}

/**
 * @param {string} repoRoot
 * @param {{ruleset?: {consumersOf:(n:string)=>number, readersOf:(a:string)=>number}}} [opts]
 */
export function auditSpecimenCoverage(repoRoot, opts = {}) {
  const ruleset = opts.ruleset ?? ORPHAN_RULESET;
  const specimensRoot = join(repoRoot, 'docs', 'audit', 'bestiary', 'specimens');
  const rows = [];
  const allFindings = [];

  for (const beast of BESTIARY) {
    const files = listSpecimenFiles(specimensRoot, beast.defectClass);
    const objects = files.map((abs) => ({
      path: relative(repoRoot, abs).replace(/\\/g, '/'),
      text: readFileSync(abs, 'utf8'),
    }));
    const { findings } = objects.length
      ? aimBestiary(objects, ruleset)
      : { findings: [] };
    const classHits = findings.filter((f) => f.defectClass === beast.defectClass);
    allFindings.push(...classHits);
    rows.push({
      defectClass: beast.defectClass,
      label: beast.label,
      specimenFiles: objects.map((o) => o.path),
      hits: classHits.length,
      covered: classHits.length > 0,
      findings: classHits,
    });
  }

  const uncovered = rows.filter((r) => !r.covered);
  return {
    rows,
    findings: allFindings,
    uncovered,
    ok: uncovered.length === 0,
    specimensRoot: relative(repoRoot, specimensRoot).replace(/\\/g, '/'),
  };
}

/**
 * @param {ReturnType<typeof auditSpecimenCoverage>} report
 * @param {{date?: string, headSha?: string}} meta
 */
export function formatBestiaryListMarkdown(report, meta = {}) {
  const date = meta.date ?? new Date().toISOString().slice(0, 10);
  const sha = meta.headSha ?? '—';
  const lines = [
    '# BESTIARY_LIST — реестр классов бестиария',
    '',
    '## Meta',
    '',
    '| Field | Value |',
    '|-------|-------|',
    `| Date | ${date} |`,
    `| Head SHA | ${sha} |`,
    '| Source | yarn bestiary:audit |',
    '| Engines | `scripts/lib/lens-bestiary.mjs` |',
    '',
    '## Summary',
    '',
    '| defectClass | Label | Specimen files | Hits | Self-check |',
    '|-------------|-------|----------------|:----:|------------|',
  ];
  for (const r of report.rows) {
    const files = r.specimenFiles.length ? r.specimenFiles.map((f) => `\`${f}\``).join(', ') : '—';
    const check = r.covered ? '✅' : '❌';
    lines.push(`| \`${r.defectClass}\` | ${r.label} | ${files} | ${r.hits} | ${check} |`);
  }
  const covered = report.rows.filter((r) => r.covered).length;
  lines.push('');
  lines.push(`**Покрытие:** ${covered}/${report.rows.length}.`);
  if (!report.ok) {
    lines.push('');
    lines.push('## Uncovered');
    lines.push('');
    for (const u of report.uncovered) {
      lines.push(`- \`${u.defectClass}\` (${u.label}) — нет findings на specimens/`);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

/**
 * @param {string} repoRoot
 * @param {ReturnType<typeof auditSpecimenCoverage>} report
 * @param {{date?: string, headSha?: string}} meta
 */
export function writeBestiaryList(repoRoot, report, meta = {}) {
  const dir = join(repoRoot, 'docs', 'audit', 'bestiary', 'registry');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'BESTIARY_LIST.md');
  writeFileSync(path, formatBestiaryListMarkdown(report, meta), 'utf8');
  return path;
}
