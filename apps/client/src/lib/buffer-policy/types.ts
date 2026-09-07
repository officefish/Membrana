/**
 * ЗЕРКАЛО ПОЛИТИКИ ПЕРЕПОЛНЕНИЯ НА КЛИЕНТЕ (#2308, вердикт M1 заседания `buffer-full-stop`,
 * блок B коворка `overflow-policy`).
 *
 * Клиент — mirror, не master (T1): режим задаёт сервер записей, прибор читает и подчиняется.
 * Словарь режимов — FOLLOWER словаря сервера записей
 * (`background-media/src/modules/devices/buffer-policy.ts`); третьей семантики здесь нет.
 *
 * Легаси `'auto-cleanup'` в тип НЕ входит — и это не соглашение, а тип: значение, которое
 * читатель отдаёт наружу, физически не может быть автоочисткой. Порча «вернуть дефолт
 * автоочистки» ловится зубом `no-auto-cleanup.test.ts`, читающим исходники этого каталога.
 *
 * Имена: `bufferPolicy` — настройка (этот блок); `overflowPolicy` — поле ответа отказа блока A.
 */

export const BUFFER_POLICY_MODES = ['stop', 'smart_cleanup'] as const;
export type BufferPolicyMode = (typeof BUFFER_POLICY_MODES)[number];

export const SMART_CLEANUP_SELECTIONS = ['oldest_first', 'largest_first'] as const;
export type SmartCleanupSelection = (typeof SMART_CLEANUP_SELECTIONS)[number];

/** Каркас S (M1): порог, критерий отбора, защита вещдоков. Алгоритма (T12) здесь нет. */
export interface SmartCleanupParams {
  readonly thresholdPercent: number;
  readonly selection: SmartCleanupSelection;
  readonly protectLabeled: boolean;
}

export type BufferPolicy =
  | { readonly mode: 'stop'; readonly params: null }
  | { readonly mode: 'smart_cleanup'; readonly params: SmartCleanupParams };

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
