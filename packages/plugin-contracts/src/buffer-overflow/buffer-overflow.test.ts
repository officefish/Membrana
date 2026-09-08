/**
 * Зубы словаря отказа (M2, #2307). Предмет — `reasons.ts` и `refusal.ts`.
 *
 * Порчи, дающие красный: третий литерал в `BUFFER_OVERFLOW_REASONS` → `Equal` и «ровно два»
 * красные; принять `quota_exceeded` предикатом → красный; `ok: true` или отсутствующая ось в
 * теле → `isBufferOverflowRefusal` обязан вернуть false.
 *
 * Типовые утверждения — через условный тип `Equal`, вычисляемый в `true`: падают на
 * `tsc -p tsconfig.test.json`, не только в рантайме (как в `index.test.ts` пакета).
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  BUFFER_OVERFLOW_REASONS,
  OVERFLOW_POLICIES,
  QUOTA_SUBJECTS,
  isBufferOverflowReason,
  isBufferOverflowRefusal,
  isOverflowPolicy,
  type BufferOverflowReason,
  type BufferOverflowRefusal,
  type OverflowPolicy,
  type QuotaSubject,
} from './index.js';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

describe('BUFFER_OVERFLOW_REASONS — закрытый набор M2', () => {
  it('ровно два литерала, оба snake_case, различимы', () => {
    const values = Object.values(BUFFER_OVERFLOW_REASONS);
    expect(values).toHaveLength(2);
    expect(new Set(values).size).toBe(2);
    expect(values).toEqual(['device_buffer_full', 'user_storage_full']);
    for (const v of values) expect(v).toMatch(/^[a-z]+(?:_[a-z]+)*$/u);
  });

  it('тип union равен ровно двум литералам (падает на tsc при третьем)', () => {
    expectTypeOf<Equal<BufferOverflowReason, 'device_buffer_full' | 'user_storage_full'>>().toEqualTypeOf<true>();
  });

  it('предикат принимает словарь и отвергает чужое: HTTP-код, общий quota_exceeded, текст', () => {
    expect(isBufferOverflowReason(BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL)).toBe(true);
    expect(isBufferOverflowReason(BUFFER_OVERFLOW_REASONS.USER_STORAGE_FULL)).toBe(true);
    expect(isBufferOverflowReason('quota_exceeded')).toBe(false);
    expect(isBufferOverflowReason('QUOTA_EXCEEDED')).toBe(false);
    expect(isBufferOverflowReason(413)).toBe(false);
    expect(isBufferOverflowReason('Buffer storage quota exceeded')).toBe(false);
    expect(isBufferOverflowReason(undefined)).toBe(false);
  });
});

describe('OverflowPolicy и QuotaSubject', () => {
  it('политика — stop | smart_cleanup, без автоочистки клиента', () => {
    expectTypeOf<Equal<OverflowPolicy, 'stop' | 'smart_cleanup'>>().toEqualTypeOf<true>();
    expect(Object.values(OVERFLOW_POLICIES)).toEqual(['stop', 'smart_cleanup']);
    expect(isOverflowPolicy('auto-cleanup')).toBe(false);
    expect(isOverflowPolicy('stop')).toBe(true);
  });

  it('субъекты — ключи ответа /quota', () => {
    expectTypeOf<Equal<QuotaSubject, 'buffer' | 'userStorage'>>().toEqualTypeOf<true>();
    expect([...QUOTA_SUBJECTS]).toEqual(['buffer', 'userStorage']);
  });
});

describe('isBufferOverflowRefusal — форма тела для потребителей', () => {
  const body: BufferOverflowRefusal = {
    ok: false,
    reason: 'device_buffer_full',
    buffer: { usedBytes: 999_000, limitBytes: 1_000_000 },
    userStorage: { usedBytes: 10, limitBytes: 1_000_000 },
    overflowPolicy: 'stop',
    overflowId: '7e0d3f9a-0000-4000-8000-000000000001',
    overflowAt: '2026-09-06T02:11:00.000Z',
  };

  it('принимает полное тело', () => {
    expect(isBufferOverflowRefusal(body)).toBe(true);
  });

  it('тип тела — семь полей, `ok` только false', () => {
    expectTypeOf<BufferOverflowRefusal['ok']>().toEqualTypeOf<false>();
    expectTypeOf<Equal<keyof BufferOverflowRefusal,
      'ok' | 'reason' | 'buffer' | 'userStorage' | 'overflowPolicy' | 'overflowId' | 'overflowAt'
    >>().toEqualTypeOf<true>();
  });

  it.each([
    ['ok: true', { ...body, ok: true }],
    ['reason вне словаря', { ...body, reason: 'quota_exceeded' }],
    ['нет оси userStorage', { ...body, userStorage: undefined }],
    ['отрицательное занято', { ...body, buffer: { usedBytes: -1, limitBytes: 1 } }],
    ['дробные байты', { ...body, buffer: { usedBytes: 1.5, limitBytes: 1 } }],
    ['политика автоочистки', { ...body, overflowPolicy: 'auto-cleanup' }],
    ['пустой overflowId', { ...body, overflowId: '' }],
    ['нет overflowAt', { ...body, overflowAt: undefined }],
    ['не объект', 'device_buffer_full'],
  ])('отвергает: %s', (_label, candidate) => {
    expect(isBufferOverflowRefusal(candidate)).toBe(false);
  });
});
