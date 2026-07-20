import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  ColdRecordRejectedError,
  appendColdRecord,
  validateColdRecord,
} from './cold-writer.mjs';

function makeRecord(overrides = {}) {
  return {
    snapshot: {
      capturedAt: '2026-07-19T18:00:00.000Z',
      headRevision: '03a6b1ec03a6b1ec03a6b1ec03a6b1ec03a6b1ec',
      source: 'office-batch/trigger=evening-signal',
      ...(overrides.snapshot ?? {}),
    },
    card: overrides.card ?? {
      id: 'issue-178-async-v2-reconciliation',
      title: 'Issue #178: reconcile async-v2 upload fix and stale PR #179',
      promptPath: 'docs/prompts/ISSUE_178_ASYNC_V2_RECONCILIATION_SPRINT_PROMPT.md',
      githubIssue: 178,
      linearId: 'DRU-93',
      status: 'archived',
      archivedAt: '2026-06-29',
      archiveNotes: 'PR #200; review LGTM 11fdb3cc05d7',
    },
    domain: overrides.domain ?? {
      dependsOn: [],
      strategicWave: 'W1',
      leadPersona: 'vesnin',
    },
  };
}

function tmpArchive() {
  return join(mkdtempSync(join(tmpdir(), 'cold-writer-')), 'archive.jsonl');
}

test('запись с honest-шапкой принимается и дописывается строкой jsonl', () => {
  const archive = tmpArchive();
  const record = makeRecord();
  const result = appendColdRecord(archive, record);
  assert.equal(result.appended, true);
  const content = readFileSync(archive, 'utf8');
  assert.equal(content.endsWith('\n'), true);
  assert.deepEqual(JSON.parse(content.trim()), record);
});

test('УСЛОВИЕ ПРИЁМКИ: запись без honest-шапки холод ОТВЕРГАЕТ', () => {
  const archive = tmpArchive();
  const { snapshot: _dropped, ...withoutHeader } = makeRecord();
  assert.throws(
    () => appendColdRecord(archive, withoutHeader),
    (error) => {
      assert.ok(error instanceof ColdRecordRejectedError);
      assert.ok(error.problems.some((p) => p.includes('honest-шапки')));
      return true;
    },
  );
});

test('шапка неполная (нет headRevision / нет даты / нет источника) — отказ', () => {
  for (const snapshot of [
    { capturedAt: '2026-07-19T18:00:00.000Z', source: 'office-batch' },
    { headRevision: 'abc123', source: 'office-batch' },
    { capturedAt: '2026-07-19T18:00:00.000Z', headRevision: 'abc123' },
    { capturedAt: 'не дата', headRevision: 'abc123', source: 'office-batch' },
  ]) {
    const record = { ...makeRecord(), snapshot };
    assert.equal(validateColdRecord(record).ok, false, JSON.stringify(snapshot));
    assert.throws(() => appendColdRecord(tmpArchive(), record), ColdRecordRejectedError);
  }
});

test('производитель один: source не office-батч — отказ (M3)', () => {
  const record = makeRecord({ snapshot: { source: 'evening-ritual' } });
  const { ok, problems } = validateColdRecord(record);
  assert.equal(ok, false);
  assert.ok(problems.some((p) => p.includes('производитель холода один')));
});

test('движение не дублируется: card.state в записи — отказ (M3)', () => {
  const record = makeRecord();
  record.card = { ...record.card, state: 'Done' };
  const { ok, problems } = validateColdRecord(record);
  assert.equal(ok, false);
  assert.ok(problems.some((p) => p.includes('движение не дублируется')));
});

test('domain.dependsOn обязателен (граф — наш актив)', () => {
  const record = makeRecord({ domain: { strategicWave: 'W1', leadPersona: 'vesnin' } });
  const { ok, problems } = validateColdRecord(record);
  assert.equal(ok, false);
  assert.ok(problems.some((p) => p.includes('dependsOn')));
});

test('append-only: вторая запись дописывается, первая не переписывается', () => {
  const archive = tmpArchive();
  const first = makeRecord();
  const second = makeRecord({
    card: { id: 'rag-top-k-c2', title: 'RAG C2', githubIssue: 186, status: 'archived', archivedAt: '2026-06-29' },
  });
  appendColdRecord(archive, first);
  const afterFirst = readFileSync(archive, 'utf8');
  appendColdRecord(archive, second);
  const afterSecond = readFileSync(archive, 'utf8');
  assert.ok(afterSecond.startsWith(afterFirst), 'существующие байты нетронуты');
  assert.equal(afterSecond.trim().split('\n').length, 2);
});

test('файл без завершающего перевода строки не портит jsonl при дописи', () => {
  const archive = tmpArchive();
  writeFileSync(archive, JSON.stringify(makeRecord()), 'utf8'); // без \n
  appendColdRecord(archive, makeRecord({ card: { id: 'second-card' } }));
  const lines = readFileSync(archive, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  for (const line of lines) {
    assert.doesNotThrow(() => JSON.parse(line));
  }
});
