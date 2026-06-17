import React, { useCallback, useEffect, useState } from 'react';
import type { OnSelectionChangeParams } from '@xyflow/react';

import { useDeviceBoardMode } from '../context/device-board-mode-context.js';
import { DeviceBoardGraphProvider, useDeviceBoardGraph } from '../context/device-board-graph-context.js';
import type { ScenarioRuntimeHost } from '../runtime/index.js';
import type { DeviceBoardPersistAdapter } from '../persist/device-board-persist.js';
import type { HydratedBoardState } from '../graph/hydrate-board-from-document.js';
import type { BoardLayerTab, ScenarioBranchTab } from '../types/board-ui.js';
import { BoardFlowCanvas } from './board-flow-canvas.js';
import { BoardInspector } from './board-inspector.js';
import { BoardRuntimeStatus } from './board-runtime-status.js';
import { BoardValidationBanner } from './board-validation-banner.js';

const TAB_LABEL: Record<BoardLayerTab, string> = {
  signal: 'Signal',
  scenario: 'Scenario',
};

const BRANCH_LABEL: Record<ScenarioBranchTab, string> = {
  initial: 'Initial',
  main: 'Main loop',
  alarm: 'Alarm loop',
  onStop: 'On stop',
  onDisconnect: 'On disconnect',
  function: 'Function',
};

export interface DeviceBoardShellProps {
  readonly runtimeHost?: ScenarioRuntimeHost;
  readonly persistAdapter?: DeviceBoardPersistAdapter;
  readonly initialHydratedState?: HydratedBoardState;
  readonly onRequestExit?: () => void;
  readonly exitLabel?: string;
  readonly showRunControls?: boolean;
}

const DeviceBoardShellInner: React.FC<{
  onRequestExit?: () => void;
  exitLabel: string;
  showRunControls: boolean;
}> = ({ onRequestExit, exitLabel, showRunControls }) => {
  const { exitBoardMode } = useDeviceBoardMode();
  const graph = useDeviceBoardGraph();
  const [activeTab, setActiveTab] = useState<BoardLayerTab>('scenario');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    graph.refreshValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial validation once on mount
  }, []);

  const handleSelectionChange = useCallback((selection: OnSelectionChangeParams) => {
    const node = selection.nodes[0];
    if (node === undefined) {
      setSelectedNodeId(null);
      setSelectedNodeLabel(null);
      return;
    }
    setSelectedNodeId(node.id);
    const label = typeof node.data?.label === 'string' ? node.data.label : node.id;
    setSelectedNodeLabel(label);
  }, []);

  const handleTabChange = useCallback((tab: BoardLayerTab) => {
    setActiveTab(tab);
    setSelectedNodeId(null);
    setSelectedNodeLabel(null);
  }, []);

  const handleBranchChange = useCallback(
    (branch: ScenarioBranchTab) => {
      graph.setScenarioBranch(branch);
      setSelectedNodeId(null);
      setSelectedNodeLabel(null);
    },
    [graph],
  );

  const isSignal = activeTab === 'signal';
  const scenarioBranch = graph.scenarioBranch;

  const handleExitBoardMode = useCallback(() => {
    if (graph.runtimeState.isRunning) {
      graph.stopScenario('system');
    }
    if (onRequestExit !== undefined) {
      onRequestExit();
      return;
    }
    exitBoardMode();
  }, [exitBoardMode, graph, onRequestExit]);

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
    graph.syncStatus === 'loading'
      ? 'Загрузка…'
      : graph.syncStatus === 'saving'
        ? 'Сохранение…'
        : graph.syncStatus === 'saved'
          ? 'Синхронизировано'
          : graph.syncStatus === 'error'
            ? 'Ошибка sync'
            : null;

  const scenarioCanvas =
    scenarioBranch === 'initial'
      ? {
          nodes: graph.scenarioInitialNodes,
          edges: graph.scenarioInitialEdges,
          onNodesChange: graph.onScenarioInitialNodesChange,
          onEdgesChange: graph.onScenarioInitialEdgesChange,
          onConnect: graph.onScenarioInitialConnect,
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

  return (
    <div className="flex h-screen flex-col bg-base-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 px-4 py-2 shadow-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
            Device board
          </p>
          <h1 className="text-sm font-semibold text-base-content">Редактор устройства</h1>
        </div>

        <div role="tablist" className="tabs tabs-boxed bg-base-200" aria-label="Слой графа">
          {(['signal', 'scenario'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`tab tab-sm ${activeTab === tab ? 'tab-active' : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {TAB_LABEL[tab]}
            </button>
          ))}
        </div>

        {!isSignal ? (
          <div role="tablist" className="tabs tabs-boxed bg-base-100" aria-label="Ветка сценария">
            {(['initial', 'main', 'alarm', 'function', 'onStop', 'onDisconnect'] as const).map((branch) => (
              <button
                key={branch}
                type="button"
                role="tab"
                aria-selected={graph.scenarioBranch === branch}
                className={`tab tab-xs ${graph.scenarioBranch === branch ? 'tab-active' : ''}`}
                onClick={() => handleBranchChange(branch)}
              >
                {BRANCH_LABEL[branch]}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          {syncLabel !== null ? (
            <span
              className={`text-xs ${graph.syncStatus === 'error' ? 'text-error' : 'text-base-content/60'}`}
              title={graph.syncError ?? undefined}
            >
              {syncLabel}
            </span>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void handleImportFile(event)}
          />
          <button type="button" className="btn btn-sm btn-outline" onClick={handleImportClick}>
            Import JSON
          </button>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => void graph.exportJson()}>
            Export JSON
          </button>
          {showRunControls ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => void graph.startScenario()}
                disabled={!graph.canRun}
                title={graph.canRun ? 'Запуск initial → main → alarm' : 'Исправьте ошибки или дождитесь остановки'}
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
            </>
          ) : null}
          <button type="button" className="btn btn-sm btn-outline" onClick={handleExitBoardMode}>
            {exitLabel}
          </button>
        </div>
      </header>

      <BoardValidationBanner issues={graph.validationIssues} successMessage={null} />
      {importError !== null ? (
        <div className="border-b border-error/30 bg-error/10 px-4 py-2 text-xs text-error">{importError}</div>
      ) : null}
      <BoardRuntimeStatus state={graph.runtimeState} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1" aria-label={`Канвас: ${TAB_LABEL[activeTab]}`}>
          {isSignal ? (
            <BoardFlowCanvas
              layer="signal"
              nodes={graph.signalNodes}
              edges={graph.signalEdges}
              onNodesChange={graph.onSignalNodesChange}
              onEdgesChange={graph.onSignalEdgesChange}
              onConnect={graph.onSignalConnect}
              isValidConnection={(connection) => graph.isValidConnection('signal', connection)}
              onSelectionChange={handleSelectionChange}
            />
          ) : (
            <BoardFlowCanvas
              layer="scenario"
              nodes={scenarioCanvas.nodes}
              edges={scenarioCanvas.edges}
              onNodesChange={scenarioCanvas.onNodesChange}
              onEdgesChange={scenarioCanvas.onEdgesChange}
              onConnect={scenarioCanvas.onConnect}
              isValidConnection={(connection) => graph.isValidConnection('scenario', connection)}
              onSelectionChange={handleSelectionChange}
            />
          )}
        </main>
        <BoardInspector
          layer={activeTab}
          selectedNodeId={selectedNodeId}
          selectedNodeLabel={selectedNodeLabel}
        />
      </div>
    </div>
  );
};

/** Полноэкранный shell доски: Signal/Scenario, initial + main + alarm loop, ScenarioRuntime. */
export const DeviceBoardShell: React.FC<DeviceBoardShellProps> = ({
  runtimeHost,
  persistAdapter,
  initialHydratedState,
  onRequestExit,
  exitLabel = 'Выйти из доски',
  showRunControls = true,
}) => (
  <DeviceBoardGraphProvider
    runtimeHost={runtimeHost}
    persistAdapter={persistAdapter}
    initialHydratedState={initialHydratedState}
  >
    <DeviceBoardShellInner
      onRequestExit={onRequestExit}
      exitLabel={exitLabel}
      showRunControls={showRunControls}
    />
  </DeviceBoardGraphProvider>
);
