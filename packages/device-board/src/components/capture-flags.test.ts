import { describe, expect, it } from 'vitest';

import { isDeviceCaptureActive, resolveDeviceCaptureFlags } from './capture-flags.js';

const nowMs = Date.parse('2026-07-02T10:00:00.000Z');
const liveCapture = (mode: 'soft' | 'hard') => ({
  mode,
  sessionId: 'sess-1',
  expiresAt: '2026-07-02T10:05:00.000Z',
});

describe('resolveDeviceCaptureFlags (tariff v2, канон §4.2)', () => {
  it('отпущено: полная автономия поля', () => {
    expect(resolveDeviceCaptureFlags(null, nowMs)).toEqual({
      captured: false,
      mode: null,
      allowFieldRun: true,
      allowFieldStop: true,
      allowFieldEdit: true,
      allowFieldPause: true,
    });
  });

  it('мягкий: run/stop разрешены (last-write-win), edit и пауза заблокированы', () => {
    expect(resolveDeviceCaptureFlags(liveCapture('soft'), nowMs)).toEqual({
      captured: true,
      mode: 'soft',
      allowFieldRun: true,
      allowFieldStop: true,
      allowFieldEdit: false,
      allowFieldPause: false,
    });
  });

  it('жёсткий: только emergency stop (инвариант §3.3)', () => {
    const flags = resolveDeviceCaptureFlags(liveCapture('hard'), nowMs);
    expect(flags.captured).toBe(true);
    expect(flags.allowFieldRun).toBe(false);
    expect(flags.allowFieldStop).toBe(true);
    expect(flags.allowFieldEdit).toBe(false);
    expect(flags.allowFieldPause).toBe(false);
  });

  it('протухший захват (TTL) эквивалентен отпущенному', () => {
    const expired = { ...liveCapture('hard'), expiresAt: '2026-07-02T09:59:59.000Z' };
    expect(isDeviceCaptureActive(expired, nowMs)).toBe(false);
    expect(resolveDeviceCaptureFlags(expired, nowMs).captured).toBe(false);
    expect(resolveDeviceCaptureFlags(expired, nowMs).allowFieldRun).toBe(true);
  });

  it('stop разрешён во всех трёх состояниях', () => {
    for (const capture of [null, liveCapture('soft'), liveCapture('hard')]) {
      expect(resolveDeviceCaptureFlags(capture, nowMs).allowFieldStop).toBe(true);
    }
  });
});
