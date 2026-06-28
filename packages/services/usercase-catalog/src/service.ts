import type {
  DeviceKind,
  DeviceScenarioDocument,
  UserCaseCatalogEntrySummary,
} from '@membrana/core';

import type { UserCaseCatalogCard, UserCaseEntitlementStatus } from './types.js';

/** Runtime-neutral input port implemented by a catalog owner. */
export interface UserCaseCatalogPort {
  listSummaries(): readonly UserCaseCatalogEntrySummary[];
  listForDeviceKind(deviceKind: DeviceKind): readonly UserCaseCatalogEntrySummary[];
  getSummary(id: string): UserCaseCatalogEntrySummary | null;
  loadDocument(id: string): DeviceScenarioDocument | null;
}

export interface ClientUserCaseCatalogServiceOptions {
  readonly catalog: UserCaseCatalogPort;
  /** Tariff SKU active for current membrane (stub: empty Set). */
  readonly entitledTariffSkus?: ReadonlySet<string>;
}

/**
 * Entitlement facade over bundled {@link UserCaseCatalogService}.
 * Tariff lookup is stub until cabinet integration (G1).
 */
export class ClientUserCaseCatalogService {
  private readonly catalog: UserCaseCatalogPort;
  private readonly entitledTariffSkus: ReadonlySet<string>;

  constructor(options: ClientUserCaseCatalogServiceOptions) {
    this.catalog = options.catalog;
    this.entitledTariffSkus = options.entitledTariffSkus ?? new Set();
  }

  /** All catalog cards with entitlement. */
  listCards(deviceKind?: DeviceKind): readonly UserCaseCatalogCard[] {
    const summaries =
      deviceKind === undefined
        ? this.catalog.listSummaries()
        : this.catalog.listForDeviceKind(deviceKind);
    return summaries.map((summary) => this.toCard(summary));
  }

  /** Whether UserCase can be applied (deviceKind + entitlement). */
  canApply(id: string, deviceKind?: DeviceKind): boolean {
    const summary = this.catalog.getSummary(id);
    if (summary === null) {
      return false;
    }
    if (deviceKind !== undefined && summary.deviceKind !== deviceKind) {
      return false;
    }
    return this.resolveEntitlement(summary) !== 'locked';
  }

  /** Loads document when entitled; otherwise null. */
  loadDocumentIfEntitled(id: string, deviceKind?: DeviceKind): DeviceScenarioDocument | null {
    if (!this.canApply(id, deviceKind)) {
      return null;
    }
    return this.catalog.loadDocument(id);
  }

  getSummary(id: string): UserCaseCatalogEntrySummary | null {
    return this.catalog.getSummary(id);
  }

  private toCard(summary: UserCaseCatalogEntrySummary): UserCaseCatalogCard {
    const entitlement = this.resolveEntitlement(summary);
    return {
      ...summary,
      entitlement,
      canApply: entitlement !== 'locked',
    };
  }

  private resolveEntitlement(summary: UserCaseCatalogEntrySummary): UserCaseEntitlementStatus {
    if (summary.tier === 'bundled') {
      return 'bundled';
    }
    if (summary.tier === 'community') {
      return 'community';
    }
    if (summary.tier === 'tariff') {
      const sku = summary.tariffSku;
      if (sku !== undefined && this.entitledTariffSkus.has(sku)) {
        return 'entitled';
      }
      return 'locked';
    }
    return 'locked';
  }
}

let defaultClientCatalog: ClientUserCaseCatalogService | null = null;

/** Singleton client catalog (picker / settings). */
export function getDefaultClientUserCaseCatalogService(
  options?: ClientUserCaseCatalogServiceOptions,
): ClientUserCaseCatalogService {
  if (defaultClientCatalog === null) {
    if (options === undefined) {
      throw new Error('UserCase catalog port is required to initialize the default service');
    }
    defaultClientCatalog = new ClientUserCaseCatalogService(options);
  }
  return defaultClientCatalog;
}

/** Reset singleton (tests). */
export function resetDefaultClientUserCaseCatalogService(): void {
  defaultClientCatalog = null;
}
