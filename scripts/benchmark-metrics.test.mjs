import assert from 'node:assert/strict';
import test from 'node:test';

import {
  confusionFromPairs,
  f1Score,
  formatPct,
  percentile,
  precision,
  recall,
  sortNumbers,
} from './lib/benchmark-metrics.mjs';

test('confusionFromPairs', () => {
  const { tp, fp, fn, tn } = confusionFromPairs([
    { truthDrone: true, predDrone: true },
    { truthDrone: true, predDrone: false },
    { truthDrone: false, predDrone: true },
    { truthDrone: false, predDrone: false },
  ]);
  assert.equal(tp, 1);
  assert.equal(fn, 1);
  assert.equal(fp, 1);
  assert.equal(tn, 1);
});

test('precision recall f1', () => {
  const prec = precision(8, 2);
  const rec = recall(8, 2);
  assert.ok(Math.abs(prec - 0.8) < 1e-9);
  assert.ok(Math.abs(rec - 0.8) < 1e-9);
  assert.ok(Math.abs(f1Score(prec, rec) - 0.8) < 1e-9);
});

test('percentile', () => {
  const sorted = sortNumbers([10, 20, 30, 40, 100]);
  assert.equal(percentile(sorted, 50), 30);
  assert.equal(percentile(sorted, 95), 100);
});

test('formatPct', () => {
  assert.equal(formatPct(0.856), '85.6%');
  assert.equal(formatPct(null), '—');
});
