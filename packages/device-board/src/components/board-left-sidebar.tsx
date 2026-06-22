import React, { useState } from 'react';
import type { ScenarioVariable, ScenarioVariableType } from '@membrana/core';

import { type VariableNodeKind } from '../graph/index.js';
import type { NodePortInspectionResult } from '../runtime/index.js';
import { variableTypeIndicatorClass } from '../graph/variable-type-indicator.js';
import type { ScenarioFunctionDraft } from '../graph/index.js';
import {
  BOARD_LEFT_SIDEBAR_WIDTH_CLASS,
  BRANCH_SIDEBAR_SECTIONS,
  BRANCH_TAB_LABEL,
  type ScenarioBranchTab,
} from '../types/board-ui.js';
import { BoardRuntimePortPanel } from './board-runtime-port-panel.js';
import { BoardFunctionList } from './board-function-list.js';
import {
  AddVariableModal,
  DeleteFunctionModal,
  DeleteVariableModal,
  PencilIcon,
  RenameVariableModal,
  TrashIcon,
  VariableNodeKindModal,
} from './board-variable-modals.js';

export interface BoardLeftSidebarProps {
  readonly activeBranch: ScenarioBranchTab;
  readonly isScenarioLayer: boolean;
  readonly isRuntime: boolean;
  readonly runtimeInspection: NodePortInspectionResult | null;
  readonly onSelectBranch: (branch: ScenarioBranchTab) => void;
  readonly signalAdvanced: boolean;
  readonly isSignalLayer: boolean;
  readonly onSelectSignal: () => void;
  readonly variables: readonly ScenarioVariable[];
  readonly onAddVariable: (type: ScenarioVariableType) => void;
  readonly onRenameVariable: (id: string, name: string) => void;
  readonly onRemoveVariable: (id: string) => void;
  readonly onAddVariableNode: (kind: VariableNodeKind, variableId: string) => void;
  readonly scenarioFunctions: readonly ScenarioFunctionDraft[];
  readonly activeFunctionId: string;
  readonly onSelectFunction: (functionId: string) => void;
  readonly onCreateFunction: () => void;
  readonly onRemoveFunction: (functionId: string) => void;
}

const VariableRow: React.FC<{
  readonly variable: ScenarioVariable;
  readonly disabled: boolean;
  readonly onOpenNodeKind: (variable: ScenarioVariable) => void;
  readonly onOpenRename: (variable: ScenarioVariable) => void;
  readonly onOpenDelete: (variable: ScenarioVariable) => void;
}> = ({ variable, disabled, onOpenNodeKind, onOpenRename, onOpenDelete }) => (
  <div
    className={`group flex h-9 min-w-0 items-center gap-2 rounded-md border border-transparent px-1 ${
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-base-300 hover:bg-base-100/80'
    }`}
    role="button"
    tabIndex={disabled ? -1 : 0}
    aria-label={`Переменная ${variable.name}`}
    aria-disabled={disabled}
    onClick={() => {
      if (!disabled) {
        onOpenNodeKind(variable);
      }
    }}
    onKeyDown={(event) => {
      if (disabled) {
        return;
      }
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
      disabled={disabled}
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
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onOpenDelete(variable);
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
  isRuntime,
  runtimeInspection,
  onSelectBranch,
  signalAdvanced,
  isSignalLayer,
  onSelectSignal,
  variables,
  onAddVariable,
  onRenameVariable,
  onRemoveVariable,
  onAddVariableNode,
  scenarioFunctions,
  activeFunctionId,
  onSelectFunction,
  onCreateFunction,
  onRemoveFunction,
}) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [nodeKindVariable, setNodeKindVariable] = useState<ScenarioVariable | null>(null);
  const [renameVariable, setRenameVariable] = useState<ScenarioVariable | null>(null);
  const [deleteVariable, setDeleteVariable] = useState<ScenarioVariable | null>(null);
  const [deleteFunctionId, setDeleteFunctionId] = useState<string | null>(null);

  const constructorDisabled = !isScenarioLayer || isRuntime;
  const showRuntimeInputs = isRuntime && runtimeInspection !== null;
  const deleteFunctionName =
    deleteFunctionId === null
      ? null
      : (scenarioFunctions.find((fn) => fn.id === deleteFunctionId)?.name ?? null);

  return (
    <>
      <nav
        className={`flex h-full ${BOARD_LEFT_SIDEBAR_WIDTH_CLASS} flex-col gap-4 overflow-y-auto overflow-x-hidden border-r border-base-300 bg-base-200/95 p-3 shadow-lg backdrop-blur-sm`}
        aria-label="Вкладки доски"
      >
        {!showRuntimeInputs
          ? BRANCH_SIDEBAR_SECTIONS.map((section) => (
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
            ))
          : null}

        {showRuntimeInputs ? (
          <section
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pt-1"
            aria-label="Входящие данные узла"
          >
            <div className="border-b border-base-300/80 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
                {runtimeInspection.nodeLabel}
              </p>
            </div>
            <BoardRuntimePortPanel
              title="Входящие данные"
              ports={runtimeInspection.inputs}
              mode="values"
              emptyHint="Нет входов"
            />
          </section>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col gap-2" aria-label="Конструктор переменных">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
              Конструктор переменных
            </p>
            <button
              type="button"
              className="btn btn-outline btn-sm w-full"
              title="Добавить переменную"
              disabled={constructorDisabled}
              onClick={() => setAddModalOpen(true)}
            >
              +
            </button>
            {isRuntime ? (
              <p className="px-2 text-[10px] leading-relaxed text-base-content/40">
                Редактирование недоступно во время выполнения сценария. Выберите узел на канвасе.
              </p>
            ) : variables.length === 0 ? (
              <p className="px-2 text-[10px] leading-relaxed text-base-content/40">
                Создайте переменную кнопкой «+», затем выберите её для добавления get/set на канвас.
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5 overflow-y-auto">
                {variables.map((variable) => (
                  <li key={variable.id}>
                    <VariableRow
                      variable={variable}
                      disabled={constructorDisabled}
                      onOpenNodeKind={setNodeKindVariable}
                      onOpenRename={setRenameVariable}
                      onOpenDelete={setDeleteVariable}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!showRuntimeInputs && isScenarioLayer ? (
          <BoardFunctionList
            functions={scenarioFunctions}
            activeFunctionId={activeFunctionId}
            disabled={isRuntime}
            onSelect={onSelectFunction}
            onCreate={onCreateFunction}
            onDelete={setDeleteFunctionId}
          />
        ) : null}

        {signalAdvanced && !showRuntimeInputs ? (
          <div className="flex flex-col gap-1 border-t border-base-300 pt-3">
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

        {showRuntimeInputs ? (
          <footer className="mt-auto shrink-0 border-t border-base-300 pt-2">
            <BoardRuntimePortPanel
              title="Интерфейс входов"
              ports={runtimeInspection.inputs}
              mode="interface"
              showTypeIndicators
              emptyHint="—"
            />
          </footer>
        ) : null}
      </nav>

      <AddVariableModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onPickType={onAddVariable}
      />
      <VariableNodeKindModal
        variable={nodeKindVariable}
        disabled={constructorDisabled}
        onClose={() => setNodeKindVariable(null)}
        onPickKind={onAddVariableNode}
      />
      <RenameVariableModal
        variable={renameVariable}
        onClose={() => setRenameVariable(null)}
        onRename={onRenameVariable}
      />
      <DeleteVariableModal
        variable={deleteVariable}
        onClose={() => setDeleteVariable(null)}
        onConfirm={onRemoveVariable}
      />
      <DeleteFunctionModal
        functionName={deleteFunctionName}
        onClose={() => setDeleteFunctionId(null)}
        onConfirm={() => {
          if (deleteFunctionId !== null) {
            onRemoveFunction(deleteFunctionId);
          }
        }}
      />
    </>
  );
};
