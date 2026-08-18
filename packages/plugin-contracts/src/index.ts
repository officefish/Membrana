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
