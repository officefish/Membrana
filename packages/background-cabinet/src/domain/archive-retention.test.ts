/**
 * Зубы домена срока хранения архива понижения (#2588 b1, порча P1–P4 плана
 * `docs/sprint/cut/cold-archive-retention-2588.json`).
 *
 * Красные на стволе a7ba5f9b: модуля нет — import падает. Порчи после реализации:
 * P1 умолчание 0/1 → красный; P2 снять проверку списка → красный (вернётся 2 — удаление
 * раньше срока); P3 добавить/убрать значение → красный; P4 ослабить до `> 0` → красный.
 */
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RETENTION_DAYS,
  InvalidRetentionDaysError,
  RETENTION_DAYS,
  TEST_RETENTION_DAYS,
  isValidRetentionDays,
  resolveRetentionDays,
} from './archive-retention';

describe('resolveRetentionDays — P1 отсутствие строки = умолчание', () => {
  it('null → 14', () => {
    expect(resolveRetentionDays(null)).toBe(14);
  });

  it('undefined → 14', () => {
    expect(resolveRetentionDays(undefined)).toBe(14);
  });

  it('значение из списка возвращается как есть', () => {
    expect(resolveRetentionDays(1)).toBe(1);
    expect(resolveRetentionDays(90)).toBe(90);
  });
});

describe('resolveRetentionDays — P2 вне списка → 14 (fail-safe хранения)', () => {
  it.each([0, 2, 15, -1, Number.NaN, '14', 14.5, Infinity])('%p → 14', (stored) => {
    expect(resolveRetentionDays(stored)).toBe(14);
  });
});

describe('RETENTION_DAYS — P3 закрытый список', () => {
  it('ровно [1, 7, 14, 30, 90] в этом порядке', () => {
    expect([...RETENTION_DAYS]).toEqual([1, 7, 14, 30, 90]);
  });

  it('умолчание 14 и тестовый 1 входят в список', () => {
    expect(DEFAULT_RETENTION_DAYS).toBe(14);
    expect(TEST_RETENTION_DAYS).toBe(1);
    expect(RETENTION_DAYS).toContain(DEFAULT_RETENTION_DAYS);
    expect(RETENTION_DAYS).toContain(TEST_RETENTION_DAYS);
  });
});

describe('isValidRetentionDays — P4', () => {
  it.each([0, -1, 2, '14', 14.5, null, undefined, Number.NaN])('отвергает %p', (value) => {
    expect(isValidRetentionDays(value)).toBe(false);
  });

  it.each([1, 7, 14, 30, 90])('принимает %p', (value) => {
    expect(isValidRetentionDays(value)).toBe(true);
  });
});

describe('InvalidRetentionDaysError', () => {
  it('несёт код и полученное значение, называет список', () => {
    const err = new InvalidRetentionDaysError(2);
    expect(err.code).toBe('invalid_retention_days');
    expect(err.received).toBe(2);
    expect(err.message).toBe('retention days must be one of 1, 7, 14, 30, 90; received 2');
    expect(err).toBeInstanceOf(Error);
  });
});
