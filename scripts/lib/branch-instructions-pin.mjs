/**
 * PINNED_SUBGRAPH audit for git-branch Mintlify instructions (#828).
 * Manifest: path → git blob SHA (git hash-object). No file copies.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** @typedef {{ path: string, expected: string, actual: string | null, status: 'ok' | 'missing' | 'drift' }} PinRow */

export const MANIFEST_REL =
  'docs/audit/git/pins/branch-instructions.manifest.json';

/**
 * @param {string} repoRoot
 * @param {string} relPath
 * @returns {string}
 */
export function hashObject(repoRoot, relPath) {
  const abs = resolve(repoRoot, relPath);
  return execFileSync('git', ['hash-object', abs], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
}

/**
 * @param {string} repoRoot
 * @param {string} [manifestRel]
 */
export function loadManifest(repoRoot, manifestRel = MANIFEST_REL) {
  const abs = resolve(repoRoot, manifestRel);
  if (!existsSync(abs)) {
    throw new Error(`manifest missing: ${manifestRel}`);
  }
  return JSON.parse(readFileSync(abs, 'utf8'));
}

/**
 * @param {object} manifest
 * @param {string} repoRoot
 * @returns {PinRow[]}
 */
export function auditPin(manifest, repoRoot) {
  const nodes = manifest.nodes ?? {};
  /** @type {PinRow[]} */
  const rows = [];
  for (const [path, expected] of Object.entries(nodes)) {
    const abs = resolve(repoRoot, path);
    if (!existsSync(abs)) {
      rows.push({ path, expected, actual: null, status: 'missing' });
      continue;
    }
    const actual = hashObject(repoRoot, path);
    rows.push({
      path,
      expected,
      actual,
      status: actual === expected ? 'ok' : 'drift',
    });
  }
  return rows;
}

/**
 * Refresh expected SHAs from working tree (intentional pin update).
 * @param {object} manifest
 * @param {string} repoRoot
 */
export function refreshManifestShas(manifest, repoRoot) {
  const next = structuredClone(manifest);
  next.nodes = next.nodes ?? {};
  for (const path of Object.keys(next.nodes)) {
    if (!existsSync(resolve(repoRoot, path))) {
      throw new Error(`cannot refresh missing path: ${path}`);
    }
    next.nodes[path] = hashObject(repoRoot, path);
  }
  next.pinnedAt = new Date().toISOString().slice(0, 10);
  return next;
}

/**
 * @param {PinRow[]} rows
 * @returns {string}
 */
export function formatAuditTable(rows) {
  const lines = [
    '| status | path | expected | actual |',
    '|--------|------|----------|--------|',
  ];
  for (const r of rows) {
    const act = r.actual ?? '—';
    const exp = r.expected.slice(0, 12);
    const a = act === '—' ? '—' : act.slice(0, 12);
    lines.push(`| ${r.status} | \`${r.path}\` | \`${exp}\` | \`${a}\` |`);
  }
  return lines.join('\n');
}

/**
 * @param {PinRow[]} rows
 */
export function auditSummary(rows) {
  const ok = rows.filter((r) => r.status === 'ok').length;
  const drift = rows.filter((r) => r.status === 'drift').length;
  const missing = rows.filter((r) => r.status === 'missing').length;
  return { ok, drift, missing, total: rows.length, clean: drift === 0 && missing === 0 };
}

/**
 * @param {string} repoRoot
 * @param {object} manifest
 * @param {string} [manifestRel]
 */
export function writeManifest(repoRoot, manifest, manifestRel = MANIFEST_REL) {
  const abs = resolve(repoRoot, manifestRel);
  writeFileSync(abs, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
