import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { appendColdRecord } from './cold-writer.mjs';
import { coldIds, dependents, findById, readColdRecords, selectByDomain } from './cold-reader.mjs';

function makeRecord(id, domain = {}) {
  return {
    snapshot: {
      capturedAt: '2026-07-19T18:00:00.000Z',
      headRevision: '03a6b1ec03a6b1ec03a6b1ec03a6b1ec03a6b1ec',
      source: 'office-batch/trigger=manual',
    },
    card: { id, title: `Карточка ${id}`, githubIssue: 100, status: 'archived', archivedAt: '2026-07-01' },
    domain: { dependsOn: [], strategicWave: null, leadPersona: null, ...domain },
  };
}

function tmpArchive() {
  return join(mkdtempSync(join(tmpdir(), 'cold-reader-')), 'archive.jsonl');
}

test('офлайн-скан: что записано писателем, то и читается', () => {
  const archive = tmpArchive();
  appendColdRecord(archive, makeRecord('card-a'));
  appendColdRecord(archive, makeRecord('card-b', { leadPersona: 'vesnin' }));
  const { records, corrupt } = readColdRecords(archive);
  assert.equal(records.length, 2);
  assert.deepEqual(corrupt, []);
  assert.equal(findById(records, 'card-b').domain.leadPersona, 'vesnin');
  assert.equal(findById(records, 'card-nope'), null);
});

test('отсутствующий файл — пустой холод, не крах', () => {
  const { records, corrupt } = readColdRecords(join(tmpdir(), 'no-such-archive.jsonl'));
  assert.deepEqual(records, []);
  assert.deepEqual(corrupt, []);
});

test('битая строка видна читателю, но не валит скан остальных', () => {
  const archive = tmpArchive();
  const good = makeRecord('card-good');
  writeFileSync(archive, `${JSON.stringify(good)}\n{broken line\n`, 'utf8');
  const { records, corrupt } = readColdRecords(archive);
  assert.equal(records.length, 1);
  assert.equal(corrupt.length, 1);
  assert.equal(corrupt[0].lineNumber, 2);
});

test('coldIds — вход предиката inCold для wellArchived (Р4)', () => {
  const archive = tmpArchive();
  appendColdRecord(archive, makeRecord('issue-178-async-v2-reconciliation'));
  appendColdRecord(archive, makeRecord('rag-top-k-c2'));
  const ids = coldIds(archive);
  assert.equal(ids.has('issue-178-async-v2-reconciliation'), true);
  assert.equal(ids.has('какой-то-другой'), false);
  // перегрузки: массив записей и результат readColdRecords
  const scan = readColdRecords(archive);
  assert.deepEqual([...coldIds(scan)].sort(), [...coldIds(scan.records)].sort());
});

test('доменные выборки: leadPersona и обход dependsOn', () => {
  const records = [
    makeRecord('base'),
    makeRecord('dependent-1', { dependsOn: ['base'], leadPersona: 'ozhegov' }),
    makeRecord('dependent-2', { dependsOn: ['base', 'dependent-1'] }),
  ];
  assert.equal(selectByDomain(records, 'leadPersona', 'ozhegov').length, 1);
  const deps = dependents(records, 'base').map((r) => r.card.id);
  assert.deepEqual(deps.sort(), ['dependent-1', 'dependent-2']);
});
