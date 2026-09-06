/**
 * СТАБ контракта блока A (`refusal-contract`, #2307) — умирает на интеграции.
 *
 * Литералы словаря даны заседанием M2 и не обсуждаются; но носитель словаря — общий пакет,
 * который заводит блок A. Здесь — временная копия, чтобы блок C проходил свой DoD без
 * соседей (регламент §3). На Phase 4 файл удаляется, импорт заменяется на словарь A;
 * структурный зуб «одна копия строк» после этого обязан пройти по всему монорепо.
 */
import type { ServerStorageBackend } from '@membrana/media-library-service';

import type { OverflowHoldPolicy, OverflowRefusalSnapshot } from '../types';

/**
 * Сырой доменный отказ транспорта. Тип выведен из сигнатуры `ServerStorageBackend.onSampleRefusal`:
 * барель пакета — общий файл коворка, строка экспорта `SampleRefusal` вносится на интеграции.
 */
export type SampleRefusal = Parameters<Parameters<typeof ServerStorageBackend.onSampleRefusal>[0]>[0];

export const OVERFLOW_REFUSAL_REASONS_STUB = ['device_buffer_full', 'user_storage_full'] as const;

export type OverflowRefusalReasonStub = (typeof OVERFLOW_REFUSAL_REASONS_STUB)[number];

export function isOverflowRefusalReasonStub(value: unknown): value is OverflowRefusalReasonStub {
  return (
    typeof value === 'string' &&
    (OVERFLOW_REFUSAL_REASONS_STUB as readonly string[]).includes(value)
  );
}

/** Политика из ответа: любая дыра или порча → `stop` (M1: fail-closed). */
export function readOverflowPolicyStub(value: unknown): OverflowHoldPolicy {
  return value === 'smart_cleanup' ? 'smart_cleanup' : 'stop';
}

/**
 * Сырой доменный отказ транспорта → снимок для носителя. `null` — это не отказ переполнения
 * (чужая причина из будущего T15) или у отказа нет эпизода (`overflowId`/`overflowAt`):
 * без id удержание «по серверу» не открывается — сервер обязан чеканить эпизод (M2).
 */
export function toOverflowRefusalSnapshotStub(refusal: SampleRefusal): OverflowRefusalSnapshot | null {
  if (!isOverflowRefusalReasonStub(refusal.reason)) return null;
  if (refusal.overflowId === null || refusal.overflowAt === null) return null;
  return {
    reason: refusal.reason,
    overflowId: refusal.overflowId,
    overflowAt: refusal.overflowAt,
    overflowPolicy: readOverflowPolicyStub(refusal.overflowPolicy),
    buffer: refusal.buffer,
    userStorage: refusal.userStorage,
  };
}
