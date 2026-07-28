/**
 * Зуб сводок v1 (P4/C5): строка 3 = только emerge; sunkUnsurfaced поимённо, N параметром.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { metricsSnapshot, sunkUnsurfaced } from './metrics.mjs';

test('surfaced_today считает ТОЛЬКО emerge — cloud_query/reject/warmup мимо строки 3', () => {
  const logs = [{
    persona: 'dynin',
    events: [
      { verb: 'cloud_query' }, { verb: 'reject' }, { verb: 'morning_warmup', origin: 'warmup' },
      { verb: 'emerge', ref: 'rec-1' },
    ],
  }];
  const m = metricsSnapshot(logs, '2026-07-28');
  assert.equal(m.surfaced_today.total, 1);
  assert.equal(m.surfaced_today.byPersona.dynin, 1);
  assert.equal(m.ops.cloud_query, 1);
});

test('разрезы: transfer_by_class (unspecified честно) и receipts_by_status', () => {
  const logs = [{
    persona: 'a',
    events: [
      { verb: 'transfer_to_archive', class: 'routine' },
      { verb: 'transfer_to_archive' },
      { verb: 'receipt_close', ref: 'E', reason: 'done' },
      { verb: 'receipt_close', ref: 'M', reason: 'miss' },
    ],
  }];
  const m = metricsSnapshot(logs, '2026-07-28');
  assert.deepEqual(m.transfer_by_class, { routine: 1, unspecified: 1 });
  assert.deepEqual(m.receipts_by_status, { done: 1, miss: 1 });
});

test('sunkUnsurfaced на схеме C1: важность из importanceSnapshot/класса перетока, N параметром', () => {
  const archive = [
    { id: 'imp-old', ts: '2026-07-20T10:00:00Z', importanceSnapshot: 'normal' }, // класс insight — из события
    { id: 'pos-fresh', ts: '2026-07-27T10:00:00Z', importanceSnapshot: 'normal' },
    { id: 'routine-old', ts: '2026-07-01T10:00:00Z', importanceSnapshot: 'normal' },
    { id: 'pinned-old', ts: '2026-07-18T10:00:00Z', importanceSnapshot: 'pinned' },
    { id: 'emerged-old', ts: '2026-07-10T10:00:00Z', importanceSnapshot: 'pinned' },
  ];
  const log = [
    { verb: 'transfer_to_archive', ref: 'imp-old', class: 'insight' },
    { verb: 'transfer_to_archive', ref: 'pos-fresh', class: 'position' },
    { verb: 'transfer_to_archive', ref: 'routine-old', class: 'routine' },
    { verb: 'emerge', ref: 'emerged-old' },
  ];
  const r = sunkUnsurfaced(archive, log, 3, { today: '2026-07-28' });
  assert.deepEqual(r.ids.sort(), ['imp-old', 'pinned-old']);
  assert.equal(r.count, 2);
  assert.equal(r.N, 3);
});

test('пустые входы — честные пустые множества, не падение', () => {
  assert.deepEqual(sunkUnsurfaced([], [], 7, { today: '2026-07-28' }), { ids: [], count: 0, N: 7 });
  const m = metricsSnapshot([], '2026-07-28');
  assert.deepEqual(m.ops, {});
  assert.equal(m.surfaced_today.total, 0);
});
