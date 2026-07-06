import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldRunWeeklyPlan } from './plan-week-if-monday.mjs';

test('понедельник → запускать', () => {
  const monday = new Date(2026, 6, 6); // 2026-07-06 — понедельник
  assert.equal(monday.getDay(), 1);
  assert.equal(shouldRunWeeklyPlan(monday), true);
});

test('вторник–воскресенье → пропуск', () => {
  for (let offset = 1; offset <= 6; offset++) {
    const day = new Date(2026, 6, 6 + offset);
    assert.equal(shouldRunWeeklyPlan(day), false, `день ${day.toDateString()}`);
  }
});

test('--force запускает в любой день', () => {
  const sunday = new Date(2026, 6, 5);
  assert.equal(shouldRunWeeklyPlan(sunday, true), true);
});
