# Ticket: review procedure-run-journal predicates

Persona: dynin
Block: journal-predicates-review
Plan: docs/sprint/cut/procedure-run-journal-2026-08-01-code-review.json

## Reviewer Task

You review the implementation against the membrana-local-sprint contract.
Return one final code-review verdict: LGTM or BLOCK. If BLOCK, name the
blocking findings and the required fix. Do not rewrite the implementation.

## Scope

- Check append/check/report behavior.
- Check hash/sourceHash handling and required evidence/gaps semantics.
- Check that blocked/pass trail records honestly capture procedure state instead
  of masking gaps.

## Files

- scripts/lib/procedure-run-journal.mjs
- scripts/procedure-run-journal.mjs
- scripts/procedure-run-journal.test.mjs
- docs/procedure-runs/README.md
- docs/procedure-runs/trail/2026-08-01.jsonl

## File: scripts/lib/procedure-run-journal.mjs

```mjs
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
  cons

[... clipped at 4500 chars ...]

```

## File: scripts/procedure-run-journal.mjs

```mjs
#!/usr/bin/env node
/**
 * procedure-run:journal — append/check/report local procedure execution trail.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  appendProcedureRunRecord,
  buildProcedureRunRecord,
  defaultTrailPath,
  readProcedureRunTrail,
  summarizeProcedureRunTrail,
  validateProcedureRunRecord,
} from './lib/procedure-run-journal.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      out._.push(arg);
      continue;
    }
    const [rawKey, rawValue] = arg.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = rawValue ?? argv[++i];
    if (['evidence', 'gap'].includes(rawKey)) {
      out[key] ??= [];
      out[key].push(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function usage() {
  console.error(`Usage:
  node scripts/procedure-run-journal.mjs append --procedure <id> --run-id <id> --status pass|fail|blocked|skipped --subject "..." --evidence <path> [--gap "..."]
  node scripts/procedure-run-journal.mjs check [--trail docs/procedure-runs/trail/YYYY-MM-DD.jsonl]
  node scripts/procedure-run-journal.mjs report [--trail docs/procedure-runs/trail/YYYY-MM-DD.jsonl]`);
}

function resolveTrail(args) {
  return args.trail || defaultTrailPath(args.date || todayIso());
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  const trail = resolveTrail(args);

  try {
    if (cmd === 'append') {
      const records = readProcedureRunTrail(repoRoot, trail);
      const record = buildProcedureRunRecord(
        {
          procedureId: args.procedure || args.procedureId,
          runId: args.runId,
          frameId: args.frameId,
          stepId: args.stepId,
          status: args.status,
          subject: args.subject,
          evidence: args.evidence,
          gaps: args.gap,
          note: args.note,
        },
        { nowIso: new Date().toISOString(), sequence: records.length + 1 },
      );
      appendProcedureRunRecord(repoRoot, trail, record);
      console.log(`procedure-run:journal append ${trail}#${record.sequence} ${record.status} ${record.runId}`);
      return;
    }

    if (cmd === 'check') {
      const records = readProcedureRunTrail(repoRoot, trail);
      const problems = records.flatMap((record, index) =>
        validateProcedureRunRecord(record).map((p) => `${trail}:${index + 1}: ${p}`),
      );
      if (problems.length > 0) {
        for (const p of problems) console.error(`✖ ${p}`);
        process.exitCode = 1;
        return;
      }
      console.log(`procedure-run:journal ok ${trail} (${records.length} records)`);
      return;
    }

    if (cmd === 'report') {
      const records = readProcedureRunTrail(repoRoot, trail);
      const summary = summarizeProcedureRunTrail(records);
      console.log(`# procedure-run journal report`);
      console.log(`trail: ${trail}`);
      console.log(`total: ${summary.total}`);
      console.log(`pass: ${summary.pass}`);
      console.log(`fail: ${summary.fail}`);
      console.log(`blocked: ${summary.blocked}`);
      console.log(`skipped: ${summary.skipped}`);
      console.log(`gaps:`);
      if (summary.gaps.length === 0) console.log(`- (empty)`);
      for (const g of summary.gaps) console.log(`- ${g.procedureId}/${g.runId}: ${g.gap}`);
      return;
    }
  } catch (e) {
    console.error(`procedure-run:journal: ${e.message}`);
    process.exitCode = 1;
    return;
  }

  usage();
  process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/procedure-run-journal.mjs')) main();


```

## File: scripts/procedure-run-journal.test.mjs

```mjs
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  buildProcedureRunRecord,
  appendProcedureRunRecord,
  readProcedureRunTrail,
  summarizeProcedureRunTrail,
  validateProcedureRunRecord,
} from './lib/procedure-run-journal.mjs';

function tempRepo() {
  return mkdtempSync(join(tmpdir(), 'procedure-run-journal-'));
}

test('builds a pass record with evidence and stable ledger leaf', () => {
  const record = buildProcedureRunRecord(
    {
      procedureId: 'ritual-evening',
      runId: 'ritual-evening-2026-08-01',
      status: 'pass',
      subject: 'evening delivery frame covered generated artifacts',
      evidence: ['docs/archive/daily-day/2026-07-31/audit.md'],
    },
    { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
  );
  assert.equal(record.schema, 'procedure-run-journal@1');
  assert.match(record.ledger.leafHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(validateProcedureRunRecord(record), []);
});

test('pass without evidence is rejected', () => {
  assert.throws(
    () =>
      buildProcedureRunRecord(
        {
          procedureId: 'code-review',
          runId: 'code-review-2026-08-01',
          status: 'pass',
          subject: 'review covered the day',
        },
        { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
      ),
    /pass record must name at least one evidence item/,
  );
});

test('blocked record can carry a named gap', () => {
  const record = buildProcedureRunRecord(
    {
      procedureId: 'ritual-evening',
      runId: 'delivery-frame-2026-08-01',
      status: 'blocked',
      subject: 'deliver handoff to neighbors',
      gaps: ['bridge digest missing for a day without bridge'],
    },
    { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
  );
  assert.deepEqual(validateProcedureRunRecord(record), []);
  assert.equal(record.coverage.gaps[0], 'bridge digest missing for a day without bridge');
});

test('append and read JSONL trail', () => {
  const root = tempRepo();
  try {
    const trail = 'docs/procedure-runs/trail/2026-08-01.jsonl';
    const one = buildProcedureRunRecord(
      {
        procedureId: 'membrana-local-sprint',
        runId: 'procedure-run-journal-f1',
        status: 'pass',
        subject: 'OPEN and registry frame exist',
        evidence: ['docs/local-sprint/procedure-run-journal-2026-08-01/OPEN.md'],
      },
      { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
    );
    appendProcedureRunRecord(root, trail, one);
    const text = readFileSync(join(root, trail), 'utf8');
    assert.equal(text.split('\n').filter(Boolean).length, 1);
    assert.deepEqual(readProcedureRunTrail(root, trail), [one]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('summary names gaps instead of hiding behind counts', () => {
  const records = [
    buildProcedureRunRecord(
      {
        procedureId: 'procedure-x',
        runId: 'run-1',
        status: 'blocked',
        subject: 'cover subject',
        gaps: ['missing artifact'],
      },
      { nowIso: '2026-08-01T05:00:00.000Z', sequence: 1 },
    ),
  ];
  const summary = summarizeProcedureRunTrail(records);
  assert.equal(summary.blocked, 1);
  assert.deepEqual(summary.gaps, [{ procedureId: 'procedure-x', runId: 'run-1', gap: 'missing artifact' }]);
});

```

## File: docs/procedure-runs/README.md

```md
# procedure-runs — журнал прогонов процедур

Дом локального следа исполнения процедур. `docs/procedures/` хранит определения,
а здесь лежат инстансы: что запускали, какой предмет обещали покрыть, какие
evidence и gaps оставил прогон.

## Trail

`trail/<YYYY-MM-DD>.jsonl` — append-only JSONL. Одна строка = один record
`procedure-run-journal@1`.

Минимальные поля:

- `procedureId`, `runId`, `sequence`, `at`
- `status`: `pass`, `fail`, `blocked`, `skipped`
- `subject`: предмет, который прогон обещал покрыть
- `coverage.evidence[]`: named artifacts/facts
- `coverage.gaps[]`: named gaps, если предмет не покрыт полностью
- `ledger.leafHash`: `run-ledger` leaf hash записи

`pass` без evidence запрещён: журнал должен доказывать покрытие предмета, а не
только факт запуска механизма.

## CLI

```bash
node scripts/procedure-run-journal.mjs append --procedure ritual-evening --run-id ritual-evening-2026-08-01 --status blocked --subject "delivery frame" --gap "bridge digest missing"
node scripts/procedure-run-journal.mjs check --trail docs/procedure-runs/trail/2026-08-01.jsonl
node scripts/procedure-run-journal.mjs report --trail docs/procedure-runs/trail/2026-08-01.jsonl
```

## Честный предел

Локальный журнал не исполняет процедуру и не подписывает серверный чекпойнт. Он
даёт предъявимый след. Защита истории остаётся в `scripts/lib/run-ledger/`, а
автоматический проигрыватель процедур — следующий слой.


```

## File: docs/procedure-runs/trail/2026-08-01.jsonl

```jsonl
{"schema":"procedure-run-journal@1","sequence":1,"at":"2026-08-01T05:47:30.075Z","runId":"procedure-run-journal-f1-local-trail","procedureId":"membrana-local-sprint","status":"pass","subject":"F1 local trail builds a procedure run journal with named evidence and gaps","coverage":{"evidence":["docs/local-sprint/procedure-run-journal-2026-08-01/OPEN.md","docs/procedure-runs/README.md","scripts/procedure-run-journal.test.mjs"],"gaps":[]},"note":"node --test scripts/procedure-run-journal.test.mjs scripts/run-ledger.test.mjs = 14/14","ledger":{"algorithm":"run-ledger.leafHash@1","leafHash":"98542ef08a2da7fe0dd11c3cdb18fe95a76c6e3c331e1ab06536f510bbcb25b5"}}
{"schema":"procedure-run-journal@1","sequence":2,"at":"2026-08-01T06:25:56.084Z","runId":"procedure-run-journal-f1-local-trail","procedureId":"membrana-local-sprint","status":"pass","subject":"F1 local trail DoD verified after membrana-local-sprint normalization","coverage":{"evidence":["docs/local-sprint/procedure-run-journal-2026-08-01/F1_REPORT.md","docs/procedure-runs/README.md","scripts/lib/procedure-run-journal.mjs","scripts/procedure-run-journal.test.mjs"],"gaps":[]},"ledger":{"algorithm":"run-ledger.leafHash@1","leafHash":"2f2e7026d96efdaa8ff0dced08a5bc678d4e010ceefd3b73a6031a0bce36aec3"}}
{"schema":"procedure-run-journal@1","sequence":3,"at":"2026-08-01T06:31:08.223Z","runId":"procedure-run-journal-2026-08-01-procedure-frame-audit","procedureId":"membrana-local-sprint","status":"blocked","subject":"membrana-local-sprint frame audit for procedure-run-journal","coverage":{"evidence":["docs/local-sprint/procedure-run-journal-2026-08-01/F1_REPORT.md","docs/LOCAL_SPRINT_ACTIVE.md"],"gaps":["pre-work sprint:cut planning did not happen","owner ratification did not happen before work","team profile contexts were not connected as execution frames","sprint:gate did not verify contract_signature/session_prep/context_run/review_pass"]},"ledger":{"algorithm":"run-ledger.leafHash@1","leafHash":"f0b8f78f6f62724a9629a9cb7b63ec2743ea14260fe2fd397f2273deee24bda0"}}
{"schema":"procedure-run-journal@1","sequence":4,"at":"2026-08-01T06:42:46.659Z","runId":"procedure-run-journal-2026-08-01-code-review-cut","procedureId":"membrana-local-sprint","status":"blocked","subject":"review cut for procedure-run-journal code","coverage":{"evidence":["docs/sprint/cut/procedure-run-journal-2026-08-01-code-review.json"],"gaps":["owner ratification pending"]},"ledger":{"algorithm":"run-ledger.leafHash@1","leafHash":"0e273fd5a5602cd68db3bd44118d175a4040097344c8a49624511be5b90c4dca"}}

```
