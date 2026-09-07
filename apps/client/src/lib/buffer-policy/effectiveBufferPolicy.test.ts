/**
 * Зубы чистого разбора (#2308, блок B). Предмет — `effectiveBufferPolicy.ts`.
 * Порча: вернуть дефолт автоочистки на ⊥ → красный; принять smart без S → красный.
 */
import { describe, expect, it } from 'vitest';

import { effectiveBufferPolicy, parseBufferPolicy } from './effectiveBufferPolicy';
import { quotaRoot } from './stubs/quota-source.stub';
import { BUFFER_POLICY_MODES, STOP_POLICY } from './types';

const FULL = { thresholdPercent: 90, selection: 'oldest_first', protectLabeled: true };

describe('effectiveBufferPolicy', () => {
  it('effective(⊥) = stop, причина названа (порча: auto-cleanup → красный)', () => {
    for (const raw of [undefined, null, {}, '', 0, [], 'stop']) {
      expect(effectiveBufferPolicy(raw)).toEqual({ policy: STOP_POLICY, source: 'malformed' });
    }
  });

  it('корень /quota без поля bufferPolicy (старый сервер) → stop', () => {
    expect(effectiveBufferPolicy(quotaRoot(undefined))).toEqual({ policy: STOP_POLICY, source: 'malformed' });
  });

  it('корень /quota с политикой сервера → как есть, source=server', () => {
    expect(effectiveBufferPolicy(quotaRoot({ mode: 'smart_cleanup', params: FULL }))).toEqual({
      policy: { mode: 'smart_cleanup', params: FULL },
      source: 'server',
    });
    expect(effectiveBufferPolicy(quotaRoot({ mode: 'stop', params: null }))).toEqual({
      policy: STOP_POLICY,
      source: 'server',
    });
  });

  it('сам объект политики тоже принимается', () => {
    expect(effectiveBufferPolicy({ mode: 'stop' })).toEqual({ policy: STOP_POLICY, source: 'server' });
  });

  it('effective(порча) = stop: чужой режим, легаси auto-cleanup, smart с дырявым S', () => {
    for (const bad of [
      { mode: 'auto-cleanup' },
      { mode: 'delete_all' },
      { mode: 'smart_cleanup' },
      { mode: 'smart_cleanup', params: null },
      { mode: 'smart_cleanup', params: { thresholdPercent: 90 } },
      { mode: 'smart_cleanup', params: { ...FULL, thresholdPercent: 0 } },
      { mode: 'smart_cleanup', params: { ...FULL, selection: 'random' } },
      { mode: 'smart_cleanup', params: { ...FULL, protectLabeled: 'yes' } },
    ]) {
      expect(effectiveBufferPolicy(quotaRoot(bad)), JSON.stringify(bad)).toEqual({
        policy: STOP_POLICY,
        source: 'malformed',
      });
    }
  });

  it('parseBufferPolicy отдаёт только два режима словаря, и автоочистки среди них нет', () => {
    expect([...BUFFER_POLICY_MODES]).toEqual(['stop', 'smart_cleanup']);
    expect(parseBufferPolicy({ mode: 'auto-cleanup' })).toBeNull();
    expect(parseBufferPolicy({ mode: 'stop', params: FULL })).toEqual(STOP_POLICY);
  });
});
