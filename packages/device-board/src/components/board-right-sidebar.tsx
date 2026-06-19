import React, { useEffect, useState } from 'react';
import type { ScenarioBlockKind, ScenarioNodeKind } from '@membrana/core';

import { D0_SCENARIO_NODE_CATALOG } from '../graph/index.js';
import type { ScenarioMicrophoneOption } from '../runtime/index.js';
import {
  isLegacyPaletteEnabled,
  LEGACY_SCENARIO_NODE_PALETTE,
  SCENARIO_V04_PALETTE,
} from '../types/board-ui.js';

export interface BoardRightSidebarProps {
  readonly selectedNodeId: string | null;
  readonly selectedNodeLabel: string | null;
  readonly selectedNodeKind: ScenarioNodeKind | null;
  readonly selectedMicrophoneId: string | null;
  readonly selectedVariableName: string;
  readonly selectedVariableTypeLabel: string | null;
  readonly microphoneOptions: readonly ScenarioMicrophoneOption[];
  readonly microphoneOptionsLoading?: boolean;
  readonly canEditScenario: boolean;
  readonly onAddLegacyNode: (blockKind: ScenarioBlockKind) => void;
  readonly onAddPaletteNode: (nodeKind: 'print' | 'is-valid' | 'get-microphone') => void;
  readonly onMicrophoneIdChange: (nodeId: string, microphoneId: string) => void;
  readonly onAssignVariableName: (nodeId: string, variableName: string) => void;
  readonly onClearBoard: () => void;
}

/**
 * Правый сайдбар доски (MP7b RT6 / v0.4 DBR5): инспектор выбранной ноды
 * или палитра v0.4 (Print / isValid / GetMicrophone); legacy D0 — под флагом.
 */
export const BoardRightSidebar: React.FC<BoardRightSidebarProps> = ({
  selectedNodeId,
  selectedNodeLabel,
  selectedNodeKind,
  selectedMicrophoneId,
  selectedVariableName,
  selectedVariableTypeLabel,
  microphoneOptions,
  microphoneOptionsLoading = false,
  canEditScenario,
  onAddLegacyNode,
  onAddPaletteNode,
  onMicrophoneIdChange,
  onAssignVariableName,
  onClearBoard,
}) => {
  const legacyPalette = isLegacyPaletteEnabled();
  const [variableNameDraft, setVariableNameDraft] = useState(selectedVariableName);

  useEffect(() => {
    setVariableNameDraft(selectedVariableName);
  }, [selectedNodeId, selectedVariableName]);

  const commitVariableName = () => {
    if (selectedNodeId === null) {
      return;
    }
    const trimmed = variableNameDraft.trim();
    if (trimmed === '' || trimmed === selectedVariableName) {
      return;
    }
    onAssignVariableName(selectedNodeId, trimmed);
  };

  return (
    <aside
      className="flex h-full w-[clamp(12rem,15vw,16rem)] flex-col overflow-y-auto border-l border-base-300 bg-base-100/95 shadow-lg backdrop-blur-sm"
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
          {selectedNodeKind === 'get-microphone' ? (
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-base-content/70">Микрофон устройства</span>
              <select
                className="select select-bordered select-sm w-full"
                value={selectedMicrophoneId ?? ''}
                disabled={microphoneOptionsLoading}
                onChange={(event) =>
                  onMicrophoneIdChange(selectedNodeId, event.target.value)
                }
              >
                <option value="">
                  {microphoneOptionsLoading ? 'Загрузка устройств…' : '— выберите микрофон —'}
                </option>
                {microphoneOptions.map((option) => (
                  <option key={option.deviceId} value={option.deviceId}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-base-content/50">
                Список обновляется при выборе узла (audio-engine enumerate).
              </span>
            </label>
          ) : selectedNodeKind === 'variable-get' ? (
            <div className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-base-content/70">
                Имя переменной ({selectedVariableTypeLabel ?? 'Device'})
              </span>
              <p className="rounded-md border border-base-300 bg-base-200/40 px-2 py-1.5 font-mono italic text-base-content">
                {selectedVariableName || '—'}
              </p>
              <span className="text-base-content/50">
                Переименование — в конструкторе слева или через узел Set.
              </span>
            </div>
          ) : selectedNodeKind === 'variable-set' ? (
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-base-content/70">
                Имя переменной ({selectedVariableTypeLabel ?? 'Device'})
              </span>
              <input
                type="text"
                className="input input-bordered input-sm w-full font-mono"
                value={variableNameDraft}
                placeholder="device1"
                onChange={(event) => setVariableNameDraft(event.target.value)}
                onBlur={() => commitVariableName()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur();
                  }
                }}
              />
              <span className="text-base-content/50">
                Переименовывает существующую переменную на всех узлах get/set.
              </span>
            </label>
          ) : (
            <p className="text-xs leading-relaxed text-base-content/55">
              Параметры плагина и сокетов появятся здесь. Снимите выделение, чтобы вернуться к
              палитре нод.
            </p>
          )}
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
            {!legacyPalette ? (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">
                  v0.4
                </p>
                <div className="flex flex-wrap gap-1">
                  {SCENARIO_V04_PALETTE.map((item) => (
                    <button
                      key={item.nodeKind}
                      type="button"
                      className="btn btn-xs btn-outline btn-primary"
                      disabled={!canEditScenario}
                      onClick={() => onAddPaletteNode(item.nodeKind)}
                      title={item.label}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              LEGACY_SCENARIO_NODE_PALETTE.map((category) => (
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
                        onClick={() => onAddLegacyNode(blockKind)}
                        title={D0_SCENARIO_NODE_CATALOG[blockKind].label}
                      >
                        {D0_SCENARIO_NODE_CATALOG[blockKind].label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-auto border-t border-base-200 p-4">
            <button
              type="button"
              className="btn btn-sm btn-outline btn-error w-full"
              onClick={onClearBoard}
            >
              Очистить ветку
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
