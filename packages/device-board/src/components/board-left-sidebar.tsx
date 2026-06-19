import React, { useState } from 'react';
import type { ScenarioVariable, ScenarioVariableType } from '@membrana/core';

import { type VariableNodeKind } from '../graph/index.js';
import { variableTypeIndicatorClass } from '../graph/variable-type-indicator.js';
import {
  BOARD_LEFT_SIDEBAR_WIDTH_CLASS,
  BRANCH_SIDEBAR_SECTIONS,
  BRANCH_TAB_LABEL,
  type ScenarioBranchTab,
} from '../types/board-ui.js';
import {
  AddVariableModal,
  PencilIcon,
  RenameVariableModal,
  TrashIcon,
  VariableNodeKindModal,
} from './board-variable-modals.js';

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

const VariableRow: React.FC<{
  readonly variable: ScenarioVariable;
  readonly onOpenNodeKind: (variable: ScenarioVariable) => void;
  readonly onOpenRename: (variable: ScenarioVariable) => void;
  readonly onRemove: (id: string) => void;
}> = ({ variable, onOpenNodeKind, onOpenRename, onRemove }) => (
  <div
    className="group flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-transparent px-1 hover:border-base-300 hover:bg-base-100/80"
    role="button"
    tabIndex={0}
    aria-label={`Переменная ${variable.name}`}
    onClick={() => onOpenNodeKind(variable)}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onOpenNodeKind(variable);
      }
    }}
  >
    <span
      className={`h-2.5 w-2.5 shrink-0 rounded-full ${variableTypeIndicatorClass(variable.type)}`}
      title={variable.type}
      aria-hidden
    />
    <span className="min-w-0 flex-1 truncate font-mono text-sm">{variable.name}</span>
    <button
      type="button"
      className="btn btn-ghost btn-xs shrink-0 px-1 opacity-70 group-hover:opacity-100"
      aria-label={`Редактировать имя ${variable.name}`}
      title="Редактировать имя"
      onClick={(event) => {
        event.stopPropagation();
        onOpenRename(variable);
      }}
    >
      <PencilIcon />
    </button>
    <button
      type="button"
      className="btn btn-ghost btn-xs shrink-0 px-1 text-error opacity-70 group-hover:opacity-100"
      aria-label={`Удалить переменную ${variable.name}`}
      title="Удалить переменную"
      onClick={(event) => {
        event.stopPropagation();
        onRemove(variable.id);
      }}
    >
      <TrashIcon />
    </button>
  </div>
);

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
}) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [nodeKindVariable, setNodeKindVariable] = useState<ScenarioVariable | null>(null);
  const [renameVariable, setRenameVariable] = useState<ScenarioVariable | null>(null);

  return (
    <>
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

        <section className="flex min-h-0 flex-1 flex-col gap-2" aria-label="Конструктор переменных">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
            Конструктор переменных
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm w-full"
            title="Добавить переменную"
            onClick={() => setAddModalOpen(true)}
          >
            +
          </button>
          {variables.length === 0 ? (
            <p className="px-2 text-[10px] leading-relaxed text-base-content/40">
              Создайте переменную кнопкой «+», затем выберите её для добавления get/set на канвас.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5 overflow-y-auto">
              {variables.map((variable) => (
                <li key={variable.id}>
                  <VariableRow
                    variable={variable}
                    onOpenNodeKind={setNodeKindVariable}
                    onOpenRename={setRenameVariable}
                    onRemove={onRemoveVariable}
                  />
                </li>
              ))}
            </ul>
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

      <AddVariableModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onPickType={onAddVariable}
      />
      <VariableNodeKindModal
        variable={nodeKindVariable}
        disabled={!isScenarioLayer}
        onClose={() => setNodeKindVariable(null)}
        onPickKind={onAddVariableNode}
      />
      <RenameVariableModal
        variable={renameVariable}
        onClose={() => setRenameVariable(null)}
        onRename={onRenameVariable}
      />
    </>
  );
};
