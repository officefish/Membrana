/**
 * Адаптер (б) Phase 4 — cowork-execution-registry: CLI гейтов следа (зубы).
 *
 * Зовёт чистые функции блока units-trace-measure (`checkLeadPersona`,
 * `checkAcceptance`) и транслирует ЛОКАЛЬНЫЕ коды блока (0/1) в единую таблицу
 * вердикт-кодов INTERFACE_CONTRACT §2:
 *
 *   22 LEAD_PERSONA_MISSING    — отказ-I, жёсткий;
 *   12 ACCEPTANCE_UNCONFIRMED  — отказ-II soft, мягкий;
 *   23 ACCEPTANCE_FALSE        — отказ-II hard, жёсткий.
 *
 * Проекция на exit процесса (§2): жёсткий вердикт → exit = вердикт-код;
 * мягкий → exit 0 + ОБЯЗАТЕЛЬНАЯ печать замечания с кодом; чистый → exit 0.
 *
 * Вшивание (адаптер, блоки хуков не знают):
 *   - `.githooks/pre-push` — `lead-persona`: отказ-I по всем active-карточкам
 *     живого реестра docs/tasks/registry.json;
 *   - `scripts/archive-task.mjs` — отказ-I hard по архивируемой карточке;
 *   - closure review (`scripts/task-closure-review.mjs` finalize) — отказ-II
 *     в soft-режиме по манифесту закрытия (docs/reviews/<id>/manifest.json).
 *
 * Usage:
 *   node scripts/trace-gate.mjs lead-persona [--id <taskId>]
 *   node scripts/trace-gate.mjs acceptance --id <taskId> [--mode soft|hard]
 *                               [--expected-head <sha>] [--manifest <path>]
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { checkAcceptance } from './lib/trace-acceptance.mjs';
import { checkLeadPersona } from './lib/trace-lead-persona.mjs';
import { findTask, listActive, loadRegistry } from './lib/task-registry.mjs';
import { manifestPath } from './lib/task-closure-review.mjs';

/**
 * Подмножество единой таблицы §2, которым владеет этот адаптер.
 * Новый код — только правкой контракта; здесь коды не изобретаются.
 */
export const CONTRACT_CODES = Object.freeze({
  OK: 0,
  ACCEPTANCE_UNCONFIRMED: 12, // мягкий: зубы, отказ-II soft
  LEAD_PERSONA_MISSING: 22, // жёсткий: зубы, отказ-I
  ACCEPTANCE_FALSE: 23, // жёсткий: зубы, отказ-II hard
});

/**
 * Локальный вердикт блока → вердикт-код контракта (§2).
 * Код следует за вердиктом — закон спринта.
 *
 * @param {'lead-persona' | 'acceptance'} gate
 * @param {{ verdict: 'pass' | 'soft' | 'hard' }} result возврат чистой функции блока
 * @returns {number}
 */
export function toContractCode(gate, result) {
  if (result.verdict === 'pass') return CONTRACT_CODES.OK;
  if (gate === 'lead-persona') {
    // У отказа-I мягкого режима нет (M2: hard сразу).
    return CONTRACT_CODES.LEAD_PERSONA_MISSING;
  }
  if (gate === 'acceptance') {
    return result.verdict === 'soft'
      ? CONTRACT_CODES.ACCEPTANCE_UNCONFIRMED
      : CONTRACT_CODES.ACCEPTANCE_FALSE;
  }
  throw new Error(`toContractCode: неизвестный гейт "${gate}"`);
}

/**
 * Проекция вердикт-кода на exit процесса (§2): 0 чисто · 1–19 мягкие (exit 0,
 * замечание печатается) · ≥20 жёсткие (exit = код).
 *
 * @param {number} contractCode
 * @returns {{ exit: number, soft: boolean }}
 */
export function projectExit(contractCode) {
  if (contractCode === 0) return { exit: 0, soft: false };
  if (contractCode >= 1 && contractCode <= 19) return { exit: 0, soft: true };
  return { exit: contractCode, soft: false };
}

/**
 * Отказ-I по множеству карточек: код max-строгости (жёсткий, если жёсток хоть
 * один), причины всех отказавших — наружу.
 *
 * @param {{ id?: string, leadPersona?: string | null }[]} cards
 * @returns {{ code: number, failures: { code: number, reason: string }[], checked: number }}
 */
export function runLeadPersonaGate(cards) {
  const failures = [];
  for (const card of cards) {
    const result = checkLeadPersona(card);
    const code = toContractCode('lead-persona', result);
    if (code !== CONTRACT_CODES.OK) failures.push({ code, reason: result.reason });
  }
  return {
    code: failures.length > 0 ? CONTRACT_CODES.LEAD_PERSONA_MISSING : CONTRACT_CODES.OK,
    failures,
    checked: cards.length,
  };
}

/**
 * Отказ-II по артефакту закрытия (канон приёмки §1.1: `{acceptedBy, headRev}`).
 *
 * @param {{ taskId?: string, acceptance?: object | null }} artifact
 * @param {{ mode: 'soft' | 'hard', expectedHeadRev?: string }} options
 * @returns {{ code: number, reason: string }}
 */
export function runAcceptanceGate(artifact, options) {
  const result = checkAcceptance(artifact, options);
  return { code: toContractCode('acceptance', result), reason: result.reason };
}

/**
 * Печать + exit-код по результату гейта. Мягкое замечание печатается ВСЕГДА
 * (обязательство §2), жёсткий отказ уходит в stderr.
 *
 * @param {{ code: number, reason: string }} outcome
 * @param {{ log?: (s: string) => void, error?: (s: string) => void }} [io]
 * @returns {number} exit-код процесса
 */
export function reportOutcome(outcome, io = console) {
  const { exit, soft } = projectExit(outcome.code);
  if (outcome.code === CONTRACT_CODES.OK) {
    (io.log ?? console.log)(`trace-gate: OK [код 0] — ${outcome.reason}`);
  } else if (soft) {
    (io.log ?? console.log)(`trace-gate: замечание [код ${outcome.code}] — ${outcome.reason}`);
  } else {
    (io.error ?? console.error)(`trace-gate: отказ [код ${outcome.code}] — ${outcome.reason}`);
  }
  return exit;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { command, id: null, mode: 'soft', expectedHead: null, manifest: null };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--id') opts.id = rest[++i] ?? null;
    else if (arg === '--mode') opts.mode = rest[++i] ?? null;
    else if (arg === '--expected-head') opts.expectedHead = rest[++i] ?? null;
    else if (arg === '--manifest') opts.manifest = rest[++i] ?? null;
    else throw new Error(`trace-gate: неизвестный аргумент ${arg}`);
  }
  return opts;
}

function mainLeadPersona(opts) {
  const registry = loadRegistry();
  const cards = opts.id
    ? [findTask(registry, opts.id) ?? { id: opts.id, leadPersona: null }]
    : listActive(registry);
  const { code, failures, checked } = runLeadPersonaGate(cards);
  if (code === CONTRACT_CODES.OK) {
    console.log(`trace-gate lead-persona: OK [код 0] — проверено карточек: ${checked}`);
    return 0;
  }
  console.error(
    `trace-gate lead-persona: отказ-I [код ${code}] — без ответственного ${failures.length} из ${checked}:`,
  );
  for (const failure of failures) console.error(`  - ${failure.reason}`);
  return projectExit(code).exit;
}

function mainAcceptance(opts) {
  if (!opts.id && !opts.manifest) {
    throw new Error('trace-gate acceptance: нужен --id <taskId> или --manifest <path>');
  }
  const path = opts.manifest ? resolve(process.cwd(), opts.manifest) : manifestPath(opts.id);
  if (!existsSync(path)) {
    // Артефакта закрытия нет — приёмку подтвердить не на чем (тот же отказ-II).
    const outcome = runAcceptanceGate(null, { mode: opts.mode });
    return reportOutcome({ ...outcome, reason: `${outcome.reason} (манифест не найден: ${path})` });
  }
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const artifact = { taskId: manifest.taskId ?? opts.id, acceptance: manifest.acceptance ?? null };
  const outcome = runAcceptanceGate(artifact, {
    mode: opts.mode,
    ...(opts.expectedHead ? { expectedHeadRev: opts.expectedHead } : {}),
  });
  return reportOutcome(outcome);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.command === 'lead-persona') return mainLeadPersona(opts);
  if (opts.command === 'acceptance') return mainAcceptance(opts);
  console.error(
    'Usage: node scripts/trace-gate.mjs <lead-persona|acceptance> [--id <taskId>] [--mode soft|hard] [--expected-head <sha>] [--manifest <path>]',
  );
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
