import React from 'react';
import type { ScenarioVariable, ScenarioVariableType } from '@membrana/core';

import { referenceTypeLabel, type VariableNodeKind } from '../graph/index.js';
import {
  BOARD_LEFT_SIDEBAR_WIDTH_CLASS,
  BRANCH_SIDEBAR_SECTIONS,
  BRANCH_TAB_LABEL,
  type ScenarioBranchTab,
} from '../types/board-ui.js';

export interface BoardLeftSidebarProps {
  readonly activeBranch: ScenarioBranchTab;
  readonly isScenarioLayer: boolean;
  readonly onSelectBranch: (branch: ScenarioBranchTab) => void;
  readonly signalAdvanced: boolean;
  readonly isSignalLayer: boolean;
  readonly onSelectSignal: () => void;
  readonly variables: readonly ScenarioVariable[];
  readonly onAddVariable: (type: ScenarioVariableType) => void;
  readonly onRenameVariable: (id: string, name: string) => void;
  readonly onRemoveVariable: (id: string) => void;
  readonly onAddVariableNode: (kind: VariableNodeKind, variableId: string) => void;
}

/** Бейдж состояния значения переменной: задана/валидна/висячая. */
function variableStateBadge(variable: ScenarioVariable): { label: string; className: string } {
  if (variable.value === null) {
    return { label: 'не задана', className: 'badge-ghost' };
  }
  return variable.value.valid
    ? { label: 'valid', className: 'badge-success' }
    : { label: 'invalid', className: 'badge-error' };
}

const VariableRow: React.FC<{
  readonly variable: ScenarioVariable;
  readonly disabled: boolean;
  readonly onRename: (id: string, name: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onAddNode: (kind: VariableNodeKind, variableId: string) => void;
}> = ({ variable, disabled, onRename, onRemove, onAddNode }) => {
  const badge = variableStateBadge(variable);
  return (
    <div className="flex flex-col gap-1 rounded-md border border-base-300 bg-base-100 p-2">
      <div className="flex items-center gap-1">
        <input
          type="text"
          aria-label={`Имя переменной ${variable.name}`}
          className="input input-xs input-ghost min-w-0 flex-1 px-1 font-mono"
          value={variable.name}
          onChange={(event) => onRename(variable.id, event.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost btn-xs px-1 text-error"
          aria-label={`Удалить переменную ${variable.name}`}
          title="Удалить переменную"
          onClick={() => onRemove(variable.id)}
        >
          ✕
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="badge badge-xs badge-outline">{referenceTypeLabel(variable.type)}</span>
        <span className={`badge badge-xs ${badge.className}`}>{badge.label}</span>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          className="btn btn-xs btn-outline flex-1"
          disabled={disabled}
          title="Добавить узел чтения переменной"
          onClick={() => onAddNode('variable-get', variable.id)}
        >
          get
        </button>
        <button
          type="button"
          className="btn btn-xs btn-outline flex-1"
          disabled={disabled}
          title="Добавить узел записи переменной"
          onClick={() => onAddNode('variable-set', variable.id)}
        >
          set
        </button>
      </div>
    </div>
  );
};

/** Левый сайдбар доски (MP7b RT6 + DBR2): вкладки веток + конструктор переменных. */
export const BoardLeftSidebar: React.FC<BoardLeftSidebarProps> = ({
  activeBranch,
  isScenarioLayer,
  onSelectBranch,
  signalAdvanced,
  isSignalLayer,
  onSelectSignal,
  variables,
  onAddVariable,
  onRenameVariable,
  onRemoveVariable,
  onAddVariableNode,
}) => (
  <nav
    className={`flex h-full ${BOARD_LEFT_SIDEBAR_WIDTH_CLASS} flex-col gap-4 overflow-y-auto border-r border-base-300 bg-base-200/95 p-3 shadow-lg backdrop-blur-sm`}
    aria-label="Вкладки доски"
  >
    {BRANCH_SIDEBAR_SECTIONS.map((section) => (
      <div key={section.title} className="flex flex-col gap-1">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
          {section.title}
        </p>
        {section.tabs.map((branch) => {
          const active = isScenarioLayer && activeBranch === branch;
          return (
            <button
              key={branch}
              type="button"
              aria-current={active ? 'page' : undefined}
              className={`btn btn-sm justify-start ${active ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onSelectBranch(branch)}
            >
              {BRANCH_TAB_LABEL[branch]}
            </button>
          );
        })}
      </div>
    ))}

    <section className="flex flex-col gap-2" aria-label="Конструктор переменных">
      <div className="flex items-center justify-between px-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
          Конструктор переменных
        </p>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          className="btn btn-xs btn-outline flex-1"
          title="Объявить переменную типа Device"
          onClick={() => onAddVariable('DeviceRef')}
        >
          + Device
        </button>
        <button
          type="button"
          className="btn btn-xs btn-outline flex-1"
          title="Объявить переменную типа Microphone"
          onClick={() => onAddVariable('MicrophoneRef')}
        >
          + Microphone
        </button>
      </div>
      {variables.length === 0 ? (
        <p className="px-2 text-[10px] leading-relaxed text-base-content/40">
          Переменные хранят ссылки на Device/Microphone. Создайте переменную и перетащите узлы
          get/set в активную ветку.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {variables.map((variable) => (
            <VariableRow
              key={variable.id}
              variable={variable}
              disabled={!isScenarioLayer}
              onRename={onRenameVariable}
              onRemove={onRemoveVariable}
              onAddNode={onAddVariableNode}
            />
          ))}
        </div>
      )}
    </section>

    {signalAdvanced ? (
      <div className="mt-auto flex flex-col gap-1 border-t border-base-300 pt-3">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
          Advanced
        </p>
        <button
          type="button"
          aria-current={isSignalLayer ? 'page' : undefined}
          className={`btn btn-sm justify-start ${isSignalLayer ? 'btn-secondary' : 'btn-ghost'}`}
          onClick={onSelectSignal}
        >
          Signal
        </button>
      </div>
    ) : null}
  </nav>
);
