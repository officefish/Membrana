import type { DeviceKind, DeviceScenarioDocument } from '@membrana/core';

import { BUNDLED_USER_CASE_ENTRIES } from './bundled-user-case-entries.js';
import type { UserCaseCatalogEntry, UserCaseCatalogEntrySummary } from './user-case-catalog-types.js';

/** In-memory catalog bundled UserCases (U9 C1). */
export class UserCaseCatalogService {
  private readonly entries: readonly UserCaseCatalogEntry[];

  constructor(entries: readonly UserCaseCatalogEntry[] = BUNDLED_USER_CASE_ENTRIES) {
    this.entries = entries;
  }

  /** Все записи каталога (summary). */
  listSummaries(): readonly UserCaseCatalogEntrySummary[] {
    return this.entries.map((entry) => toSummary(entry));
  }

  /** Запись по id или null. */
  getEntry(id: string): UserCaseCatalogEntry | null {
    return this.entries.find((entry) => entry.id === id) ?? null;
  }

  /** Summary по id или null. */
  getSummary(id: string): UserCaseCatalogEntrySummary | null {
    const entry = this.getEntry(id);
    return entry === null ? null : toSummary(entry);
  }

  /** Загружает parsed embedded document; null если id неизвестен. */
  loadDocument(id: string): DeviceScenarioDocument | null {
    const entry = this.getEntry(id);
    if (entry === null) {
      return null;
    }
    return entry.loadDocument();
  }

  /** Фильтр по deviceKind (microphone / playback / generic). */
  listForDeviceKind(deviceKind: DeviceKind): readonly UserCaseCatalogEntrySummary[] {
    return this.entries
      .filter((entry) => entry.deviceKind === deviceKind)
      .map((entry) => toSummary(entry));
  }

  /** Количество bundled entries. */
  get size(): number {
    return this.entries.length;
  }
}

let defaultCatalog: UserCaseCatalogService | null = null;

/** Singleton bundled catalog для client / shell. */
export function getDefaultUserCaseCatalogService(): UserCaseCatalogService {
  if (defaultCatalog === null) {
    defaultCatalog = new UserCaseCatalogService();
  }
  return defaultCatalog;
}

/** Сброс singleton (tests). */
export function resetDefaultUserCaseCatalogService(): void {
  defaultCatalog = null;
}

function toSummary(entry: UserCaseCatalogEntry): UserCaseCatalogEntrySummary {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    deviceKind: entry.deviceKind,
    tier: entry.tier,
    tariffSku: entry.tariffSku,
    layoutProfile: entry.layoutProfile,
    branchCount: entry.branchCount,
    functionCount: entry.functionCount,
    preview: entry.preview,
  };
}
