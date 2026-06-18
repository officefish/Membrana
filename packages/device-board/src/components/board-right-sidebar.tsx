import React from 'react';
import type { ScenarioBlockKind } from '@membrana/core';

import { D0_SCENARIO_NODE_CATALOG } from '../graph/index.js';
import { SCENARIO_NODE_PALETTE } from '../types/board-ui.js';

export interface BoardRightSidebarProps {
  readonly selectedNodeId: string | null;
  readonly selectedNodeLabel: string | null;
  readonly canEditScenario: boolean;
  readonly onAddNode: (blockKind: ScenarioBlockKind) => void;
  readonly onClearBoard: () => void;
}

/**
 * Правый сайдбар доски (MP7b RT6): если выбрана нода — её настройки;
 * иначе — палитра scenario-нод по категориям + очистка борда.
 */
export const BoardRightSidebar: React.FC<BoardRightSidebarProps> = ({
  selectedNodeId,
  selectedNodeLabel,
  canEditScenario,
  onAddNode,
  onClearBoard,
}) => (
  <aside
    className="flex h-full w-72 shrink-0 flex-col overflow-y-auto border-l border-base-300 bg-base-100"
    aria-label="Инспектор и палитра нод"
  >
    {selectedNodeId ? (
      <div className="flex flex-col gap-3 p-4 text-sm">
        <div className="border-b border-base-200 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
            Настройки ноды
          </p>
          <h2 className="text-sm font-semibold text-base-content">
            {selectedNodeLabel ?? selectedNodeId}
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-base-content/55">
          Параметры плагина и сокетов появятся здесь. Снимите выделение, чтобы вернуться к палитре нод.
        </p>
      </div>
    ) : (
      <div className="flex flex-1 flex-col">
        <div className="border-b border-base-200 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
            Палитра нод
          </p>
          <h2 className="text-sm font-semibold text-base-content">
            {canEditScenario ? 'Добавьте ноды в активную ветку' : 'Выберите ветку сценария'}
          </h2>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {SCENARIO_NODE_PALETTE.map((category) => (
            <div key={category.title} className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">
                {category.title}
              </p>
              <div className="flex flex-wrap gap-1">
                {category.blockKinds.map((blockKind) => (
                  <button
                    key={blockKind}
                    type="button"
                    className="btn btn-xs btn-outline"
                    disabled={!canEditScenario}
                    onClick={() => onAddNode(blockKind)}
                    title={D0_SCENARIO_NODE_CATALOG[blockKind].label}
                  >
                    {D0_SCENARIO_NODE_CATALOG[blockKind].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto border-t border-base-200 p-4">
          <button
            type="button"
            className="btn btn-sm btn-outline btn-error w-full"
            onClick={onClearBoard}
          >
            Очистить борд
          </button>
        </div>
      </div>
    )}
  </aside>
);
