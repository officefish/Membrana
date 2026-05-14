/** Версия схемы полей записи; при несовместимых изменениях полей — инкрементировать. */
export const TELEMETRY_ENTRY_SCHEMA_VERSION = 1 as const;

export type TelemetryEntryType =
  | 'analysis'
  | 'event'
  | 'module_start'
  | 'module_stop';

/** Полезная нагрузка записи: без PCM и секретов на уровне соглашения потребителя. */
export type TelemetryEntryPayload = Record<string, unknown>;

export interface TelemetryEntry {
  schemaVersion: typeof TELEMETRY_ENTRY_SCHEMA_VERSION;
  id: string;
  timestamp: number;
  type: TelemetryEntryType;
  moduleId: string;
  moduleName: string;
  data: TelemetryEntryPayload;
  tags: string[];
  /**
   * Внутренний ключ дедупликации отчётов (из `data.reportUniqueId` или `data.id`).
   * Не используйте в UI; сохраняется для согласованности Set при вытеснении старых записей.
   */
  reportDedupeKey?: string;
}

/** Поля для addEntry / addReportEntry (идентификатор и время выставляет сервис). */
export type NewTelemetryEntry = Omit<TelemetryEntry, 'id' | 'timestamp' | 'schemaVersion'>;

export interface RegisteredModule {
  name: string;
  registeredAt: number;
  [key: string]: unknown;
}

export interface TelemetryJournalStats {
  total: number;
  analysis: number;
  drone: number;
  calm: number;
  events: number;
  system: number;
}

export interface TelemetryJournalConfig {
  /** Максимум записей в буфере (новые в начале; при переполнении удаляются самые старые). */
  maxEntries: number;
  /** Максимум ключей в множестве дедупа отчётов; при превышении множество пересобирается из текущих записей. */
  maxReportDedupeIds: number;
}

export interface TelemetryJournalSnapshot {
  version: number;
  readonly entries: readonly TelemetryEntry[];
  readonly modules: Readonly<Record<string, RegisteredModule>>;
}
