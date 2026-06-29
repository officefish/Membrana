import React, { useMemo } from 'react';
import type { ModuleProps } from '@membrana/agenda';
import { getDefaultUserCaseCatalogService } from '@membrana/device-board';

import {
  ClientUserCaseCatalogService,
} from '@membrana/usercase-catalog-service';
import {
  normalizeDeviceBoardModuleConfig,
  type DeviceBoardModuleConfig,
} from './device-board-module-config.js';
import {
  entitlementBadgeClass,
  entitlementBadgeLabel,
} from './user-case-settings-gate.js';

/** Settings: UserCases catalog toggle + entitlement list (U9 G1). */
export const UserCaseSettingsPanel: React.FC<{
  readonly config: DeviceBoardModuleConfig;
  readonly onUpdateConfig: ModuleProps<DeviceBoardModuleConfig>['onUpdateConfig'];
}> = ({ config, onUpdateConfig }) => {
  const normalized = normalizeDeviceBoardModuleConfig(config);

  const catalogService = useMemo(
    () =>
      new ClientUserCaseCatalogService({
        catalog: getDefaultUserCaseCatalogService(),
        entitledTariffSkus: new Set(normalized.entitledTariffSkus),
      }),
    [normalized.entitledTariffSkus.join('|')],
  );

  const cards = catalogService.listCards('microphone');

  return (
    <section className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-base-content">UserCases</h3>
        <p className="text-xs text-base-content/60 mt-1 leading-relaxed">
          Готовые сценарии device-board. Включите каталог, чтобы загружать их с доски (modal в
          следующем шаге).
        </p>
      </div>

      <label className="label cursor-pointer justify-start gap-3 py-0">
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={normalized.userCasesCatalogEnabled}
          onChange={(event) =>
            onUpdateConfig({ userCasesCatalogEnabled: event.target.checked })
          }
          aria-label="Показывать каталог UserCases на device-board"
        />
        <span className="label-text text-sm">Показывать каталог на доске</span>
      </label>

      <ul className="space-y-2">
        {cards.map((card) => (
          <li
            key={card.id}
            className={`flex items-start justify-between gap-3 rounded-lg border border-base-300/80 bg-base-100 px-3 py-2 ${
              card.entitlement === 'locked' ? 'opacity-60' : ''
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{card.title}</p>
              <p className="text-xs text-base-content/55 mt-0.5">
                {card.branchCount} веток · {card.functionCount} функций · {card.deviceKind}
              </p>
              {card.entitlement === 'locked' ? (
                <p className="text-xs text-warning mt-1">Доступно в тарифе (stub)</p>
              ) : null}
            </div>
            <span className={entitlementBadgeClass(card.entitlement)}>
              {entitlementBadgeLabel(card.entitlement)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export function mergeDeviceBoardModuleConfig(
  moduleConfig: unknown,
): DeviceBoardModuleConfig {
  return normalizeDeviceBoardModuleConfig(moduleConfig as Partial<DeviceBoardModuleConfig>);
}
