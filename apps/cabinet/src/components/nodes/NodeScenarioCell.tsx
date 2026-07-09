import { useId, useState } from 'react';

import type { BoardScenarioListItem } from '@membrana/core';

import { ScenarioGroups } from '@/components/CabinetScenarioPicker';

export interface NodeScenarioCellProps {
  readonly scenarios: readonly BoardScenarioListItem[];
  readonly selectedScenarioId: string | null;
  readonly onSelect: (scenarioId: string) => void;
  /** Узел offline — выбор недоступен (как раньше disabled у dropdown). */
  readonly disabled?: boolean;
}

/**
 * Сценарная ячейка под треком узла: свёрнутый вид — выбранный сценарий, раскрытие
 * показывает группы «Пользовательские | Системные» карточками (ScenarioGroups,
 * csp-5 семантика). Заменяет прежний dropdown в строке кнопок управления.
 */
export function NodeScenarioCell({
  scenarios,
  selectedScenarioId,
  onSelect,
  disabled = false,
}: NodeScenarioCellProps) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId().replace(/:/g, '');

  const hasScenarios = scenarios.length > 0;
  const selected = scenarios.find((s) => s.id === selectedScenarioId) ?? null;

  return (
    <section
      className="rounded-lg border border-base-content/10 bg-base-100/60"
      aria-label="Сценарий устройства"
    >
      <div className="flex items-center gap-2 p-2">
        <span className="badge badge-ghost badge-xs shrink-0">Сценарий</span>
        {hasScenarios ? (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {selected?.title ?? 'Не выбран'}
          </span>
        ) : (
          <span
            className="min-w-0 flex-1 truncate text-xs text-base-content/50"
            title="Устройство ещё не объявило список сценариев — «Пуск» запустит сохранённый сценарий"
          >
            сценарии не объявлены
          </span>
        )}
        {hasScenarios ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs shrink-0"
            aria-expanded={expanded}
            aria-controls={bodyId}
            disabled={disabled}
            title={disabled ? 'Узел offline — выбор сценария недоступен' : undefined}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Свернуть' : 'Выбрать'}
            <span aria-hidden>{expanded ? '▴' : '▾'}</span>
          </button>
        ) : null}
      </div>

      {hasScenarios && expanded && !disabled ? (
        <ul
          id={bodyId}
          role="region"
          aria-label="Список сценариев"
          className="menu max-h-72 flex-nowrap overflow-y-auto border-t border-base-300 p-2"
        >
          <ScenarioGroups
            scenarios={scenarios}
            selectedScenarioId={selectedScenarioId}
            onSelect={(id) => {
              onSelect(id);
              setExpanded(false);
            }}
          />
        </ul>
      ) : null}
    </section>
  );
}
