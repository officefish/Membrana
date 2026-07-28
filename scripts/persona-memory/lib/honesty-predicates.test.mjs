/**
 * Зуб канона анти-подделки (P4; межа сшивки №4): forge-фикстуры красные → на тех
 * же прожитых событиях зелёные; n/a ≠ 0.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { metricsForged, naVsZero, receiptForged, unbackedClaim } from './honesty-predicates.mjs';

const E_OK_LOG = [
  { verb: 'evening_compress', persona: 'dynin' },
  { verb: 'transfer_to_archive', persona: 'dynin', ref: 'rec-1' },
  { verb: 'rebuild_report', persona: 'dynin' },
  { verb: 'receipt_close', persona: 'dynin', ref: 'E', reason: 'done' },
];

test('forge_done: квитанция без прожитых событий красная → с ними зелёная (один канон)', () => {
  const receipt = { slot: 'E', status: 'done', transfer_applied: true };
  const forged = receiptForged(receipt, []);
  assert.equal(forged.forged, true);
  assert.ok(forged.reasons.some((r) => r.includes('forge_done')));
  assert.deepEqual(receiptForged(receipt, E_OK_LOG), { forged: false, reasons: [] });
});

test('done(E) без transfer_applied — подделка по C4 даже при живом логе', () => {
  const r = receiptForged({ slot: 'E', status: 'done' }, E_OK_LOG);
  assert.equal(r.forged, true);
  assert.ok(r.reasons.some((x) => x.includes('transfer_applied')));
});

test('done(M) требует прожитого morning_warmup', () => {
  const r = receiptForged({ slot: 'M', status: 'done' }, [{ verb: 'receipt_close', ref: 'M', reason: 'done' }]);
  assert.equal(r.forged, true);
  assert.ok(r.reasons.some((x) => x.includes('morning_warmup')));
});

test('forge_metrics: счётчик сверх лога красный → сходящийся зелёный (тот же канон)', () => {
  const log = [{ verb: 'emerge' }, { verb: 'emerge' }];
  const forged = metricsForged({ ops: { emerge: 5 } }, log);
  assert.equal(forged.forged, true);
  assert.ok(forged.reasons.some((r) => r.includes('forge_metrics')));
  assert.deepEqual(metricsForged({ ops: { emerge: 2 } }, log), { forged: false, reasons: [] });
});

test('оба лица зовут одно ядро unbackedClaim (межа №4: не две параллельные нормы)', () => {
  assert.equal(unbackedClaim(1, 0), true);
  assert.equal(unbackedClaim(2, 2), false);
});

test('n/a ≠ 0: нули без лога — подделка пустоты; при живом логе ноль валиден', () => {
  const bad = naVsZero({ ops: { emerge: 0, reject: 0 } }, false);
  assert.equal(bad.ok, false);
  assert.equal(bad.problems.length, 2);
  assert.ok(naVsZero({ ops: { emerge: 'n/a (no log)' } }, false).ok);
  assert.ok(naVsZero({ ops: { emerge: 0 } }, true).ok);
});
