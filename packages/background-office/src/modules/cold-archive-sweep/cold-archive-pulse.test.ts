/**
 * Зубы пульса уборщика (#2632 g5b; Т1, Т6). Порчи: порог не 2 ч → красный; `>=` вместо `>` (ровно 2 ч —
 * тревога) → красный; «ни разу» как ok → красный; выключено спрашивает media → красный; кривые даты
 * media как «ни разу» (null) → красный.
 */
import { describe, expect, it, vi } from 'vitest';

import { PULSE_STALE_AFTER_MS, pulseOf, readPulse } from './cold-archive-pulse';
import type { JournalOutcome } from './cold-archive-sweep.client';

const NOW = new Date('2026-11-20T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const H = 60 * 60 * 1000;

describe('pulseOf(mode, lastSucceededRunAt, now)', () => {
  it('порог Т1 — ДОЛЬШЕ двух часов', () => {
    expect(PULSE_STALE_AFTER_MS).toBe(2 * H);
    for (const mode of ['dry-run', 'live'] as const) {
      expect(pulseOf(mode, ago(0), NOW)).toBe('ok');
      expect(pulseOf(mode, ago(2 * H), NOW)).toBe('ok');
      expect(pulseOf(mode, ago(2 * H + 1), NOW)).toBe('stale');
      expect(pulseOf(mode, null, NOW)).toBe('stale');
    }
  });

  it('Т6: выключено — disabled при любом журнале', () => {
    expect(pulseOf('disabled', null, NOW)).toBe('disabled');
    expect(pulseOf('disabled', ago(10 * H), NOW)).toBe('disabled');
    expect(pulseOf('disabled', ago(0), NOW)).toBe('disabled');
  });
});

describe('readPulse', () => {
  const clientOf = (outcome: JournalOutcome) => ({ pulse: vi.fn(async () => outcome) });

  it('выключено → media не спрашивается, вид disabled с пустыми датами', async () => {
    const client = clientOf({ kind: 'ok', body: {} });
    expect(await readPulse('disabled', client, NOW)).toEqual({
      kind: 'ok',
      view: { mode: 'disabled', pulse: 'disabled', staleAfterMs: 2 * H, lastSucceededRunAt: null, lastFinishedRunAt: null, checkedAt: NOW.toISOString() },
    });
    expect(client.pulse).toHaveBeenCalledTimes(0);
  });

  it('включено → режим по флагам и пульс по датам media', async () => {
    const body = { lastSucceededRunAt: ago(3 * H).toISOString(), lastFinishedRunAt: ago(H).toISOString() };
    expect(await readPulse('live', clientOf({ kind: 'ok', body }), NOW)).toEqual({
      kind: 'ok',
      view: { mode: 'live', pulse: 'stale', staleAfterMs: 2 * H, ...body, checkedAt: NOW.toISOString() },
    });
    const fresh = await readPulse('dry-run', clientOf({ kind: 'ok', body: { lastSucceededRunAt: ago(H).toISOString(), lastFinishedRunAt: null } }), NOW);
    expect(fresh.kind === 'ok' && fresh.view.pulse).toBe('ok');
  });

  it('отказ media — как есть; кривая форма (не строка, не дата, поле пропущено) → media-unreachable, не «ни разу»', async () => {
    const rejected = { kind: 'media-rejected', status: 401, code: null } as const;
    expect(await readPulse('live', clientOf(rejected), NOW)).toEqual(rejected);
    for (const body of [{ lastSucceededRunAt: 'вчера', lastFinishedRunAt: null }, { lastSucceededRunAt: 5, lastFinishedRunAt: null }, { lastFinishedRunAt: null }, null]) {
      expect(await readPulse('live', clientOf({ kind: 'ok', body }), NOW)).toEqual({ kind: 'media-unreachable', detail: 'unexpected pulse shape from media' });
    }
  });
});
