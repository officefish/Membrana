/**
 * Зуб op-log (P4/C5): словарь закрыт, чужой глагол — красный, схема записи чистая.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OP_VERBS, buildOpEntry, opLogRel, parseOpLog } from './op-log.mjs';

test('словарь закрыт: ровно 10 глаголов вердикта C5', () => {
  assert.equal(OP_VERBS.length, 10);
  assert.deepEqual(
    [...OP_VERBS].sort(),
    ['cloud_query', 'emerge', 'evening_compress', 'morning_warmup', 'receipt_close', 'rebuild_report', 'reject', 'surface_invoke', 'transfer_to_archive', 'write_operational'].sort(),
  );
});

test('чужой глагол — throw с текстом межи №3, не warn', () => {
  assert.throws(() => buildOpEntry({ persona: 'dynin', verb: 'forget_everything' }), /вне закрытого словаря C5/u);
  assert.throws(() => buildOpEntry({ persona: 'dynin', verb: 'erase' }), /межа/u);
});

test('запись — ровно схема C5; лишние поля входа не протекают; class только у transfer', () => {
  const e = buildOpEntry({ persona: 'angelina', verb: 'emerge', ref: 'rec-1', reason: 'по повестке', origin: 'agenda', class: 'insight', мусор: 'x' });
  assert.deepEqual(Object.keys(e).sort(), ['origin', 'persona', 'reason', 'ref', 'ts', 'verb'].sort());
  const t = buildOpEntry({ persona: 'dynin', verb: 'transfer_to_archive', ref: 'rec-2', reason: 'вытеснение из O', class: 'routine' });
  assert.equal(t.class, 'routine');
});

test('persona обязательна; home — из path-схемы каркаса (HOMES), не свой', () => {
  assert.throws(() => buildOpEntry({ verb: 'emerge' }), /persona/u);
  assert.equal(opLogRel('dynin', '2026-07-28'), 'docs/virtual-team/memory/op-log/dynin/2026-07-28.jsonl');
});

test('parseOpLog: битая строка — находка с номером, не молчаливый пропуск', () => {
  const { events, broken } = parseOpLog('{"verb":"emerge"}\nкривая\n{"verb":"reject"}');
  assert.equal(events.length, 2);
  assert.deepEqual(broken, [2]);
});
