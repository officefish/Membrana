/**
 * Movement mode (К5 / M4 linear-egress-gear-wiring).
 *
 * Единственный носитель: docs/tasks/movement-mode.json
 * Атомарная запись { movementMode, snapshotRef, switchedAt }.
 * Silent-flip запрещён — писать только через scripts/movement-mode-lift.mjs.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pullOk } from './snapshot-contract.mjs';

export const MOVEMENT_MODE_DEFERRED = 'deferred-egress';
export const MOVEMENT_MODE_LIVE = 'live-snapshot';

export const MOVEMENT_MODE_RELATIVE = 'docs/tasks/movement-mode.json';

/**
 * @param {string} [repoRoot]
 * @returns {string}
 */
export function movementModePath(repoRoot) {
  const root =
    repoRoot ??
    resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  return join(root, MOVEMENT_MODE_RELATIVE);
}

/**
 * @param {string} [repoRoot]
 * @returns {{
 *   movementMode: 'deferred-egress' | 'live-snapshot',
 *   snapshotRef: string | null,
 *   switchedAt: string | null,
 *   switchedBy?: string | null,
 *   notes?: string | null,
 * }}
 */
export function loadMovementMode(repoRoot) {
  const path = movementModePath(repoRoot);
  if (!existsSync(path)) {
    return {
      movementMode: MOVEMENT_MODE_DEFERRED,
      snapshotRef: null,
      switchedAt: null,
      switchedBy: null,
      notes: 'default: file missing → deferred-egress',
    };
  }
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  const mode = parsed.movementMode;
  if (mode !== MOVEMENT_MODE_DEFERRED && mode !== MOVEMENT_MODE_LIVE) {
    throw new Error(`movement-mode: неизвестный movementMode=${String(mode)}`);
  }
  return {
    movementMode: mode,
    snapshotRef: parsed.snapshotRef ?? null,
    switchedAt: parsed.switchedAt ?? null,
    switchedBy: parsed.switchedBy ?? null,
    notes: parsed.notes ?? null,
  };
}

/**
 * Печать stub deferred-egress при live — незаконна (M4).
 *
 * @param {{ movementMode: string }} mode
 * @param {'deferred-egress' | 'live-snapshot' | string} printed
 * @returns {{ ok: boolean, code: number, reason: string }}
 */
export function assertMovementPrintLegal(mode, printed) {
  if (mode.movementMode === MOVEMENT_MODE_LIVE && printed === MOVEMENT_MODE_DEFERRED) {
    return {
      ok: false,
      code: 21,
      reason: 'stub deferred-egress незаконен при movementMode=live-snapshot',
    };
  }
  if (mode.movementMode === MOVEMENT_MODE_LIVE && !mode.snapshotRef) {
    return {
      ok: false,
      code: 20,
      reason: 'live-snapshot без snapshotRef — мёртвая дверь',
    };
  }
  return { ok: true, code: 0, reason: 'ok' };
}

/**
 * Единицы created ≥ t₀ обязаны нести snapshotRef (M4).
 * Единицы до t₀ не переписываем — stub исторически легитимен.
 *
 * @param {{ movementMode: string, switchedAt: string | null, snapshotRef: string | null }} mode
 * @param {{ createdAt: string, snapshotRef?: string | null }} unit
 */
export function assertUnitMovementLegal(mode, unit) {
  if (mode.movementMode !== MOVEMENT_MODE_LIVE || !mode.switchedAt) {
    return { ok: true, code: 0, reason: 'deferred or no t0 — stub допустим' };
  }
  const created = Date.parse(unit.createdAt);
  const t0 = Date.parse(mode.switchedAt);
  if (Number.isNaN(created) || Number.isNaN(t0)) {
    return { ok: false, code: 20, reason: 'битые метки createdAt/switchedAt' };
  }
  if (created < t0) {
    return { ok: true, code: 0, reason: 'unit before t0 — не переписываем' };
  }
  if (!unit.snapshotRef) {
    return {
      ok: false,
      code: 21,
      reason: 'unit created ≥ t0 без snapshotRef',
    };
  }
  return { ok: true, code: 0, reason: 'ok' };
}

/**
 * Перепроверка snapshotRef офлайн (без сети).
 *
 * @param {string} repoRoot
 * @param {{ snapshotRef: string | null }} mode
 */
export function auditSnapshotRef(repoRoot, mode) {
  if (!mode.snapshotRef) {
    return { ok: false, problems: ['snapshotRef пуст'] };
  }
  const abs = resolve(repoRoot, mode.snapshotRef);
  if (!existsSync(abs)) {
    return { ok: false, problems: [`файл не найден: ${mode.snapshotRef}`] };
  }
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    return { ok: false, problems: [`JSON: ${e.message}`] };
  }
  if (!pullOk(snapshot)) {
    return { ok: false, problems: ['pullOk(S)=false — lift невалиден'] };
  }
  const header = snapshot.header ?? {};
  return {
    ok: true,
    problems: [],
    header: {
      format: header.format ?? null,
      producedBy: header.producedBy ?? null,
      egressRegion: header.egressRegion ?? null,
      mode: header.mode ?? null,
      capturedAt: header.capturedAt ?? null,
      sourceRevision: header.sourceRevision ?? null,
      recordCount: header.recordCount ?? null,
    },
  };
}
