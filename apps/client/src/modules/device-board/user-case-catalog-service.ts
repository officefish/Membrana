import type { DeviceKind, DeviceScenarioDocument } from '@membrana/core';
import type { UserCaseCatalogEntrySummary } from '@membrana/device-board';
import {
  UserCaseCatalogService,
  getDefaultUserCaseCatalogService,
} from '@membrana/device-board';

/** Статус entitlement для карточки каталога (G1 stub). */
export type UserCaseEntitlementStatus = 'bundled' | 'entitled' | 'locked';

/** Карточка UserCase для settings / picker UI. */
export interface UserCaseCatalogCard extends UserCaseCatalogEntrySummary {
  readonly entitlement: UserCaseEntitlementStatus;
  readonly canApply: boolean;
}

export interface ClientUserCaseCatalogServiceOptions {
  readonly catalog?: UserCaseCatalogService;
  /** Tariff SKU, активированные для текущей мембраны (stub: пустой Set). */
  readonly entitledTariffSkus?: ReadonlySet<string>;
}

/**
 * Client-обёртка над bundled catalog + tariff entitlement (U9 C1).
 * Tariff lookup — stub до cabinet integration (G1).
 */
export class ClientUserCaseCatalogService {
  private readonly catalog: UserCaseCatalogService;
  private readonly entitledTariffSkus: ReadonlySet<string>;

  constructor(options: ClientUserCaseCatalogServiceOptions = {}) {
    this.catalog = options.catalog ?? getDefaultUserCaseCatalogService();
    this.entitledTariffSkus = options.entitledTariffSkus ?? new Set();
  }

  /** Все карточки каталога с entitlement. */
  listCards(deviceKind?: DeviceKind): readonly UserCaseCatalogCard[] {
    const summaries =
      deviceKind === undefined
        ? this.catalog.listSummaries()
        : this.catalog.listForDeviceKind(deviceKind);
    return summaries.map((summary) => this.toCard(summary));
  }

  /** Можно ли применить UserCase (deviceKind + entitlement). */
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

  /** Загружает document если entitled; иначе null. */
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

/** Сброс singleton (tests). */
export function resetDefaultClientUserCaseCatalogService(): void {
  defaultClientCatalog = null;
}
