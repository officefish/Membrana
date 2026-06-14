/**
 * @membrana/telemetry-service — журнал телеметрии (append-only буфер в памяти).
 *
 * См. docs/SERVICES.md. Не зависит от аудио/FFT; React только в `hooks.ts`.
 */

export {
  DEFAULT_TELEMETRY_JOURNAL_CONFIG,
} from './constants.js';

export {
  TELEMETRY_ENTRY_SCHEMA_VERSION,
  type NewTelemetryEntry,
  type RegisteredModule,
  type TelemetryEntry,
  type TelemetryEntryPayload,
  type TelemetryEntryType,
  type TelemetryJournalConfig,
  type TelemetryJournalSnapshot,
  type TelemetryJournalStats,
} from './types.js';

export {
  TelemetryJournal,
  createTelemetryJournal,
  getDefaultTelemetryJournal,
  resetDefaultTelemetryJournalForTests,
} from './service.js';

export {
  useTelemetryJournal,
  type UseTelemetryJournalResult,
} from './hooks.js';
