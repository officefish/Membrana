import { describe, expect, it } from 'vitest';

import { resolveCaptureTransitionToast } from './captureToasts';

const capture = (mode: 'soft' | 'hard') => ({
  mode,
  sessionId: 'sess-1',
  expiresAt: '2026-07-02T10:05:00.000Z',
});

describe('resolveCaptureTransitionToast (CT5, требование п.9)', () => {
  it('захват: warning с указанием режима — не молчаливая остановка', () => {
    const hard = resolveCaptureTransitionToast(null, capture('hard'), null);
    expect(hard?.tone).toBe('warning');
    expect(hard?.message).toContain('жёсткий');
    expect(hard?.message).toContain('остановлен');

    const soft = resolveCaptureTransitionToast(null, capture('soft'), null);
    expect(soft?.tone).toBe('warning');
    expect(soft?.message).toContain('мягкий');
  });

  it('смена режима: hard→warning, soft→info', () => {
    expect(resolveCaptureTransitionToast(capture('soft'), capture('hard'), null)?.tone).toBe(
      'warning',
    );
    expect(resolveCaptureTransitionToast(capture('hard'), capture('soft'), null)?.tone).toBe(
      'info',
    );
  });

  it('release: operator → info, ttl-expired → warning', () => {
    const operator = resolveCaptureTransitionToast(capture('soft'), null, 'operator');
    expect(operator?.tone).toBe('info');
    expect(operator?.message).toContain('отпустил');

    const ttl = resolveCaptureTransitionToast(capture('hard'), null, 'ttl-expired');
    expect(ttl?.tone).toBe('warning');
    expect(ttl?.message).toContain('TTL');
  });

  it('без перехода — null (heartbeat не спамит)', () => {
    expect(resolveCaptureTransitionToast(null, null, null)).toBeNull();
    expect(resolveCaptureTransitionToast(capture('soft'), capture('soft'), null)).toBeNull();
  });
});
