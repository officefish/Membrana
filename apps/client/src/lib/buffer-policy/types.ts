/**
 * ЗЕРКАЛО ПОЛИТИКИ ПЕРЕПОЛНЕНИЯ НА КЛИЕНТЕ (#2308, вердикт M1 заседания `buffer-full-stop`,
 * блок B коворка `overflow-policy`).
 *
 * Клиент — mirror, не master (T1): режим задаёт сервер записей, прибор читает и подчиняется.
 * Словарь режимов — ОДИН на монорепо: `OVERFLOW_POLICIES` из `@membrana/plugin-contracts`
 * (адаптер B-1 контракта интеграции `cowork-buffer-full-stop`); своих строк здесь нет.
 *
 * Легаси `'auto-cleanup'` в тип НЕ входит — и это не соглашение, а тип: значение, которое
 * читатель отдаёт наружу, физически не может быть автоочисткой. Порча «вернуть дефолт
 * автоочистки» ловится зубом `no-auto-cleanup.test.ts`, читающим исходники клиента.
 *
 * Имена: `bufferPolicy` — настройка (этот блок); `overflowPolicy` — поле ответа отказа блока A.
 */
import { OVERFLOW_POLICIES, type OverflowPolicy } from '@membrana/plugin-contracts';

export const BUFFER_POLICY_MODES = [OVERFLOW_POLICIES.STOP, OVERFLOW_POLICIES.SMART_CLEANUP] as const;
export type BufferPolicyMode = OverflowPolicy;

export const SMART_CLEANUP_SELECTIONS = ['oldest_first', 'largest_first'] as const;
export type SmartCleanupSelection = (typeof SMART_CLEANUP_SELECTIONS)[number];

/** Каркас S (M1): порог, критерий отбора, защита вещдоков. Алгоритма (T12) здесь нет. */
export interface SmartCleanupParams {
  readonly thresholdPercent: number;
  readonly selection: SmartCleanupSelection;
  readonly protectLabeled: boolean;
}

export type BufferPolicy =
  | { readonly mode: typeof OVERFLOW_POLICIES.STOP; readonly params: null }
  | { readonly mode: typeof OVERFLOW_POLICIES.SMART_CLEANUP; readonly params: SmartCleanupParams };

/**
 * Почему читатель отдал именно это. `server` — значение сервера прошло разбор; всё остальное —
 * fail-closed на `stop` с названной причиной: молчаливой подстановки нет.
 */
export type BufferPolicySource =
  | 'server'
  /** Ни одного успешного чтения ещё не было. */
  | 'never_received'
  /** Последнее чтение упало (сеть, отказ, исключение источника). */
  | 'sync_failed'
  /** Ответ пришёл, но политики в нём нет или она вне словаря / с дырявым S. */
  | 'malformed';

export interface EffectiveBufferPolicy {
  readonly policy: BufferPolicy;
  readonly source: BufferPolicySource;
}

export const STOP_POLICY: BufferPolicy = Object.freeze({ mode: 'stop', params: null });
