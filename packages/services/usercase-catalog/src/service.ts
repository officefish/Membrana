import type { DeviceKind, DeviceScenarioDocument } from '@membrana/core';
import type { UserCaseCatalogEntrySummary } from '@membrana/device-board';
import {
  UserCaseCatalogService,
  getDefaultUserCaseCatalogService,
} from '@membrana/device-board';

import type { UserCaseCatalogCard, UserCaseEntitlementStatus } from './types.js';

export interface ClientUserCaseCatalogServiceOptions {
  readonly catalog?: UserCaseCatalogService;
  /** Tariff SKU active for current membrane (stub: empty Set). */
  readonly entitledTariffSkus?: ReadonlySet<string>;
}

/**
 * Entitlement facade over bundled {@link UserCaseCatalogService}.
 * Tariff lookup is stub until cabinet integration (G1).
 */
export class ClientUserCaseCatalogService {
  private readonly catalog: UserCaseCatalogService;
  private readonly entitledTariffSkus: ReadonlySet<string>;

  constructor(options: ClientUserCaseCatalogServiceOptions = {}) {
    this.catalog = options.catalog ?? getDefaultUserCaseCatalogService();
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
export function getDefaultClientUserCaseCatalogService(): ClientUserCaseCatalogService {
  if (defaultClientCatalog === null) {
    defaultClientCatalog = new ClientUserCaseCatalogService();
  }
  return defaultClientCatalog;
}

/** Reset singleton (tests). */
export function resetDefaultClientUserCaseCatalogService(): void {
  defaultClientCatalog = null;
}
