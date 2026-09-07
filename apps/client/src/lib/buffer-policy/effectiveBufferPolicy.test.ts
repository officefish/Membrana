/**
 * Зубы чистого разбора (#2308, блок B). Предмет — `effectiveBufferPolicy.ts`.
 * Порча: вернуть дефолт автоочистки на ⊥ → красный; принять smart без S → красный.
 *
 * #2318 (гейт до T12): умная очистка с ПОЛНЫМ S из ответа сервера → `stop`, источник `gated`
 * (порча: снять fail-closed → красный); гейт раньше полноты S; переключатель словаря выключен.
 * Ветка полноты параметров проверяется опцией `LIFTED`, не переворотом словаря.
 */
import { SMART_CLEANUP_AVAILABLE } from '@membrana/plugin-contracts';
import { describe, expect, it } from 'vitest';

import { effectiveBufferPolicy, isSmartCleanupGated, parseBufferPolicy } from './effectiveBufferPolicy';
import { quotaRoot } from './quotaSourceFixture';
import { BUFFER_POLICY_MODES, STOP_POLICY } from './types';

const FULL = { thresholdPercent: 90, selection: 'oldest_first', protectLabeled: true };
/** #2318: опция «гейт снят» — только для зубов ветки полноты; умолчание — переключатель словаря. */
const LIFTED = { smartCleanupAvailable: true } as const;

describe('#2318 — fail-closed читателя до T12', () => {
  it('переключатель словаря выключен; smart с полным S → stop, источник gated (порча: снять → красный)', () => {
    expect(SMART_CLEANUP_AVAILABLE).toBe(false);
    expect(effectiveBufferPolicy(quotaRoot({ mode: 'smart_cleanup', params: FULL }))).toEqual({
      policy: STOP_POLICY,
      source: 'gated',
    });
    expect(effectiveBufferPolicy({ mode: 'smart_cleanup', params: FULL })).toEqual({ policy: STOP_POLICY, source: 'gated' });
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: FULL })).toBeNull();
  });

  it('гейт раньше полноты S: smart с дырявым S при закрытом гейте — тоже gated, не malformed', () => {
    expect(effectiveBufferPolicy(quotaRoot({ mode: 'smart_cleanup', params: null }))).toEqual({
      policy: STOP_POLICY,
      source: 'gated',
    });
    expect(isSmartCleanupGated({ mode: 'smart_cleanup' })).toBe(true);
    expect(isSmartCleanupGated({ mode: 'smart_cleanup' }, LIFTED)).toBe(false);
    expect(isSmartCleanupGated({ mode: 'stop' })).toBe(false);
  });

  it('гейт не трогает stop и не делает порчу «gated»', () => {
    expect(effectiveBufferPolicy(quotaRoot({ mode: 'stop', params: null }))).toEqual({ policy: STOP_POLICY, source: 'server' });
    expect(effectiveBufferPolicy(quotaRoot({ mode: 'auto-cleanup' }))).toEqual({ policy: STOP_POLICY, source: 'malformed' });
    expect(effectiveBufferPolicy(quotaRoot(undefined))).toEqual({ policy: STOP_POLICY, source: 'malformed' });
  });
});

describe('effectiveBufferPolicy', () => {
  it('effective(⊥) = stop, причина названа (порча: auto-cleanup → красный)', () => {
    for (const raw of [undefined, null, {}, '', 0, [], 'stop']) {
      expect(effectiveBufferPolicy(raw)).toEqual({ policy: STOP_POLICY, source: 'malformed' });
    }
  });

  it('корень /quota без поля bufferPolicy (старый сервер) → stop', () => {
    expect(effectiveBufferPolicy(quotaRoot(undefined))).toEqual({ policy: STOP_POLICY, source: 'malformed' });
  });

  it('корень /quota с политикой сервера → как есть, source=server (smart — в ветке «гейт снят», #2318)', () => {
    expect(effectiveBufferPolicy(quotaRoot({ mode: 'smart_cleanup', params: FULL }), LIFTED)).toEqual({
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

  it('effective(порча) = stop: чужой режим, легаси auto-cleanup, smart с дырявым S (ветка «гейт снят»: дырявый S — порча, не гейт)', () => {
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
      expect(effectiveBufferPolicy(quotaRoot(bad), LIFTED), JSON.stringify(bad)).toEqual({
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
