/**
 * procedure-run-journal — local JSONL trail for procedure executions.
 *
 * The journal records execution coverage; run-ledger can later protect the
 * record hash. Keep clocks and sequence numbers at the boundary.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { leafHash } from './run-ledger/index.mjs';

export const JOURNAL_SCHEMA = 'procedure-run-journal@1';
export const VALID_STATUSES = new Set(['pass', 'fail', 'blocked', 'skipped']);

export function defaultTrailPath(dateIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error(`dateIso must be YYYY-MM-DD: ${dateIso}`);
  }
  return `docs/procedure-runs/trail/${dateIso}.jsonl`;
}

function asArray(value, field) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value.map((x) => String(x).trim()).filter(Boolean);
}

function normalizeStatus(status) {
  const s = String(status ?? '').trim().toLowerCase();
  if (!VALID_STATUSES.has(s)) {
    throw new Error(`status must be one of ${[...VALID_STATUSES].join(', ')}: ${status}`);
  }
  return s;
}

function cleanString(value, field) {
  const s = String(value ?? '').trim();
  if (!s) throw new Error(`${field} is required`);
  return s;
}

export function buildProcedureRunRecord(input, opts = {}) {
  const procedureId = cleanString(input.procedureId, 'procedureId');
  const runId = cleanString(input.runId, 'runId');
  const status = normalizeStatus(input.status);
  const subject = cleanString(input.subject, 'subject');
  const at = cleanString(input.at ?? opts.nowIso, 'at');
  const sequence = Number(input.sequence ?? opts.sequence);

  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error(`sequence must be a positive integer: ${input.sequence ?? opts.sequence}`);
  }

  const evidence = asArray(input.evidence, 'evidence');
  const gaps = asArray(input.gaps, 'gaps');
  if (status === 'pass' && evidence.length === 0) {
    throw new Error('pass record must name at least one evidence item');
  }

  const record = {
    schema: JOURNAL_SCHEMA,
    sequence,
    at,
    runId,
    procedureId,
    status,
    subject,
    coverage: {
      evidence,
      gaps,
    },
  };

  if (input.frameId) record.frameId = String(input.frameId).trim();
  if (input.stepId) record.stepId = String(input.stepId).trim();
  if (input.note) record.note = String(input.note).trim();

  record.ledger = {
    algorithm: 'run-ledger.leafHash@1',
    leafHash: leafHash(record),
  };
  return record;
}

export function validateProcedureRunRecord(record) {
  const problems = [];
  if (record?.schema !== JOURNAL_SCHEMA) problems.push('schema');
  if (!Number.isSafeInteger(record?.sequence) || record.sequence < 1) problems.push('sequence');
  for (const field of ['at', 'runId', 'procedureId', 'status', 'subject']) {
    if (typeof record?.[field] !== 'string' || record[field].trim() === '') problems.push(field);
  }
  if (!VALID_STATUSES.has(record?.status)) problems.push('status');
  if (!Array.isArray(record?.coverage?.evidence)) problems.push('coverage.evidence');
  if (!Array.isArray(record?.coverage?.gaps)) problems.push('coverage.gaps');
  if (record?.status === 'pass' && record?.coverage?.evidence?.length === 0) {
    problems.push('pass-without-evidence');
  }
  if (record?.ledger?.leafHash !== leafHash({ ...record, ledger: undefined })) {
    problems.push('ledger.leafHash');
  }
  return problems;
}

export function appendProcedureRunRecord(repoRoot, trailRelPath, record) {
  const problems = validateProcedureRunRecord(record);
  if (problems.length > 0) {
    throw new Error(`invalid procedure run record: ${problems.join(', ')}`);
  }
  const abs = resolve(repoRoot, trailRelPath);
  mkdirSync(dirname(abs), { recursive: true });
  appendFileSync(abs, `${JSON.stringify(record)}\n`, 'utf8');
  return abs;
}

export function readProcedureRunTrail(repoRoot, trailRelPath) {
  const abs = resolve(repoRoot, trailRelPath);
  if (!existsSync(abs)) return [];
  return readFileSync(abs, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        const err = new Error(`invalid JSONL at ${trailRelPath}:${index + 1}: ${e.message}`);
        err.cause = e;
        throw err;
      }
    });
}

export function summarizeProcedureRunTrail(records) {
  if (!Array.isArray(records)) throw new Error('records must be an array');
  const summary = {
    total: records.length,
    gaps: [],
  };
  for (const status of VALID_STATUSES) summary[status] = 0;

  records.forEach((record, index) => {
    if (!VALID_STATUSES.has(record?.status)) {
      throw new Error(`records[${index}].status must be one of ${[...VALID_STATUSES].join(', ')}`);
    }
    const gaps = record.coverage?.gaps ?? [];
    if (!Array.isArray(gaps)) throw new Error(`records[${index}].coverage.gaps must be an array`);

    summary[record.status] += 1;
    for (const gap of gaps) {
      summary.gaps.push({ runId: record.runId, procedureId: record.procedureId, gap });
    }
  });
  return summary;
}
