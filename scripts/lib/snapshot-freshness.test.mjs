import assert from 'node:assert/strict';
import test from 'node:test';

import { EXIT_CODES, SNAPSHOT_FORMAT } from './snapshot-contract.mjs';
import { checkFreshness, fresh } from './snapshot-freshness.mjs';

const CURSOR = 'cursor-2026-07-19T17:59:00.000Z';

function makeSnapshot(sourceRevision = CURSOR) {
  return {
    header: {
      format: SNAPSHOT_FORMAT,
      capturedAt: '2026-07-19T18:00:00.000Z',
      sourceRevision,
      producedBy: 'media-NL',
      egressRegion: 'NL',
      mode: 'batch-full-pull',
      trigger: 'manual',
      recordCount: 0,
    },
    records: [],
  };
}

test('fresh: курсор совпал с ревизией снимка', () => {
  assert.equal(fresh(makeSnapshot(), CURSOR), true);
  assert.equal(fresh(makeSnapshot('older-cursor'), CURSOR), false);
});

test('fresh: битый снимок никогда не свеж', () => {
  assert.equal(fresh(null, CURSOR), false);
  assert.equal(fresh({}, CURSOR), false);
  assert.equal(fresh({ header: { sourceRevision: '' } }, ''), false);
});

test('checkFreshness: свежий снимок → OK; курсор запрошен ровно один раз (стаб, сети нет)', async () => {
  let calls = 0;
  const getCursor = () => {
    calls += 1;
    return CURSOR;
  };
  const result = await checkFreshness(makeSnapshot(), getCursor);
  assert.equal(result.code, EXIT_CODES.OK);
  assert.equal(result.fresh, true);
  assert.equal(calls, 1, 'один дешёвый запрос O(1)');
});

test('checkFreshness: источник ушёл вперёд → SNAPSHOT_STALE (мягкое замечание)', async () => {
  const result = await checkFreshness(makeSnapshot('cursor-старый'), async () => CURSOR);
  assert.equal(result.code, EXIT_CODES.SNAPSHOT_STALE);
  assert.equal(result.fresh, false);
  assert.equal(result.snapshotRevision, 'cursor-старый');
  assert.equal(result.sourceCursor, CURSOR);
});

test('checkFreshness: битый снимок → SNAPSHOT_NO_INPUT, курсор не запрашивается', async () => {
  let calls = 0;
  const result = await checkFreshness({ header: {} }, () => {
    calls += 1;
    return CURSOR;
  });
  assert.equal(result.code, EXIT_CODES.SNAPSHOT_NO_INPUT);
  assert.equal(result.fresh, null);
  assert.equal(calls, 0, 'вход не определён — свежесть не имеет смысла');
});
