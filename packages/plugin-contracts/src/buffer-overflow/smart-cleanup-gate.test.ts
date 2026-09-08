/**
 * Зуб переключателя умной очистки (#2318, долг D-1). Предмет — `smart-cleanup-gate.ts` и оба
 * бареля (`buffer-overflow/index.ts`, `src/index.ts`).
 *
 * Порчи → красный: перевернуть `SMART_CLEANUP_AVAILABLE` без T12 (зуб ниже — сознательно
 * ЖЁСТКИЙ: когда T12 появится, его переворачивают вместе с константой, и это правильная цена —
 * снятие гейта не должно проходить молча); причина не в snake_case; причина попала в словарь
 * отказа ЗАГРУЗКИ (другая дверь); константа не доехала до бареля пакета.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import * as pkg from '../index.js';
import {
  BUFFER_OVERFLOW_REASONS,
  SMART_CLEANUP_AVAILABLE,
  SMART_CLEANUP_UNAVAILABLE_REASON,
  isBufferOverflowReason,
  type SmartCleanupAvailability,
  type SmartCleanupUnavailableReason,
} from './index.js';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

describe('SMART_CLEANUP_AVAILABLE — гейт до T12', () => {
  it('выключен: алгоритма и параметров умной очистки не существует (данность T12)', () => {
    expect(SMART_CLEANUP_AVAILABLE).toBe(false);
  });

  it('тип — литерал, не boolean: переворот здесь красит зеркала CJS-серверов на tsc', () => {
    expectTypeOf<Equal<SmartCleanupAvailability, false>>().toEqualTypeOf<true>();
  });
});

describe('SMART_CLEANUP_UNAVAILABLE_REASON — причина отказа записи', () => {
  it('snake_case, литерал совпадает с типом', () => {
    expect(SMART_CLEANUP_UNAVAILABLE_REASON).toBe('smart_cleanup_unavailable');
    expect(SMART_CLEANUP_UNAVAILABLE_REASON).toMatch(/^[a-z]+(?:_[a-z]+)*$/u);
    expectTypeOf<Equal<SmartCleanupUnavailableReason, 'smart_cleanup_unavailable'>>().toEqualTypeOf<true>();
  });

  it('НЕ входит в словарь отказа загрузки (M2): запись настройки — другая дверь', () => {
    expect(Object.values(BUFFER_OVERFLOW_REASONS)).not.toContain(SMART_CLEANUP_UNAVAILABLE_REASON);
    expect(isBufferOverflowReason(SMART_CLEANUP_UNAVAILABLE_REASON)).toBe(false);
  });
});

describe('барель пакета', () => {
  it('переключатель и причина экспортированы поимённо из корня пакета', () => {
    expect(pkg.SMART_CLEANUP_AVAILABLE).toBe(SMART_CLEANUP_AVAILABLE);
    expect(pkg.SMART_CLEANUP_UNAVAILABLE_REASON).toBe(SMART_CLEANUP_UNAVAILABLE_REASON);
  });
});
