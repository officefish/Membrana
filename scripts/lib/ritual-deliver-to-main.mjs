/**
 * ritual-deliver-to-main — финальный кадр утра: утренние документы на origin/main.
 * Канон: frame-rails #1016, MANIFEST ritual-day frames deliver-to-main.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readDated } from './read-dated.mjs';
import {
  MORNING_DELIVER_ARTIFACTS,
  morningDeliverPaths,
} from './ritual-morning-artifacts.mjs';

export const DELIVER_FRAME_ID = 'deliver-to-main';

export { MORNING_DELIVER_ARTIFACTS, morningDeliverPaths };

/**
 * @param {string} repoRoot
 * @returns {{ frame: object|null, problems: string[] }}
 */
export function loadDeliverFrame(repoRoot) {
  const manifestPath = join(repoRoot, 'docs/procedures/ritual-day/MANIFEST.json');
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    return { frame: null, problems: [`MANIFEST ritual-day: ${e instanceof Error ? e.message : String(e)}`] };
  }
  const frames = Array.isArray(manifest.frames) ? manifest.frames : [];
  const frame = frames.find((f) => f && f.id === DELIVER_FRAME_ID) ?? null;
  if (!frame) {
    return { frame: null, problems: [`frames: нет кадра ${DELIVER_FRAME_ID}`] };
  }
  return { frame, problems: [] };
}

/**
 * @typedef {'ok' | 'missing-local' | 'stale' | 'missing-on-main' | 'drift-from-main'} ArtifactDeliverStatus
 */

/**
 * @typedef {{ rel: string, label: string, status: ArtifactDeliverStatus, why?: string }} ArtifactDeliverReport
 */

/**
 * @param {string} repoRoot
 * @param {string} rel
 * @param {string} today ISO date YYYY-MM-DD
 * @param {{ readRemote?: (rel: string) => string|null }} [deps]
 * @returns {ArtifactDeliverReport}
 */
export function checkArtifactDeliver(repoRoot, rel, today, deps = {}) {
  const label =
    MORNING_DELIVER_ARTIFACTS.find((a) => a.rel === rel)?.label ?? rel;
  const fresh = readDated(rel, { today, maxAgeDays: 0, root: repoRoot, label });
  if (!fresh.ok) {
    const status = fresh.content === null ? 'missing-local' : 'stale';
    return { rel, label, status, why: fresh.why ?? undefined };
  }
  const localContent = fresh.content ?? '';
  const readRemote =
    deps.readRemote ??
    (() => {
      return null;
    });
  let remoteContent;
  try {
    remoteContent = readRemote(rel);
  } catch {
    remoteContent = null;
  }
  if (remoteContent === null) {
    return { rel, label, status: 'missing-on-main', why: `${label}: нет на origin/main` };
  }
  if (localContent !== remoteContent) {
    return {
      rel,
      label,
      status: 'drift-from-main',
      why: `${label}: локальная копия ≠ origin/main`,
    };
  }
  return { rel, label, status: 'ok' };
}

/**
 * @param {string} repoRoot
 * @param {{ today?: string, readRemote?: (rel: string) => string|null }} [opts]
 * @returns {{ ok: boolean, reports: ArtifactDeliverReport[], pending: string[] }}
 */
export function verifyDeliverOnMain(repoRoot, opts = {}) {
  const today =
    opts.today ??
    new Date().toISOString().slice(0, 10);
  /** @type {ArtifactDeliverReport[]} */
  const reports = [];
  for (const { rel } of MORNING_DELIVER_ARTIFACTS) {
    reports.push(checkArtifactDeliver(repoRoot, rel, today, opts));
  }
  const pending = reports.filter((r) => r.status !== 'ok').map((r) => r.rel);
  return { ok: pending.length === 0, reports, pending };
}

/**
 * @param {string[]} pending
 * @returns {{ mode: 'noop' | 'pr:ship', paths: string[], branchHint: string }}
 */
export function planDeliver(pending) {
  if (!pending.length) {
    return { mode: 'noop', paths: [], branchHint: '' };
  }
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return {
    mode: 'pr:ship',
    paths: [...pending],
    branchHint: `angelina/chore/ritual-day-${date}`,
  };
}

/**
 * @param {string} repoRoot
 * @param {{ today?: string, readRemote?: (rel: string) => string|null, log?: (s: string) => void }} [opts]
 * @returns {number} exit code
 */
export function runDeliverGate(repoRoot, opts = {}) {
  const log = opts.log ?? console.log;
  const { frame, problems } = loadDeliverFrame(repoRoot);
  log(`→ ${DELIVER_FRAME_ID} (frames${frame ? ` · holder ${frame.holder ?? '?'}` : ''})`);
  if (problems.length) {
    for (const p of problems) log(`  ✗ ${p}`);
    log(`✗ ${DELIVER_FRAME_ID}: STOP — нет кадра в MANIFEST`);
    return 2;
  }
  const v = verifyDeliverOnMain(repoRoot, opts);
  for (const r of v.reports) {
    if (r.status === 'ok') {
      log(`  ✓ ${r.label} — на origin/main`);
    } else {
      log(`  ✗ ${r.label} — ${r.status}${r.why ? `: ${r.why}` : ''}`);
    }
  }
  if (v.ok) {
    log(`✓ ${DELIVER_FRAME_ID}: утренние документы на main`);
    return 0;
  }
  const plan = planDeliver(v.pending);
  log(`✗ ${DELIVER_FRAME_ID}: STOP — не на main (${v.pending.join(', ')})`);
  log(`  план: ${plan.mode} paths=[${plan.paths.join(', ')}] branch≈${plan.branchHint}`);
  log('  утро не завершено для соседей, пока документы не в main (#1016)');
  return 2;
}
