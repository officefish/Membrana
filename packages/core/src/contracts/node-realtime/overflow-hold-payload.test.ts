import { describe, expect, it } from 'vitest';

import { parseRuntimeOverflowHoldPayload } from './validate-payloads.js';

/**
 * #2309 (M4 (б)): значение «остановлен: буфер полон» в runtime.state — отдельное,
 * с фазой удержания, причиной, overflowId и временем факта.
 */
describe('parseRuntimeOverflowHoldPayload', () => {
  const held = {
    phase: 'held',
    reason: 'device_buffer_full',
    overflowId: 'ovf-1',
    overflowAt: '2026-09-05T21:40:18.000Z',
    policy: 'stop',
  };

  it('принимает подтверждённый эпизод с серверным id', () => {
    expect(parseRuntimeOverflowHoldPayload(held)).toEqual(held);
  });

  it('принимает локальный эпизод без id (held_local)', () => {
    const local = { ...held, phase: 'held_local', overflowId: null };
    expect(parseRuntimeOverflowHoldPayload(local)).toEqual(local);
  });

  it('null / undefined = удержания нет', () => {
    expect(parseRuntimeOverflowHoldPayload(null)).toBeNull();
    expect(parseRuntimeOverflowHoldPayload(undefined)).toBeNull();
  });

  it('порча: held без overflowId — противоречие → null', () => {
    expect(parseRuntimeOverflowHoldPayload({ ...held, overflowId: null })).toBeNull();
  });

  it('порча: неизвестная фаза / политика / пустая причина / кривое время → null', () => {
    expect(parseRuntimeOverflowHoldPayload({ ...held, phase: 'stopped' })).toBeNull();
    expect(parseRuntimeOverflowHoldPayload({ ...held, policy: 'auto-cleanup' })).toBeNull();
    expect(parseRuntimeOverflowHoldPayload({ ...held, reason: '' })).toBeNull();
    expect(parseRuntimeOverflowHoldPayload({ ...held, overflowAt: 'вчера' })).toBeNull();
    expect(parseRuntimeOverflowHoldPayload({ ...held, overflowId: 42 })).toBeNull();
  });
});
