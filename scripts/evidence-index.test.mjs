/**
 * Индекс вещдоков (#1303): предикат дома «без хеша и адреса — не вещдок»,
 * honest unknown на недоступный склад, битые строки — находки.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findDuplicates, parseRegistry, recordProblems, verifyRecords } from './lib/evidence-index.mjs';

const OK = {
  id: 'ozon-receipt-3765',
  sha256: 'a'.repeat(64),
  bytes: 46551,
  addedAt: '2026-07-27',
  source: 'ozon.ru, чек №3765 от 19.07.2026',
  location: { kind: 'local', ref: 'C:/Users/x/Downloads/receipt.pdf' },
  about: 'полевой комплект: микрофон, звуковая карта, мини-ПК',
};

test('валидная запись проходит без находок', () => {
  assert.deepEqual(recordProblems(OK), []);
});

test('archivarius span:// — валидный склад для акта изъятия', () => {
  assert.deepEqual(recordProblems({
    ...OK,
    id: 'session-span-extraction',
    source: 'Archivarius span extraction',
    location: { kind: 'archivarius', ref: 'span://session-1/uuid-1' },
  }), []);
});

test('предикат дома: без хеша и без адреса — не вещдок, находки по именам', () => {
  const p1 = recordProblems({ ...OK, sha256: 'xyz' });
  assert.ok(p1.some((m) => m.includes('без хеша')));
  const p2 = recordProblems({ ...OK, location: { kind: 'affine', ref: '' } });
  assert.ok(p2.some((m) => m.includes('без адреса')));
  const p3 = recordProblems({ ...OK, source: ' ' });
  assert.ok(p3.some((m) => m.includes('происхождение')));
});

test('verify: совпадение ok, изменённый файл — hash-mismatch, пропавший — unreachable', () => {
  const rows = verifyRecords(
    [OK, { ...OK, id: 'gone' }, { ...OK, id: 'changed' }],
    (loc) => {
      if (loc.ref.includes('receipt') && rowsCall.n === 0) { rowsCall.n++; return { sha256: OK.sha256, bytes: OK.bytes }; }
      if (rowsCall.n === 1) { rowsCall.n++; return null; }
      return { sha256: 'b'.repeat(64), bytes: 1 };
    },
  );
  assert.equal(rows[0].status, 'ok');
  assert.equal(rows[1].status, 'unreachable');
  assert.equal(rows[2].status, 'hash-mismatch');
});
const rowsCall = { n: 0 };

test('verify: недоступный склад — unknown, НЕ ок', () => {
  const rows = verifyRecords([{ ...OK, location: { kind: 'affine', ref: 'doc://x' } }], () => 'skip');
  assert.equal(rows[0].status, 'unknown');
  assert.match(rows[0].detail, /не «ок»/u);
});

test('дубль содержимого под разными id — находка', () => {
  const d = findDuplicates([OK, { ...OK, id: 'same-bytes-other-id' }]);
  assert.equal(d.length, 1);
  assert.deepEqual(d[0].ids, ['ozon-receipt-3765', 'same-bytes-other-id']);
});

test('parseRegistry: битая строка — находка с номером, не молчаливый пропуск', () => {
  const { records, broken } = parseRegistry(`${JSON.stringify(OK)}\n{битый json\n${JSON.stringify({ id: 'no-hash' })}\n`);
  assert.equal(records.length, 1);
  assert.equal(broken.length, 2);
  assert.equal(broken[0].line, 2);
  assert.ok(broken[1].error.includes('хеша'));
});
