/**
 * `@membrana/plugin-contracts` — словарь серверной плагинности. Эпик #1961, авторитет имён —
 * `docs/meeting/server-plugin-foundation/M1_VERDICT.md`.
 *
 * Перечисление поимённо, а не `export *`: наружу выходит объявленный контракт, и новое имя
 * внутри пакета не просачивается в публичное само собой. Владелец словаря — Архитектор.
 */
export { PLUGIN_ID_PATTERN, isPluginId, type PluginId } from './plugin-id.js';

export {
  HOME_REGISTRY,
  PLUGIN_RESULTS_COLLECTION,
  PLUGIN_RESULTS_DB,
  isHomeName,
  type HomeName,
} from './homes.js';

export { PLUGIN_TRIGGERS, isPluginTrigger, type PluginTrigger } from './triggers.js';

export {
  type CollectionCreatedPayload,
  type IPluginEvent,
  type JournalEntryCreatedPayload,
  type SampleAddedPayload,
} from './plugin-event.js';

export {
  PLUGIN_KINDS,
  isPluginKind,
  type DisplayForm,
  type HandlerManifest,
  type PluginKind,
  type PluginManifest,
  type ReportManifest,
  type ShowcaseManifest,
} from './manifest.js';

export {
  type ConvergenceRecord,
  type ResumeMode,
  type RunAddress,
  type RunFingerprints,
  type RunRecord,
  type RunRecordView,
  type RunResult,
  type StateRecord,
} from './run-records.js';

export { type PluginContext, type PluginExecutor } from './executor.js';

export { type IPluginHost } from './host.js';

/**
 * Словарь отказа «места нет» и режимов переполнения (вердикт M2, #2307; коворк
 * `cowork-buffer-full-stop`, блок A). Экспорт внесён на интеграции (адаптер A-2 контракта):
 * единственный носитель литералов в монорепо — сервер записей чеканит, прибор и кабинет импортируют.
 */
export {
  BUFFER_OVERFLOW_REASONS,
  OVERFLOW_POLICIES,
  QUOTA_SUBJECTS,
  isBufferOverflowReason,
  isBufferOverflowRefusal,
  isOverflowPolicy,
  type BufferOverflowReason,
  type BufferOverflowRefusal,
  type OverflowPolicy,
  type QuotaAxis,
  type QuotaSubject,
} from './buffer-overflow/index.js';

/**
 * Переключатель возможности умной очистки (#2318, долг D-1): пока алгоритма T12 нет — `false`,
 * серверы отвергают запись `smart_cleanup` причиной `SMART_CLEANUP_UNAVAILABLE_REASON`, а читатели
 * fail-closed на `stop`. Снятие гейта — одна правка в `buffer-overflow/smart-cleanup-gate.ts`.
 */
export {
  SMART_CLEANUP_AVAILABLE,
  SMART_CLEANUP_UNAVAILABLE_REASON,
  type SmartCleanupAvailability,
  type SmartCleanupUnavailableReason,
} from './buffer-overflow/index.js';
