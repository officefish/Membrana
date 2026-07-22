/**
 * morning-wiring — preflight-гейт дверей утра (procedure-frames F3 / #929).
 *
 * Канон: m3 + ritual-day-frames M2 — кадр в `preflight`, holder ozhegov;
 * аудит через единое ядро `auditPins` (F2). missing = STOP; drift/ambiguous —
 * сигнальные (не блокируют старт цепочки).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  auditPins,
  formatPinAuditTable,
  makeAnchorResolveSegment,
} from './audit-pins.mjs';

export const MORNING_WIRING_ID = 'morning-wiring';

/**
 * @param {string} repoRoot
 * @returns {{ frame: object|null, problems: string[] }}
 */
export function loadMorningWiringFrame(repoRoot) {
  const manifestPath = join(repoRoot, 'docs/procedures/ritual-day/MANIFEST.json');
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    return { frame: null, problems: [`MANIFEST ritual-day: ${e.message}`] };
  }
  const preflight = Array.isArray(manifest.preflight) ? manifest.preflight : [];
  const frame = preflight.find((f) => f && f.id === MORNING_WIRING_ID) ?? null;
  if (!frame) {
    return {
      frame: null,
      problems: [`preflight: нет кадра ${MORNING_WIRING_ID}`],
    };
  }
  return { frame, problems: [] };
}

/**
 * Аудит дверей morning-wiring.
 *
 * @param {string} repoRoot
 * @returns {{
 *   ok: boolean,
 *   stop: boolean,
 *   findings: import('./audit-pins.mjs').PinFinding[],
 *   table: string,
 *   problems: string[],
 * }}
 */
export function auditMorningWiring(repoRoot) {
  const { frame, problems } = loadMorningWiringFrame(repoRoot);
  if (!frame) {
    return {
      ok: false,
      stop: true,
      findings: [],
      table: '',
      problems,
    };
  }
  const pins = Array.isArray(frame.pins) ? frame.pins : [];
  const findings = auditPins(pins, makeAnchorResolveSegment(repoRoot), {
    pinType: 'segment',
  });
  const missing = findings.filter((f) => f.status === 'anchor-lost');
  const blockingSignal = findings.filter(
    (f) => f.status === 'segment-drift' || f.status === 'ambiguous',
  );
  const stop = missing.length > 0 || problems.length > 0;
  return {
    ok: !stop && blockingSignal.length === 0,
    stop,
    findings,
    table: formatPinAuditTable(findings),
    problems,
  };
}

/**
 * Печать отчёта + код выхода для morning-care.
 * 0 — ок или только сигнал; 2 — STOP (missing / нет кадра).
 *
 * @param {string} repoRoot
 * @param {{ log?: (s: string) => void }} [opts]
 * @returns {number} process.exitCode
 */
export function runMorningWiringGate(repoRoot, opts = {}) {
  const log = opts.log ?? console.log;
  const r = auditMorningWiring(repoRoot);
  log('→ morning-wiring (preflight)');
  if (r.problems.length) {
    for (const p of r.problems) log(`  ✗ ${p}`);
  }
  if (r.table) log(r.table);
  for (const f of r.findings.filter((x) => x.blocking)) {
    const label =
      f.status === 'anchor-lost'
        ? 'STOP missing'
        : f.status === 'segment-drift'
          ? 'signal drift'
          : `signal ${f.status}`;
    log(`  · ${label}: ${f.path} — ${f.repairVerb}`);
  }
  if (r.stop) {
    log('✗ morning-wiring: STOP — дверь missing (или нет кадра). Ремонт: holder ozhegov.');
    return 2;
  }
  if (!r.ok) {
    log('⚠ morning-wiring: сигнал (drift/ambiguous) — старт утра не блокирован.');
  } else {
    log('✓ morning-wiring: двери целы');
  }
  return 0;
}
