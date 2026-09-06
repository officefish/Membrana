import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FULL_THRESHOLD_BYTES,
  REFERENCE_RATE_BPS,
  formatWatchLine,
  parseArgs,
  watchLine,
} from './buffer-watch.mjs';

const GIB = 1_073_741_824;
const T0 = Date.parse('2026-09-05T18:23:10.000Z');

test('#2284 первая строка: скорости своей нет — ETA по опорной и ПОМЕЧЕН как опорный', () => {
  const l = watchLine({ now: T0, usedBytes: 0, limitBytes: GIB, prev: null });
  assert.equal(l.rateSource, 'reference');
  assert.equal(l.ratePerSec, null, 'своей скорости на первой строке нет — и она не выдумывается');
  assert.equal(l.status, 'filling');
  // 1 ГиБ / 90 758 байт/с ≈ 11 831 с ≈ 3 ч 17 мин — то, что ночь 05.09 и показала.
  assert.equal(l.etaSec, Math.round(GIB / REFERENCE_RATE_BPS));
  assert.ok(l.etaSec > 3 * 3600 && l.etaSec < 3.5 * 3600, `ETA ${l.etaSec} с — не похоже на ночь 05.09`);
});

test('#2284 вторая строка: скорость по разности чтений, источник measured', () => {
  const prev = { ts: T0, usedBytes: 100_000_000 };
  const now = T0 + 5 * 60_000; // 5 минут
  const used = 100_000_000 + 5 * 60 * 90_000; // 90 000 байт/с
  const l = watchLine({ now, usedBytes: used, limitBytes: GIB, prev });
  assert.equal(l.rateSource, 'measured');
  assert.equal(l.ratePerSec, 90_000);
  assert.equal(l.etaSec, Math.round((GIB - used) / 90_000));
  assert.equal(l.fullAt, new Date(now + l.etaSec * 1000).toISOString());
});

test('#2284 полон: свободного меньше одной пробы — status full, ETA 0, а не «ещё 3 секунды»', () => {
  const l = watchLine({ now: T0, usedBytes: 1_073_433_604, limitBytes: GIB, prev: null });
  assert.equal(GIB - 1_073_433_604 < FULL_THRESHOLD_BYTES, true, 'фикстура: ровно ночь 05.09');
  assert.equal(l.status, 'full');
  assert.equal(l.etaSec, 0);
  assert.match(formatWatchLine(l), /ПОЛОН/u);
});

test('#2284 не заполняется: разность ≤ 0 — idle, ETA null; опорной скоростью НЕ подменяется', () => {
  const prev = { ts: T0, usedBytes: 500_000_000 };
  const l = watchLine({ now: T0 + 60_000, usedBytes: 500_000_000, limitBytes: GIB, prev });
  assert.equal(l.status, 'idle');
  assert.equal(l.etaSec, null);
  assert.equal(l.fullAt, null);
  assert.match(formatWatchLine(l), /не заполняется/u);
});

test('#2284 ПОРЧА: нечитаемая квота — отказ, а не строка с нулями', () => {
  assert.throws(() => watchLine({ now: T0, usedBytes: NaN, limitBytes: GIB }), /нечитаема/u);
  assert.throws(() => watchLine({ now: T0, usedBytes: 10, limitBytes: 0 }), /нечитаема/u);
  assert.throws(() => watchLine({ now: T0, usedBytes: 10, limitBytes: undefined }), /нечитаема/u);
});

test('#2284 parseArgs: --once = один раз; кривой интервал — отказ', () => {
  assert.equal(parseArgs(['--once']).count, 1);
  assert.equal(parseArgs(['--interval-min', '1', '--count', '2']).count, 2);
  assert.throws(() => parseArgs(['--interval-min', '0']), /interval-min/u);
  assert.throws(() => parseArgs(['--count', 'abc']), /count/u);
});
