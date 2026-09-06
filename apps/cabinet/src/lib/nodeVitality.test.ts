import { NODE_RECENT_PRESENCE_WINDOW_MS, type RuntimeOverflowHoldPayload } from '@membrana/core';
import { describe, expect, it } from 'vitest';

import {
  NODE_DEAD_SILENCE_MS,
  isNodeDead,
  isNodeStoppedBufferFull,
  resolveNodeVitality,
} from './nodeCardStatus';

const HELD: RuntimeOverflowHoldPayload = {
  phase: 'held',
  reason: 'device_buffer_full',
  overflowId: 'ovf-1',
  overflowAt: '2026-09-05T21:40:18.000Z',
  policy: 'stop',
};

const HELD_LOCAL: RuntimeOverflowHoldPayload = { ...HELD, phase: 'held_local', overflowId: null };

const NOW = 1_800_000_000_000;

/** M4 (в), #2309: dead vs stopped_buffer_full — без опоры на молчание телеметрии. */
describe('предикаты кабинета dead / stopped_buffer_full', () => {
  it('порог назван один — presence-окно 300 с', () => {
    expect(NODE_DEAD_SILENCE_MS).toBe(300_000);
    expect(NODE_DEAD_SILENCE_MS).toBe(NODE_RECENT_PRESENCE_WINDOW_MS);
  });

  it.each([
    // presenceOnline, silenceMs, hold, expected
    [true, 0, null, 'alive'],
    [true, 0, HELD, 'stopped_buffer_full'],
    [true, 0, HELD_LOCAL, 'alive'],
    [true, 299_999, HELD, 'stopped_buffer_full'],
    [true, 300_001, HELD, 'dead'],
    [true, 300_001, null, 'dead'],
    [false, 0, HELD, 'dead'],
    [false, 0, null, 'dead'],
  ] as const)(
    'presence=%s silence=%sms hold=%o → %s',
    (presenceOnline, silenceMs, overflowHold, expected) => {
      expect(
        resolveNodeVitality({
          presenceOnline,
          lastPresenceAtMs: NOW - silenceMs,
          nowMs: NOW,
          overflowHold,
        }),
      ).toBe(expected);
    },
  );

  it('без времени последнего heartbeat судим только по presence', () => {
    expect(isNodeDead({ presenceOnline: true, lastPresenceAtMs: null, nowMs: NOW })).toBe(false);
    expect(isNodeDead({ presenceOnline: false, lastPresenceAtMs: null, nowMs: NOW })).toBe(true);
  });

  it('штатный стоп требует линк ∧ удержание ∧ overflowId (порча: id пустой → не стоп)', () => {
    const base = { presenceOnline: true, lastPresenceAtMs: NOW, nowMs: NOW };
    expect(isNodeStoppedBufferFull({ ...base, overflowHold: HELD })).toBe(true);
    expect(isNodeStoppedBufferFull({ ...base, overflowHold: { ...HELD, overflowId: '' } })).toBe(false);
    expect(isNodeStoppedBufferFull({ ...base, overflowHold: HELD_LOCAL })).toBe(false);
    expect(isNodeStoppedBufferFull({ ...base, overflowHold: undefined })).toBe(false);
    // Мёртвый узел с удержанием — dead, а не «штатно остановлен»: stop сохраняет линк.
    expect(isNodeStoppedBufferFull({ ...base, presenceOnline: false, overflowHold: HELD })).toBe(false);
  });

  it('молчание телеметрии в предикате не участвует: нет входа для неё', () => {
    const input = { presenceOnline: true, lastPresenceAtMs: NOW, nowMs: NOW, overflowHold: null };
    expect(Object.keys(input)).not.toContain('lastTelemetryAtMs');
    expect(resolveNodeVitality(input)).toBe('alive');
  });
});
