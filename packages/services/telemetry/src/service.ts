import { logger } from '@membrana/core';

import { DEFAULT_TELEMETRY_JOURNAL_CONFIG } from './constants.js';
import {
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

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function extractReportDedupeKey(data: TelemetryEntryPayload): string | null {
  const rid = data['reportUniqueId'];
  if (typeof rid === 'string' && rid.length > 0) {
    return rid;
  }
  const id = data['id'];
  if (typeof id === 'string' && id.length > 0) {
    return id;
  }
  if (typeof id === 'number' && Number.isFinite(id)) {
    return String(id);
  }
  return null;
}

function entryHasTag(entry: TelemetryEntry, tag: string): boolean {
  return entry.tags.includes(tag);
}

/** Устаревшие теги FFT-отчёта до миграции на `detection` / `clear`. */
function entryHasLegacyDetectionTag(entry: TelemetryEntry): boolean {
  return (
    entryHasTag(entry, 'detection') ||
    entryHasTag(entry, 'detected') ||
    entryHasTag(entry, 'drone')
  );
}

function entryHasLegacyClearTag(entry: TelemetryEntry): boolean {
  return (
    entryHasTag(entry, 'clear') ||
    entryHasTag(entry, 'not-detected') ||
    entryHasTag(entry, 'calm')
  );
}

/**
 * Журнал телеметрии: буфер записей, регистрация модулей, дедуп отчётов.
 * Не использует React; для UI — `hooks.ts` + `useSyncExternalStore`.
 */
export class TelemetryJournal {
  private readonly config: TelemetryJournalConfig;

  private modules: Record<string, RegisteredModule> = {};

  /** Новые записи в начале массива. */
  private entries: TelemetryEntry[] = [];

  private readonly addedReportIds = new Set<string>();

  private listeners = new Set<() => void>();

  private snapshotVersion = 0;

  private snapshot: TelemetryJournalSnapshot;

  constructor(config?: Partial<TelemetryJournalConfig>) {
    this.config = { ...DEFAULT_TELEMETRY_JOURNAL_CONFIG, ...config };
    this.snapshot = this.buildSnapshot();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): TelemetryJournalSnapshot {
    return this.snapshot;
  }

  registerModule(name: string, data: Record<string, unknown> = {}): string {
    const moduleId = `mod_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const moduleData: RegisteredModule = {
      name,
      registeredAt: Date.now(),
      ...data,
    };

    this.modules = { ...this.modules, [moduleId]: moduleData };
    this.addEntry({
      type: 'module_start',
      moduleId,
      moduleName: name,
      data: moduleData as unknown as TelemetryEntryPayload,
      tags: ['module', 'start', name.toLowerCase()],
    });
    return moduleId;
  }

  unregisterModule(moduleId: string): void {
    const module = this.modules[moduleId];
    if (module) {
      this.addEntry({
        type: 'module_stop',
        moduleId,
        moduleName: module.name,
        data: { stoppedAt: Date.now() } satisfies TelemetryEntryPayload,
        tags: ['module', 'stop', module.name.toLowerCase()],
      });
    }

    const { [moduleId]: _removed, ...rest } = this.modules;
    this.modules = rest;
    this.notify();
  }

  addEntry(entry: NewTelemetryEntry): string {
    const newEntry = this.buildEntry(entry);
    this.pushEntry(newEntry);
    return newEntry.id;
  }

  /**
   * Добавляет отчёт, если в `data` есть `reportUniqueId` или `id` (строка/число).
   * Дубликаты по этому ключу отбрасываются.
   */
  addReportEntry(entry: NewTelemetryEntry): string | null {
    const reportKey = extractReportDedupeKey(entry.data);
    if (!reportKey) {
      logger.warn('[TelemetryJournal] addReportEntry: нет reportUniqueId/id в data');
      return null;
    }

    if (this.addedReportIds.has(reportKey)) {
      logger.warn('[TelemetryJournal] addReportEntry: дубликат отчёта', {
        reportKey,
        moduleId: entry.moduleId,
        moduleName: entry.moduleName,
      });
      return null;
    }

    this.addedReportIds.add(reportKey);
    this.enforceReportDedupeLimit();

    const newEntry = this.buildEntry({ ...entry, reportDedupeKey: reportKey });
    this.pushEntry(newEntry);
    return newEntry.id;
  }

  getEntries(): TelemetryEntry[] {
    return [...this.entries].sort((a, b) => b.timestamp - a.timestamp);
  }

  getEntriesByModule(moduleId: string): TelemetryEntry[] {
    return this.entries
      .filter((e) => e.moduleId === moduleId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getEntriesByType(type: TelemetryEntryType): TelemetryEntry[] {
    return this.entries
      .filter((e) => e.type === type)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  clearEntries(): void {
    this.entries = [];
    this.addedReportIds.clear();
    this.notify();
  }

  clearOldEntries(maxAgeMs: number): void {
    const cutoff = Date.now() - maxAgeMs;
    const prevLen = this.entries.length;
    this.entries = this.entries.filter((e) => e.timestamp > cutoff);
    this.syncReportDedupeKeysFromEntries();
    if (this.entries.length !== prevLen) {
      logger.info(
        `[TelemetryJournal] clearOldEntries: удалено ${prevLen - this.entries.length} записей`,
      );
    }
    this.notify();
  }

  getStats(): TelemetryJournalStats {
    const entries = this.entries;
    const analysisEntries = entries.filter((e) => e.type === 'analysis');

    return {
      total: entries.length,
      analysis: analysisEntries.length,
      detection: analysisEntries.filter((e) => entryHasLegacyDetectionTag(e)).length,
      clear: analysisEntries.filter((e) => entryHasLegacyClearTag(e)).length,
      drone: analysisEntries.filter((e) => entryHasLegacyDetectionTag(e)).length,
      calm: analysisEntries.filter((e) => entryHasLegacyClearTag(e)).length,
      events: entries.filter((e) => e.type === 'event').length,
      system: entries.filter(
        (e) => e.type === 'module_start' || e.type === 'module_stop',
      ).length,
    };
  }

  private buildEntry(entry: NewTelemetryEntry): TelemetryEntry {
    return {
      schemaVersion: TELEMETRY_ENTRY_SCHEMA_VERSION,
      id: generateId(),
      timestamp: Date.now(),
      ...entry,
    };
  }

  private pushEntry(newEntry: TelemetryEntry): void {
    this.entries = [newEntry, ...this.entries];
    this.trimOverflow();
    this.notify();
  }

  private trimOverflow(): void {
    while (this.entries.length > this.config.maxEntries) {
      const removed = this.entries.pop();
      if (removed?.reportDedupeKey) {
        this.addedReportIds.delete(removed.reportDedupeKey);
      }
    }
  }

  private enforceReportDedupeLimit(): void {
    if (this.addedReportIds.size > this.config.maxReportDedupeIds) {
      this.syncReportDedupeKeysFromEntries();
    }
  }

  /** После выборочного удаления записей — привести Set к фактическим ключам в буфере. */
  private syncReportDedupeKeysFromEntries(): void {
    this.addedReportIds.clear();
    for (const e of this.entries) {
      if (e.reportDedupeKey) {
        this.addedReportIds.add(e.reportDedupeKey);
      }
    }
  }

  private buildSnapshot(): TelemetryJournalSnapshot {
    this.snapshotVersion += 1;
    return {
      version: this.snapshotVersion,
      entries: Object.freeze([...this.entries]),
      modules: Object.freeze({ ...this.modules }),
    };
  }

  private notify(): void {
    this.snapshot = this.buildSnapshot();
    for (const l of this.listeners) {
      l();
    }
  }
}

let defaultJournal: TelemetryJournal | null = null;

/** Общий инстанс для приложения (один журнал на вкладку). */
export function getDefaultTelemetryJournal(): TelemetryJournal {
  defaultJournal ??= new TelemetryJournal();
  return defaultJournal;
}

/** Сброс синглтона (только тесты). */
export function resetDefaultTelemetryJournalForTests(): void {
  defaultJournal = null;
}

export function createTelemetryJournal(
  config?: Partial<TelemetryJournalConfig>,
): TelemetryJournal {
  return new TelemetryJournal(config);
}
