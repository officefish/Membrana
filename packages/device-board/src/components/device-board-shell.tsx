import React, { useCallback, useEffect, useState } from 'react';
import type { OnSelectionChangeParams } from '@xyflow/react';
import type { ScenarioNodeKind } from '@membrana/core';

import { useDeviceBoardMode } from '../context/device-board-mode-context.js';
import { DeviceBoardGraphProvider, useDeviceBoardGraph } from '../context/device-board-graph-context.js';
import type { ScenarioMicrophoneOption, ScenarioRuntimeHost } from '../runtime/index.js';
import type { DeviceBoardPersistAdapter } from '../persist/device-board-persist.js';
import type { HydratedBoardState } from '../graph/hydrate-board-from-document.js';
import {
  BRANCH_TAB_LABEL,
  BRANCH_SCENARIO_TITLE,
  BOARD_HEADER_CONTENT_OFFSET_CLASS,
  SIGNAL_LAYER_TITLE,
  isSignalAdvancedEnabled,
  type ScenarioBranchTab,
} from '../types/board-ui.js';
import { BoardFlowCanvas } from './board-flow-canvas.js';
import { BoardLeftSidebar } from './board-left-sidebar.js';
import { BoardRightSidebar } from './board-right-sidebar.js';
import { BoardRuntimeStatus } from './board-runtime-status.js';
import { BoardValidationBanner } from './board-validation-banner.js';
import { shouldPreserveLockedNodes } from '../graph/clear-branch.js';
import { referenceTypeLabel } from '../graph/index.js';

export interface DeviceBoardShellProps {
  readonly runtimeHost?: ScenarioRuntimeHost;
  readonly persistAdapter?: DeviceBoardPersistAdapter;
  readonly initialHydratedState?: HydratedBoardState;
  readonly onRequestExit?: () => void;
  readonly exitLabel?: string;
  readonly showRunControls?: boolean;
  /** Online-presence выбранного устройства; `undefined` — не проверять (автономный клиент). */
  readonly deviceLive?: boolean;
}

const DeviceBoardShellInner: React.FC<{
  onRequestExit?: () => void;
  exitLabel: string;
  showRunControls: boolean;
  runtimeHost?: ScenarioRuntimeHost;
}> = ({ onRequestExit, exitLabel, showRunControls, runtimeHost }) => {
  const { exitBoardMode } = useDeviceBoardMode();
  const graph = useDeviceBoardGraph();
  const signalAdvanced = isSignalAdvancedEnabled();
  const [activeLayer, setActiveLayer] = useState<'signal' | 'scenario'>('scenario');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);
  const [selectedNodeKind, setSelectedNodeKind] = useState<ScenarioNodeKind | null>(null);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string | null>(null);
  const [selectedVariableId, setSelectedVariableId] = useState<string | null>(null);
  const [microphoneOptions, setMicrophoneOptions] = useState<readonly ScenarioMicrophoneOption[]>([]);
  const [microphoneOptionsLoading, setMicrophoneOptionsLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    graph.refreshValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial validation once on mount
  }, []);

  const refreshMicrophoneOptions = useCallback(async () => {
    if (runtimeHost?.enumerateMicrophones === undefined) {
      return;
    }
    setMicrophoneOptionsLoading(true);
    try {
      const list = await runtimeHost.enumerateMicrophones();
      setMicrophoneOptions(list);
    } finally {
      setMicrophoneOptionsLoading(false);
    }
  }, [runtimeHost]);

  useEffect(() => {
    void refreshMicrophoneOptions();
  }, [refreshMicrophoneOptions]);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeLabel(null);
    setSelectedNodeKind(null);
    setSelectedMicrophoneId(null);
    setSelectedVariableId(null);
  }, []);

  const handleSelectionChange = useCallback((selection: OnSelectionChangeParams) => {
    const node = selection.nodes[0];
    if (node === undefined) {
      setSelectedNodeId(null);
      setSelectedNodeLabel(null);
      setSelectedNodeKind(null);
      setSelectedMicrophoneId(null);
      setSelectedVariableId(null);
      return;
    }
    setSelectedNodeId(node.id);
    const label = typeof node.data?.label === 'string' ? node.data.label : node.id;
    setSelectedNodeLabel(label);
    const kind = typeof node.data?.nodeKind === 'string' ? (node.data.nodeKind as ScenarioNodeKind) : null;
    setSelectedNodeKind(kind);
    const micId = typeof node.data?.microphoneId === 'string' ? node.data.microphoneId : null;
    setSelectedMicrophoneId(micId);
    const varId = typeof node.data?.variableId === 'string' ? node.data.variableId : null;
    setSelectedVariableId(varId);
    if (kind === 'get-microphone') {
      void refreshMicrophoneOptions();
    }
  }, [refreshMicrophoneOptions]);

  const handleSelectBranch = useCallback(
    (branch: ScenarioBranchTab) => {
      graph.setScenarioBranch(branch);
      setActiveLayer('scenario');
      clearSelection();
    },
    [clearSelection, graph],
  );

  const handleSelectSignal = useCallback(() => {
    setActiveLayer('signal');
    clearSelection();
  }, [clearSelection]);

  const isSignal = activeLayer === 'signal';
  const scenarioBranch = graph.scenarioBranch;

  const handleExitBoardMode = useCallback(() => {
    if (graph.isDirty) {
      const confirmed =
        typeof window === 'undefined' ||
        window.confirm('Есть несохранённые изменения. Выйти без сохранения?');
      if (!confirmed) {
        return;
      }
    }
    if (graph.runtimeState.isRunning) {
      graph.stopScenario('system');
    }
    if (onRequestExit !== undefined) {
      onRequestExit();
      return;
    }
    exitBoardMode();
  }, [exitBoardMode, graph, onRequestExit]);

  const handleClearBoard = useCallback(() => {
    const layerLabel = isSignal ? 'Signal' : BRANCH_TAB_LABEL[scenarioBranch];
    const preserveNote = shouldPreserveLockedNodes(isSignal ? 'signal' : 'scenario', scenarioBranch)
      ? ' Системный Event-узел останется.'
      : '';
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Очистить узлы ветки «${layerLabel}»? Другие ветки не затрагиваются.${preserveNote}`)
    ) {
      return;
    }
    graph.clearCurrentBranch(isSignal ? 'signal' : 'scenario');
    clearSelection();
  }, [clearSelection, graph, isSignal, scenarioBranch]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file === undefined) return;
      setImportError(null);
      const error = await graph.importJsonFile(file);
      if (error !== null) {
        setImportError(error);
      }
    },
    [graph],
  );

  const syncLabel =
    graph.syncStatus === 'error' ? graph.syncError ?? 'Ошибка сохранения' : null;

  const canSave = graph.isDirty && graph.syncStatus !== 'saving' && graph.syncStatus !== 'loading';
  const mode = graph.mode;
  const isSaving = graph.syncStatus === 'saving';

  const scenarioCanvas =
    scenarioBranch === 'initial'
      ? {
          nodes: graph.scenarioInitialNodes,
          edges: graph.scenarioInitialEdges,
          onNodesChange: graph.onScenarioInitialNodesChange,
          onEdgesChange: graph.onScenarioInitialEdgesChange,
          onConnect: graph.onScenarioInitialConnect,
        }
      : scenarioBranch === 'onConnect'
      ? {
          nodes: graph.scenarioOnConnectNodes,
          edges: graph.scenarioOnConnectEdges,
          onNodesChange: graph.onScenarioOnConnectNodesChange,
          onEdgesChange: graph.onScenarioOnConnectEdgesChange,
          onConnect: graph.onScenarioOnConnectConnect,
        }
      : scenarioBranch === 'main'
        ? {
            nodes: graph.scenarioMainNodes,
            edges: graph.scenarioMainEdges,
            onNodesChange: graph.onScenarioMainNodesChange,
            onEdgesChange: graph.onScenarioMainEdgesChange,
            onConnect: graph.onScenarioMainConnect,
          }
        : scenarioBranch === 'alarm'
          ? {
              nodes: graph.scenarioAlarmNodes,
              edges: graph.scenarioAlarmEdges,
              onNodesChange: graph.onScenarioAlarmNodesChange,
              onEdgesChange: graph.onScenarioAlarmEdgesChange,
              onConnect: graph.onScenarioAlarmConnect,
            }
          : scenarioBranch === 'onStop'
            ? {
                nodes: graph.scenarioOnStopNodes,
                edges: graph.scenarioOnStopEdges,
                onNodesChange: graph.onScenarioOnStopNodesChange,
                onEdgesChange: graph.onScenarioOnStopEdgesChange,
                onConnect: graph.onScenarioOnStopConnect,
              }
            : scenarioBranch === 'onDisconnect'
              ? {
                  nodes: graph.scenarioOnDisconnectNodes,
                  edges: graph.scenarioOnDisconnectEdges,
                  onNodesChange: graph.onScenarioOnDisconnectNodesChange,
                  onEdgesChange: graph.onScenarioOnDisconnectEdgesChange,
                  onConnect: graph.onScenarioOnDisconnectConnect,
                }
              : {
                  nodes: graph.scenarioFunctionNodes,
                  edges: graph.scenarioFunctionEdges,
                  onNodesChange: graph.onScenarioFunctionNodesChange,
                  onEdgesChange: graph.onScenarioFunctionEdgesChange,
                  onConnect: graph.onScenarioFunctionConnect,
                };

  const canvasLabel = isSignal ? 'Signal' : BRANCH_TAB_LABEL[scenarioBranch];

  const scenarioTitle = isSignal ? SIGNAL_LAYER_TITLE : BRANCH_SCENARIO_TITLE[scenarioBranch];

  const selectedVariable = graph.variables.find((item) => item.id === selectedVariableId);
  const selectedVariableName = selectedVariable?.name ?? '';
  const selectedVariableTypeLabel =
    selectedVariable !== undefined ? referenceTypeLabel(selectedVariable.type) : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-base-100">
      <header className="relative flex items-center justify-between gap-3 border-b border-base-200 py-2 pr-4 shadow-sm">
        <div
          className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center justify-center"
          aria-label="Membrana"
          title="Membrana"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-content">
            M
          </span>
        </div>

        <div className={`flex min-w-0 flex-1 items-center gap-3 ${BOARD_HEADER_CONTENT_OFFSET_CLASS}`}>
          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            {isSaving ? (
              <span
                className="loading loading-spinner loading-sm text-primary"
                aria-label="Сохранение сценария"
              />
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-primary shrink-0"
            disabled={!canSave}
            onClick={() => void graph.saveScenario()}
          >
            Сохранить
          </button>
          <p className="min-w-0 truncate text-[11px] leading-tight text-base-content/60">
            {scenarioTitle}
          </p>
          {syncLabel !== null ? (
            <span className="shrink-0 text-xs text-error" title={graph.syncError ?? undefined}>
              {syncLabel}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showRunControls ? (
            <>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => void graph.startScenario()}
                  disabled={!graph.canRun}
                  title={graph.canRun ? 'Запуск сценария' : (graph.runDisabledReason ?? 'Запуск недоступен')}
                  aria-label={graph.canRun ? 'Запуск сценария' : graph.runDisabledReason ?? 'Запуск недоступен'}
                >
                  Run
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => graph.stopScenario('user')}
                  disabled={!graph.runtimeState.isRunning}
                >
                  Stop
                </button>
              </div>

              <div role="group" aria-label="Режим" className="join">
                <button
                  type="button"
                  aria-pressed={mode === 'normal'}
                  className={`btn btn-sm join-item ${mode === 'normal' ? 'btn-info' : 'btn-ghost'}`}
                  onClick={() => graph.setMode('normal')}
                  disabled={!graph.runtimeState.isRunning}
                >
                  Обычный
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'alarm'}
                  className={`btn btn-sm join-item ${mode === 'alarm' ? 'btn-warning' : 'btn-ghost'}`}
                  onClick={() => graph.setMode('alarm')}
                  disabled={!graph.runtimeState.isRunning}
                >
                  Тревога
                </button>
              </div>
              <span className="sr-only" role="status" aria-live="polite">
                Режим: {mode === 'alarm' ? 'тревога' : 'обычный'}
              </span>
            </>
          ) : null}

          <button type="button" className="btn btn-sm btn-outline" onClick={handleExitBoardMode}>
            {exitLabel}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void handleImportFile(event)}
          />
          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className="btn btn-sm btn-ghost btn-square"
              aria-label="Настройки сценария"
            >
              ⚙
            </button>
            <ul
              tabIndex={0}
              className="dropdown-content menu z-[70] w-44 rounded-box border border-base-300 bg-base-100 p-2 shadow"
            >
              <li>
                <button type="button" onClick={handleImportClick}>
                  Import JSON
                </button>
              </li>
              <li>
                <button type="button" onClick={() => void graph.exportJson()}>
                  Export JSON
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <BoardValidationBanner issues={graph.validationIssues} successMessage={null} />
      {importError !== null ? (
        <div className="border-b border-error/30 bg-error/10 px-4 py-2 text-xs text-error">{importError}</div>
      ) : null}
      <BoardRuntimeStatus state={graph.runtimeState} />

      <div className="relative min-h-0 flex-1 basis-0 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <BoardFlowCanvas
            layer={isSignal ? 'signal' : 'scenario'}
            nodes={isSignal ? graph.signalNodes : scenarioCanvas.nodes}
            edges={isSignal ? graph.signalEdges : scenarioCanvas.edges}
            onNodesChange={
              isSignal ? graph.onSignalNodesChange : scenarioCanvas.onNodesChange
            }
            onEdgesChange={
              isSignal ? graph.onSignalEdgesChange : scenarioCanvas.onEdgesChange
            }
            onConnect={isSignal ? graph.onSignalConnect : scenarioCanvas.onConnect}
            isValidConnection={(connection) =>
              graph.isValidConnection(isSignal ? 'signal' : 'scenario', connection)
            }
            onSelectionChange={handleSelectionChange}
            pulseEdges={graph.runtimeState.isRunning}
            ariaLabel={`Канвас: ${canvasLabel}`}
          />
        </div>

        <aside className="absolute bottom-0 left-0 top-0 z-10" aria-label="Палитра и ветки">
          <BoardLeftSidebar
            activeBranch={scenarioBranch}
            isScenarioLayer={!isSignal}
            onSelectBranch={handleSelectBranch}
            signalAdvanced={signalAdvanced}
            isSignalLayer={isSignal}
            onSelectSignal={handleSelectSignal}
            variables={graph.variables}
            onAddVariable={graph.addVariable}
            onRenameVariable={graph.renameVariable}
            onRemoveVariable={graph.removeVariable}
            onAddVariableNode={graph.addVariableNodeToCurrentBranch}
          />
        </aside>
        <aside className="absolute bottom-0 right-0 top-0 z-10" aria-label="Инспектор и палитра">
          <BoardRightSidebar
            selectedNodeId={selectedNodeId}
            selectedNodeLabel={selectedNodeLabel}
            selectedNodeKind={selectedNodeKind}
            selectedMicrophoneId={selectedMicrophoneId}
            selectedVariableName={selectedVariableName}
            selectedVariableTypeLabel={selectedVariableTypeLabel}
            microphoneOptions={microphoneOptions}
            microphoneOptionsLoading={microphoneOptionsLoading}
            canEditScenario={!isSignal}
            onAddLegacyNode={graph.addScenarioNodeToCurrentBranch}
            onAddPaletteNode={graph.addPaletteNodeToCurrentBranch}
            onMicrophoneIdChange={graph.updatePaletteNodeMicrophoneId}
            onAssignVariableName={graph.assignNodeVariableName}
            onClearBoard={handleClearBoard}
          />
        </aside>
      </div>
    </div>
  );
};

/** Полноэкранный shell доски (MP7b RT6): шапка run/stop + normal/alarm, сайдбары вкладок и палитры. */
export const DeviceBoardShell: React.FC<DeviceBoardShellProps> = ({
  runtimeHost,
  persistAdapter,
  initialHydratedState,
  onRequestExit,
  exitLabel = 'Выйти из доски',
  showRunControls = true,
  deviceLive,
}) => (
  <DeviceBoardGraphProvider
    runtimeHost={runtimeHost}
    persistAdapter={persistAdapter}
    initialHydratedState={initialHydratedState}
    deviceLive={deviceLive}
  >
    <DeviceBoardShellInner
      onRequestExit={onRequestExit}
      exitLabel={exitLabel}
      showRunControls={showRunControls}
      runtimeHost={runtimeHost}
    />
  </DeviceBoardGraphProvider>
);
