import { describe, expect, it } from 'vitest';

import { UUID_V7_PATTERN, uuidV7 } from './run-id.js';

const fixed = (fill: number) => (size: number) => new Uint8Array(size).fill(fill);

describe('uuidV7 — runId прогона', () => {
  it('форма v7 и вариант RFC 4122; детерминирован при данных времени и случайности', () => {
    const a = uuidV7(1_755_590_400_000, fixed(0xab));
    expect(a).toMatch(UUID_V7_PATTERN);
    expect(uuidV7(1_755_590_400_000, fixed(0xab))).toBe(a);
  });

  it('монотонен по миллисекундам: позже — лексикографически больше', () => {
    const t0 = 1_755_590_400_000;
    const early = uuidV7(t0, fixed(0xff));
    const late = uuidV7(t0 + 1, fixed(0x00));
    expect(late > early).toBe(true);
  });

  it('время вне 48 бит и кривой источник случайности — отказ, не тихий мусор', () => {
    expect(() => uuidV7(-1)).toThrow(/вне 48 бит/u);
    expect(() => uuidV7(1, () => new Uint8Array(4))).toThrow(/16 байт/u);
  });

  it('со штатными часами и случайностью — валидный v7', () => {
    expect(uuidV7()).toMatch(UUID_V7_PATTERN);
  });
});
