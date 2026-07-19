import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  EXIT_CODES,
  SNAPSHOT_FORMAT,
  isHardCode,
  isSoftCode,
  loadSnapshot,
  resolveSnapshotCode,
  validateSnapshot,
} from './snapshot-contract.mjs';

function makeSnapshot(overrides = {}) {
  const records = overrides.records ?? [
    {
      linearId: 'DRU-93',
      state: 'Done',
      stateType: 'completed',
      assignee: 'druid',
      delegatedAgent: null,
      parentId: null,
      blockedBy: [],
      blocking: [],
      githubIssueRefs: [178],
      createdAt: '2026-06-29T10:00:00.000Z',
      updatedAt: '2026-06-29T17:31:52.000Z',
      completedAt: '2026-06-29T17:31:52.000Z',
    },
  ];
  return {
    header: {
      format: SNAPSHOT_FORMAT,
      capturedAt: '2026-07-19T18:00:00.000Z',
      sourceRevision: 'cursor-2026-07-19T17:59:00.000Z',
      source: 'office-batch',
      trigger: 'evening-signal',
      recordCount: records.length,
      ...(overrides.header ?? {}),
    },
    records,
  };
}

test('валидный снимок проходит валидацию', () => {
  const { ok, problems } = validateSnapshot(makeSnapshot());
  assert.equal(ok, true);
  assert.deepEqual(problems, []);
});

test('провенанс обязателен: пустой sourceRevision — брак', () => {
  const { ok, problems } = validateSnapshot(makeSnapshot({ header: { sourceRevision: '' } }));
  assert.equal(ok, false);
  assert.ok(problems.some((p) => p.includes('sourceRevision')));
});

test('пустой capturedAt и не-ISO дата — брак', () => {
  assert.equal(validateSnapshot(makeSnapshot({ header: { capturedAt: '' } })).ok, false);
  assert.equal(validateSnapshot(makeSnapshot({ header: { capturedAt: 'вчера' } })).ok, false);
});

test('recordCount обязан сходиться с records.length', () => {
  const { ok, problems } = validateSnapshot(makeSnapshot({ header: { recordCount: 779 } }));
  assert.equal(ok, false);
  assert.ok(problems.some((p) => p.includes('recordCount')));
});

test('чужой формат отвергается', () => {
  const { ok } = validateSnapshot(makeSnapshot({ header: { format: 'linear-snapshot@2' } }));
  assert.equal(ok, false);
});

test('детерминизм: тот же снимок → тот же вердикт бит-в-бит', () => {
  const snapshot = makeSnapshot();
  const first = validateSnapshot(snapshot);
  const second = validateSnapshot(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(first, second);
  assert.equal(
    JSON.stringify(resolveSnapshotCode(first, null)),
    JSON.stringify(resolveSnapshotCode(second, null)),
  );
});

test('loadSnapshot: нет файла → SNAPSHOT_NO_INPUT (жёсткий)', () => {
  const { code, snapshot } = loadSnapshot(join(tmpdir(), 'no-such-snapshot.json'));
  assert.equal(code, EXIT_CODES.SNAPSHOT_NO_INPUT);
  assert.equal(snapshot, null);
  assert.ok(isHardCode(code));
});

test('loadSnapshot: битый JSON → SNAPSHOT_NO_INPUT', () => {
  const dir = mkdtempSync(join(tmpdir(), 'snapshot-contract-'));
  const file = join(dir, 'broken.json');
  writeFileSync(file, '{ this is not json', 'utf8');
  assert.equal(loadSnapshot(file).code, EXIT_CODES.SNAPSHOT_NO_INPUT);
});

test('loadSnapshot: валидный файл → OK и тело снимка', () => {
  const dir = mkdtempSync(join(tmpdir(), 'snapshot-contract-'));
  const file = join(dir, 'snapshot.json');
  const snapshot = makeSnapshot();
  writeFileSync(file, JSON.stringify(snapshot), 'utf8');
  const loaded = loadSnapshot(file);
  assert.equal(loaded.code, EXIT_CODES.OK);
  assert.deepEqual(loaded.snapshot, snapshot);
});

test('resolveSnapshotCode: три кода — в порядке / протух-мягкий / входа нет-жёсткий', () => {
  const valid = validateSnapshot(makeSnapshot());
  assert.equal(resolveSnapshotCode(valid, true), EXIT_CODES.OK);
  assert.equal(resolveSnapshotCode(valid, false), EXIT_CODES.SNAPSHOT_STALE);
  assert.equal(resolveSnapshotCode({ ok: false }, true), EXIT_CODES.SNAPSHOT_NO_INPUT);
  // свежесть не проверялась (тело гейта офлайн) — не влияет на валидность
  assert.equal(resolveSnapshotCode(valid, null), EXIT_CODES.OK);
});

test('кодовое пространство: отказ отличается от замечания кодом, не тоном', () => {
  assert.ok(isSoftCode(EXIT_CODES.SNAPSHOT_STALE));
  assert.ok(isSoftCode(EXIT_CODES.LEGALITY_MIGRATING));
  assert.ok(isHardCode(EXIT_CODES.SNAPSHOT_NO_INPUT));
  assert.ok(isHardCode(EXIT_CODES.LEGALITY_HARD));
  assert.equal(EXIT_CODES.OK, 0);
  const codes = Object.values(EXIT_CODES);
  assert.equal(new Set(codes).size, codes.length, 'коды уникальны');
});
