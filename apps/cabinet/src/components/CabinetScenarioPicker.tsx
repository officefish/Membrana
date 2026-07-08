import React from 'react';

import { resolveScenarioItemKind, type BoardScenarioListItem } from '@membrana/core';
import { UserCaseCardView, type UserCaseCardViewModel } from '@membrana/device-board';

/**
 * csp-5: кабинетный выбор сценария карточным списком (приближен к клиентскому
 * BoardUserCasePickerModal). Группы «Пользовательские | Системные», tariff-бейджи
 * из шареного UserCaseCardView; locked-системные видны неактивными (апселл).
 * Выбор → selectScenario. Свёрнут в dropdown, чтобы не раздувать карточку узла.
 */

export interface CabinetScenarioPickerProps {
  readonly scenarios: readonly BoardScenarioListItem[];
  readonly selectedScenarioId: string | null;
  readonly onSelect: (scenarioId: string) => void;
  readonly disabled?: boolean;
}

/** Системный locked нельзя выбрать (только апселл); всё остальное — можно. */
export function canSelect(item: BoardScenarioListItem): boolean {
  return resolveScenarioItemKind(item) === 'user' || item.entitlement !== 'locked';
}

function toCardModel(item: BoardScenarioListItem): UserCaseCardViewModel {
  return {
    title: item.title,
    ...(item.entitlement !== undefined ? { entitlement: item.entitlement } : {}),
    ...(item.description !== undefined ? { description: item.description } : {}),
    ...(item.branchCount !== undefined ? { branchCount: item.branchCount } : {}),
    ...(item.functionCount !== undefined ? { functionCount: item.functionCount } : {}),
  };
}

const ScenarioGroup: React.FC<{
  readonly title: string;
  readonly items: readonly BoardScenarioListItem[];
  readonly selectedScenarioId: string | null;
  readonly onSelect: (id: string) => void;
}> = ({ title, items, selectedScenarioId, onSelect }) => {
  if (items.length === 0) return null;
  return (
    <li>
      <h4 className="menu-title px-2 py-1 text-[11px]">{title}</h4>
      <ul className="space-y-1">
        {items.map((item) => {
          const selectable = canSelect(item);
          const isSelected = item.id === selectedScenarioId;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left ${
                  selectable
                    ? 'border-base-300 bg-base-100 hover:border-primary/40'
                    : 'border-base-300/60 bg-base-200/40 opacity-60 cursor-not-allowed'
                } ${isSelected ? 'ring-2 ring-primary/30' : ''}`}
                disabled={!selectable}
                title={selectable ? undefined : 'Доступно в тарифе'}
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => {
                  if (!selectable) return;
                  onSelect(item.id);
                  (document.activeElement as HTMLElement | null)?.blur();
                }}
              >
                <span className="min-w-0 flex-1">
                  <UserCaseCardView card={toCardModel(item)} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </li>
  );
};

export const CabinetScenarioPicker: React.FC<CabinetScenarioPickerProps> = ({
  scenarios,
  selectedScenarioId,
  onSelect,
  disabled = false,
}) => {
  const userScenarios = scenarios.filter((s) => resolveScenarioItemKind(s) === 'user');
  const systemScenarios = scenarios.filter((s) => resolveScenarioItemKind(s) === 'system');
  const selected = scenarios.find((s) => s.id === selectedScenarioId) ?? null;

  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        aria-label="Сценарий устройства"
        className={`btn btn-xs max-w-44 justify-between font-normal ${
          disabled ? 'btn-disabled' : 'btn-outline'
        }`}
      >
        <span className="truncate">{selected?.title ?? 'Выбрать сценарий'}</span>
        <span aria-hidden>▾</span>
      </div>
      {!disabled ? (
        <ul
          tabIndex={0}
          className="dropdown-content menu z-10 mt-1 w-72 max-h-72 flex-nowrap overflow-y-auto rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
        >
          <ScenarioGroup
            title="Пользовательские"
            items={userScenarios}
            selectedScenarioId={selectedScenarioId}
            onSelect={onSelect}
          />
          <ScenarioGroup
            title="Системные"
            items={systemScenarios}
            selectedScenarioId={selectedScenarioId}
            onSelect={onSelect}
          />
        </ul>
      ) : null}
    </div>
  );
};
