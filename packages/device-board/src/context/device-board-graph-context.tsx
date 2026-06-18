import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import type { DeviceKind, RuntimeMode, ScenarioBlockKind } from '@membrana/core';

import type { BoardLayerTab, ScenarioBranchTab } from '../types/board-ui.js';
import {
  buildDeviceScenarioDocument,
  createDefaultHydratedBoardState,
  createScenarioBoardNode,
  exportDeviceScenarioDocument,
  hydrateBoardFromDocument,
  hydratedFunctionInput,
  importDeviceScenarioFromJson,
  isPreRunValid,
  isValidBoardConnection,
  validatePreRun,
} from '../graph/index.js';
import type { HydratedBoardState, PreRunValidationIssue } from '../graph/index.js';
import type { DeviceBoardPersistAdapter } from '../persist/device-board-persist.js';
import {
  ScenarioRuntime,
  createIdleScenarioRuntimeState,
  type ScenarioRuntimeHost,
  type ScenarioRuntimeState,
  type ScenarioStopReason,
} from '../runtime/index.js';

export interface DeviceBoardGraphContextValue {
  readonly deviceKind: DeviceKind;
  readonly signalNodes: Node[];
  readonly signalEdges: Edge[];
  readonly scenarioBranch: ScenarioBranchTab;
  readonly scenarioInitialNodes: Node[];
  readonly scenarioInitialEdges: Edge[];
  readonly scenarioMainNodes: Node[];
  readonly scenarioMainEdges: Edge[];
  readonly scenarioAlarmNodes: Node[];
  readonly scenarioAlarmEdges: Edge[];
  readonly scenarioOnStopNodes: Node[];
  readonly scenarioOnStopEdges: Edge[];
  readonly scenarioOnDisconnectNodes: Node[];
  readonly scenarioOnDisconnectEdges: Edge[];
  readonly scenarioFunctionNodes: Node[];
  readonly scenarioFunctionEdges: Edge[];
  readonly validationIssues: readonly PreRunValidationIssue[];
  readonly canRun: boolean;
  readonly runtimeState: ScenarioRuntimeState;
  readonly onSignalNodesChange: (changes: NodeChange[]) => void;
  readonly onSignalEdgesChange: (changes: EdgeChange[]) => void;
  readonly onScenarioInitialNodesChange: (changes: NodeChange[]) => void;
  readonly onScenarioInitialEdgesChange: (changes: EdgeChange[]) => void;
  readonly onScenarioMainNodesChange: (changes: NodeChange[]) => void;
  readonly onScenarioMainEdgesChange: (changes: EdgeChange[]) => void;
  readonly onScenarioAlarmNodesChange: (changes: NodeChange[]) => void;
  readonly onScenarioAlarmEdgesChange: (changes: EdgeChange[]) => void;
  readonly onScenarioOnStopNodesChange: (changes: NodeChange[]) => void;
  readonly onScenarioOnStopEdgesChange: (changes: EdgeChange[]) => void;
  readonly onScenarioOnDisconnectNodesChange: (changes: NodeChange[]) => void;
  readonly onScenarioOnDisconnectEdgesChange: (changes: EdgeChange[]) => void;
  readonly onScenarioFunctionNodesChange: (changes: NodeChange[]) => void;
  readonly onScenarioFunctionEdgesChange: (changes: EdgeChange[]) => void;
  readonly onSignalConnect: (connection: Connection) => void;
  readonly onScenarioInitialConnect: (connection: Connection) => void;
  readonly onScenarioMainConnect: (connection: Connection) => void;
  readonly onScenarioAlarmConnect: (connection: Connection) => void;
  readonly onScenarioOnStopConnect: (connection: Connection) => void;
  readonly onScenarioOnDisconnectConnect: (connection: Connection) => void;
  readonly onScenarioFunctionConnect: (connection: Connection) => void;
  readonly isValidConnection: (layer: BoardLayerTab, connection: Connection) => boolean;
  readonly setScenarioBranch: (branch: ScenarioBranchTab) => void;
  readonly refreshValidation: () => readonly PreRunValidationIssue[];
  readonly exportJson: () => Promise<void>;
  readonly importJsonFile: (file: File) => Promise<string | null>;
  readonly syncStatus: 'idle' | 'loading' | 'saving' | 'saved' | 'error';
  readonly syncError: string | null;
  readonly startScenario: () => Promise<void>;
  readonly stopScenario: (reason?: ScenarioStopReason) => void;
  /** Ручной режim normal/alarm (MP7b RT3/RT6). Делегируется в ScenarioRuntime. */
  readonly mode: RuntimeMode;
  readonly setMode: (mode: RuntimeMode) => void;
  /** Полная очистка борда: все ветки сценария и сигнал (MP7b RT6). */
  readonly clearBoard: () => void;
  /** Добавить ноду из палитры в активную ветку сценария (MP7b RT6). */
  readonly addScenarioNodeToCurrentBranch: (blockKind: ScenarioBlockKind) => void;
}

const DeviceBoardGraphContext = createContext<DeviceBoardGraphContextValue | null>(null);

export interface DeviceBoardGraphProviderProps {
  readonly children: React.ReactNode;
  readonly deviceKind?: DeviceKind;
  readonly runtimeHost?: ScenarioRuntimeHost;
  readonly persistAdapter?: DeviceBoardPersistAdapter;
  readonly initialHydratedState?: HydratedBoardState;
}

export const DeviceBoardGraphProvider: React.FC<DeviceBoardGraphProviderProps> = ({
  children,
  deviceKind: deviceKindProp = 'microphone',
  runtimeHost,
  persistAdapter,
  initialHydratedState,
}) => {
  const defaultState = useMemo(
    () => initialHydratedState ?? createDefaultHydratedBoardState(deviceKindProp),
    [deviceKindProp, initialHydratedState],
  );

  const [deviceKind, setDeviceKind] = useState<DeviceKind>(defaultState.deviceKind);
  const [signalNodes, setSignalNodes] = useState<Node[]>(defaultState.signalNodes);
  const [signalEdges, setSignalEdges] = useState<Edge[]>(defaultState.signalEdges);
  const [scenarioBranch, setScenarioBranch] = useState<ScenarioBranchTab>('initial');
  const [scenarioInitialNodes, setScenarioInitialNodes] = useState<Node[]>(defaultState.scenarioInitialNodes);
  const [scenarioInitialEdges, setScenarioInitialEdges] = useState<Edge[]>(defaultState.scenarioInitialEdges);
  const [scenarioMainNodes, setScenarioMainNodes] = useState<Node[]>(defaultState.scenarioMainNodes);
  const [scenarioMainEdges, setScenarioMainEdges] = useState<Edge[]>(defaultState.scenarioMainEdges);
  const [scenarioAlarmNodes, setScenarioAlarmNodes] = useState<Node[]>(defaultState.scenarioAlarmNodes);
  const [scenarioAlarmEdges, setScenarioAlarmEdges] = useState<Edge[]>(defaultState.scenarioAlarmEdges);
  const [scenarioOnStopNodes, setScenarioOnStopNodes] = useState<Node[]>(defaultState.scenarioOnStopNodes);
  const [scenarioOnStopEdges, setScenarioOnStopEdges] = useState<Edge[]>(defaultState.scenarioOnStopEdges);
  const [scenarioOnDisconnectNodes, setScenarioOnDisconnectNodes] = useState<Node[]>(
    defaultState.scenarioOnDisconnectNodes,
  );
  const [scenarioOnDisconnectEdges, setScenarioOnDisconnectEdges] = useState<Edge[]>(
    defaultState.scenarioOnDisconnectEdges,
  );
  const [scenarioFunctionNodes, setScenarioFunctionNodes] = useState<Node[]>(defaultState.scenarioFunctionNodes);
  const [scenarioFunctionEdges, setScenarioFunctionEdges] = useState<Edge[]>(defaultState.scenarioFunctionEdges);
  const [scenarioFunctionMeta, setScenarioFunctionMeta] = useState(defaultState.scenarioFunctionMeta);
  const [validationIssues, setValidationIssues] = useState<readonly PreRunValidationIssue[]>([]);
  const [runtimeState, setRuntimeState] = useState<ScenarioRuntimeState>(createIdleScenarioRuntimeState());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  const runtimeRef = useRef<ScenarioRuntime | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipPersistRef = useRef(false);

  useEffect(() => {
    if (runtimeHost === undefined) {
      runtimeRef.current = null;
      setRuntimeState(createIdleScenarioRuntimeState());
      return;
    }
    const runtime = new ScenarioRuntime(runtimeHost);
    runtimeRef.current = runtime;
    const unsubscribe = runtime.subscribe(setRuntimeState);
    return () => {
      unsubscribe();
      runtime.stop('system');
      runtimeRef.current = null;
    };
  }, [runtimeHost]);

  useEffect(() => {
    if (runtimeHost?.watchConnection === undefined) {
      return;
    }
    return runtimeHost.watchConnection({
      onDisconnect: () => runtimeRef.current?.handleDisconnect(),
      onReconnect: () => {
        void runtimeRef.current?.handleReconnect();
      },
    });
  }, [runtimeHost]);

  useEffect(() => {
    const handleBeforeUnload = (): void => {
      const runtime = runtimeRef.current;
      if (runtime !== null && runtime.getState().isRunning) {
        runtime.stop('system');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const applyHydratedState = useCallback((state: HydratedBoardState) => {
    skipPersistRef.current = true;
    setDeviceKind(state.deviceKind);
    setSignalNodes(state.signalNodes);
    setSignalEdges(state.signalEdges);
    setScenarioInitialNodes(state.scenarioInitialNodes);
    setScenarioInitialEdges(state.scenarioInitialEdges);
    setScenarioMainNodes(state.scenarioMainNodes);
    setScenarioMainEdges(state.scenarioMainEdges);
    setScenarioAlarmNodes(state.scenarioAlarmNodes);
    setScenarioAlarmEdges(state.scenarioAlarmEdges);
    setScenarioOnStopNodes(state.scenarioOnStopNodes);
    setScenarioOnStopEdges(state.scenarioOnStopEdges);
    setScenarioOnDisconnectNodes(state.scenarioOnDisconnectNodes);
    setScenarioOnDisconnectEdges(state.scenarioOnDisconnectEdges);
    setScenarioFunctionNodes(state.scenarioFunctionNodes);
    setScenarioFunctionEdges(state.scenarioFunctionEdges);
    setScenarioFunctionMeta(state.scenarioFunctionMeta);
    window.setTimeout(() => {
      skipPersistRef.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    if (persistAdapter === undefined) {
      return;
    }
    let cancelled = false;
    setSyncStatus('loading');
    setSyncError(null);
    void persistAdapter
      .load()
      .then((record) => {
        if (cancelled) return;
        if (record !== null) {
          applyHydratedState(hydrateBoardFromDocument(record.document));
        }
        setSyncStatus('idle');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSyncStatus('error');
        setSyncError(error instanceof Error ? error.message : 'Не удалось загрузить сценарий');
      });
    return () => {
      cancelled = true;
    };
  }, [applyHydratedState, persistAdapter]);

  const buildDocument = useCallback(() => {
    return buildDeviceScenarioDocument({
      deviceKind,
      title: 'Device board export',
      signalNodes,
      signalEdges,
      scenarioInitialNodes,
      scenarioInitialEdges,
      scenarioMainNodes,
      scenarioMainEdges,
      scenarioAlarmNodes,
      scenarioAlarmEdges,
      scenarioOnStopNodes,
      scenarioOnStopEdges,
      scenarioOnDisconnectNodes,
      scenarioOnDisconnectEdges,
      scenarioFunctions: [hydratedFunctionInput({
        deviceKind,
        signalNodes,
        signalEdges,
        scenarioInitialNodes,
        scenarioInitialEdges,
        scenarioMainNodes,
        scenarioMainEdges,
        scenarioAlarmNodes,
        scenarioAlarmEdges,
        scenarioOnStopNodes,
        scenarioOnStopEdges,
        scenarioOnDisconnectNodes,
        scenarioOnDisconnectEdges,
        scenarioFunctionNodes,
        scenarioFunctionEdges,
        scenarioFunctionMeta,
      })],
    });
  }, [
    deviceKind,
    scenarioAlarmEdges,
    scenarioAlarmNodes,
    scenarioFunctionEdges,
    scenarioFunctionMeta,
    scenarioFunctionNodes,
    scenarioInitialEdges,
    scenarioInitialNodes,
    scenarioMainEdges,
    scenarioMainNodes,
    scenarioOnDisconnectEdges,
    scenarioOnDisconnectNodes,
    scenarioOnStopEdges,
    scenarioOnStopNodes,
    signalEdges,
    signalNodes,
  ]);

  const runValidation = useCallback(() => {
    const issues = validatePreRun({
      deviceKind,
      signalNodes,
      signalEdges,
      scenarioInitialNodes,
      scenarioInitialEdges,
      scenarioMainNodes,
      scenarioMainEdges,
      scenarioAlarmNodes,
      scenarioAlarmEdges,
      scenarioOnStopNodes,
      scenarioOnStopEdges,
      scenarioOnDisconnectNodes,
      scenarioOnDisconnectEdges,
      scenarioFunctions: [hydratedFunctionInput({
        deviceKind,
        signalNodes,
        signalEdges,
        scenarioInitialNodes,
        scenarioInitialEdges,
        scenarioMainNodes,
        scenarioMainEdges,
        scenarioAlarmNodes,
        scenarioAlarmEdges,
        scenarioOnStopNodes,
        scenarioOnStopEdges,
        scenarioOnDisconnectNodes,
        scenarioOnDisconnectEdges,
        scenarioFunctionNodes,
        scenarioFunctionEdges,
        scenarioFunctionMeta,
      })],
    });
    setValidationIssues(issues);
    return issues;
  }, [
    deviceKind,
    scenarioAlarmEdges,
    scenarioAlarmNodes,
    scenarioFunctionEdges,
    scenarioFunctionMeta,
    scenarioFunctionNodes,
    scenarioInitialEdges,
    scenarioInitialNodes,
    scenarioMainEdges,
    scenarioMainNodes,
    scenarioOnDisconnectEdges,
    scenarioOnDisconnectNodes,
    scenarioOnStopEdges,
    scenarioOnStopNodes,
    signalEdges,
    signalNodes,
  ]);

  const refreshValidation = useCallback((): readonly PreRunValidationIssue[] => {
    return runValidation();
  }, [runValidation]);

  const onSignalNodesChange = useCallback((changes: NodeChange[]) => {
    setSignalNodes((nodes) => applyNodeChanges(changes, nodes));
  }, []);

  const onSignalEdgesChange = useCallback((changes: EdgeChange[]) => {
    setSignalEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioInitialNodesChange = useCallback((changes: NodeChange[]) => {
    setScenarioInitialNodes((nodes) => applyNodeChanges(changes, nodes));
  }, []);

  const onScenarioInitialEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioInitialEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioMainNodesChange = useCallback((changes: NodeChange[]) => {
    setScenarioMainNodes((nodes) => applyNodeChanges(changes, nodes));
  }, []);

  const onScenarioMainEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioMainEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioAlarmNodesChange = useCallback((changes: NodeChange[]) => {
    setScenarioAlarmNodes((nodes) => applyNodeChanges(changes, nodes));
  }, []);

  const onScenarioAlarmEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioAlarmEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioOnStopNodesChange = useCallback((changes: NodeChange[]) => {
    setScenarioOnStopNodes((nodes) => applyNodeChanges(changes, nodes));
  }, []);

  const onScenarioOnStopEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioOnStopEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioOnDisconnectNodesChange = useCallback((changes: NodeChange[]) => {
    setScenarioOnDisconnectNodes((nodes) => applyNodeChanges(changes, nodes));
  }, []);

  const onScenarioOnDisconnectEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioOnDisconnectEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioFunctionNodesChange = useCallback((changes: NodeChange[]) => {
    setScenarioFunctionNodes((nodes) => applyNodeChanges(changes, nodes));
  }, []);

  const onScenarioFunctionEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioFunctionEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onSignalConnect = useCallback((connection: Connection) => {
    setSignalEdges((edges) => addEdge(connection, edges));
  }, []);

  const onScenarioInitialConnect = useCallback((connection: Connection) => {
    setScenarioInitialEdges((edges) => addEdge({ ...connection, animated: true }, edges));
  }, []);

  const onScenarioMainConnect = useCallback((connection: Connection) => {
    setScenarioMainEdges((edges) => addEdge({ ...connection, animated: true }, edges));
  }, []);

  const onScenarioAlarmConnect = useCallback((connection: Connection) => {
    setScenarioAlarmEdges((edges) => addEdge({ ...connection, animated: true }, edges));
  }, []);

  const onScenarioOnStopConnect = useCallback((connection: Connection) => {
    setScenarioOnStopEdges((edges) => addEdge({ ...connection, animated: true }, edges));
  }, []);

  const onScenarioOnDisconnectConnect = useCallback((connection: Connection) => {
    setScenarioOnDisconnectEdges((edges) => addEdge({ ...connection, animated: true }, edges));
  }, []);

  const onScenarioFunctionConnect = useCallback((connection: Connection) => {
    setScenarioFunctionEdges((edges) => addEdge({ ...connection, animated: true }, edges));
  }, []);

  const isValidConnectionForLayer = useCallback(
    (layer: BoardLayerTab, connection: Connection) => {
      if (layer === 'signal') {
        return isValidBoardConnection(connection, signalNodes, layer);
      }
      const nodes =
        scenarioBranch === 'initial'
          ? scenarioInitialNodes
          : scenarioBranch === 'main'
            ? scenarioMainNodes
            : scenarioBranch === 'alarm'
              ? scenarioAlarmNodes
              : scenarioBranch === 'onStop'
                ? scenarioOnStopNodes
                : scenarioBranch === 'onDisconnect'
                  ? scenarioOnDisconnectNodes
                  : scenarioFunctionNodes;
      return isValidBoardConnection(connection, nodes, layer);
    },
    [
      scenarioAlarmNodes,
      scenarioBranch,
      scenarioInitialNodes,
      scenarioMainNodes,
      scenarioOnStopNodes,
      scenarioOnDisconnectNodes,
      scenarioFunctionNodes,
      signalNodes,
    ],
  );

  const exportJson = useCallback(async () => {
    const exported = await exportDeviceScenarioDocument(buildDocument());
    const blob = new Blob([exported.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `device-scenario-${deviceKind}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    runValidation();
    if (persistAdapter !== undefined) {
      setSyncStatus('saving');
      setSyncError(null);
      try {
        await persistAdapter.save(exported.document);
        setSyncStatus('saved');
      } catch (error: unknown) {
        setSyncStatus('error');
        setSyncError(error instanceof Error ? error.message : 'Не удалось сохранить сценарий');
      }
    }
  }, [buildDocument, deviceKind, persistAdapter, runValidation]);

  const importJsonFile = useCallback(
    async (file: File): Promise<string | null> => {
      const text = await file.text();
      const result = importDeviceScenarioFromJson(text);
      if (!result.ok) {
        return result.message;
      }
      applyHydratedState(result.state);
      runValidation();
      if (persistAdapter !== undefined) {
        setSyncStatus('saving');
        setSyncError(null);
        try {
          await persistAdapter.save(result.document);
          setSyncStatus('saved');
        } catch (error: unknown) {
          setSyncStatus('error');
          setSyncError(error instanceof Error ? error.message : 'Не удалось сохранить сценарий');
        }
      }
      return null;
    },
    [applyHydratedState, persistAdapter, runValidation],
  );

  useEffect(() => {
    if (persistAdapter === undefined || skipPersistRef.current) {
      return;
    }
    if (persistTimerRef.current !== null) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      setSyncStatus('saving');
      setSyncError(null);
      void persistAdapter
        .save(buildDocument())
        .then(() => {
          setSyncStatus('saved');
        })
        .catch((error: unknown) => {
          setSyncStatus('error');
          setSyncError(error instanceof Error ? error.message : 'Не удалось сохранить сценарий');
        });
    }, 1500);

    return () => {
      if (persistTimerRef.current !== null) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, [
    buildDocument,
    persistAdapter,
    scenarioAlarmEdges,
    scenarioAlarmNodes,
    scenarioFunctionEdges,
    scenarioFunctionMeta,
    scenarioFunctionNodes,
    scenarioInitialEdges,
    scenarioInitialNodes,
    scenarioMainEdges,
    scenarioMainNodes,
    scenarioOnDisconnectEdges,
    scenarioOnDisconnectNodes,
    scenarioOnStopEdges,
    scenarioOnStopNodes,
    signalEdges,
    signalNodes,
  ]);

  const startScenario = useCallback(async () => {
    const issues = runValidation();
    if (!isPreRunValid(issues)) {
      return;
    }
    const runtime = runtimeRef.current;
    if (runtime === null) {
      return;
    }
    runtime.load(buildDocument());
    await runtime.start();
  }, [buildDocument, runValidation]);

  const stopScenario = useCallback((reason: ScenarioStopReason = 'user') => {
    runtimeRef.current?.stop(reason);
  }, []);

  const setMode = useCallback((mode: RuntimeMode) => {
    runtimeRef.current?.setMode(mode);
  }, []);

  const clearBoard = useCallback(() => {
    setSignalNodes([]);
    setSignalEdges([]);
    setScenarioInitialNodes([]);
    setScenarioInitialEdges([]);
    setScenarioMainNodes([]);
    setScenarioMainEdges([]);
    setScenarioAlarmNodes([]);
    setScenarioAlarmEdges([]);
    setScenarioOnStopNodes([]);
    setScenarioOnStopEdges([]);
    setScenarioOnDisconnectNodes([]);
    setScenarioOnDisconnectEdges([]);
    setScenarioFunctionNodes([]);
    setScenarioFunctionEdges([]);
  }, []);

  const addScenarioNodeToCurrentBranch = useCallback(
    (blockKind: ScenarioBlockKind) => {
      const node = createScenarioBoardNode(blockKind);
      switch (scenarioBranch) {
        case 'initial':
          setScenarioInitialNodes((nodes) => [...nodes, node]);
          break;
        case 'main':
          setScenarioMainNodes((nodes) => [...nodes, node]);
          break;
        case 'alarm':
          setScenarioAlarmNodes((nodes) => [...nodes, node]);
          break;
        case 'onStop':
          setScenarioOnStopNodes((nodes) => [...nodes, node]);
          break;
        case 'onDisconnect':
          setScenarioOnDisconnectNodes((nodes) => [...nodes, node]);
          break;
        case 'function':
          setScenarioFunctionNodes((nodes) => [...nodes, node]);
          break;
        default:
          break;
      }
    },
    [scenarioBranch],
  );

  const canRun = useMemo(
    () => isPreRunValid(validationIssues) && runtimeHost !== undefined && !runtimeState.isRunning,
    [runtimeHost, runtimeState.isRunning, validationIssues],
  );

  const value = useMemo<DeviceBoardGraphContextValue>(
    () => ({
      deviceKind,
      signalNodes,
      signalEdges,
      scenarioBranch,
      scenarioInitialNodes,
      scenarioInitialEdges,
      scenarioMainNodes,
      scenarioMainEdges,
      scenarioAlarmNodes,
      scenarioAlarmEdges,
      scenarioOnStopNodes,
      scenarioOnStopEdges,
      scenarioOnDisconnectNodes,
      scenarioOnDisconnectEdges,
      scenarioFunctionNodes,
      scenarioFunctionEdges,
      validationIssues,
      canRun,
      runtimeState,
      onSignalNodesChange,
      onSignalEdgesChange,
      onScenarioInitialNodesChange,
      onScenarioInitialEdgesChange,
      onScenarioMainNodesChange,
      onScenarioMainEdgesChange,
      onScenarioAlarmNodesChange,
      onScenarioAlarmEdgesChange,
      onScenarioOnStopNodesChange,
      onScenarioOnStopEdgesChange,
      onScenarioOnDisconnectNodesChange,
      onScenarioOnDisconnectEdgesChange,
      onScenarioFunctionNodesChange,
      onScenarioFunctionEdgesChange,
      onSignalConnect,
      onScenarioInitialConnect,
      onScenarioMainConnect,
      onScenarioAlarmConnect,
      onScenarioOnStopConnect,
      onScenarioOnDisconnectConnect,
      onScenarioFunctionConnect,
      isValidConnection: isValidConnectionForLayer,
      setScenarioBranch,
      refreshValidation,
      exportJson,
      importJsonFile,
      syncStatus,
      syncError,
      startScenario,
      stopScenario,
      mode: runtimeState.mode,
      setMode,
      clearBoard,
      addScenarioNodeToCurrentBranch,
    }),
    [
      addScenarioNodeToCurrentBranch,
      canRun,
      clearBoard,
      deviceKind,
      exportJson,
      importJsonFile,
      isValidConnectionForLayer,
      onScenarioAlarmConnect,
      onScenarioAlarmEdgesChange,
      onScenarioAlarmNodesChange,
      onScenarioInitialConnect,
      onScenarioInitialEdgesChange,
      onScenarioInitialNodesChange,
      onScenarioMainConnect,
      onScenarioMainEdgesChange,
      onScenarioMainNodesChange,
      onScenarioOnStopConnect,
      onScenarioOnStopEdgesChange,
      onScenarioOnStopNodesChange,
      onScenarioOnDisconnectConnect,
      onScenarioOnDisconnectEdgesChange,
      onScenarioOnDisconnectNodesChange,
      onScenarioFunctionConnect,
      onScenarioFunctionEdgesChange,
      onScenarioFunctionNodesChange,
      onSignalConnect,
      onSignalEdgesChange,
      onSignalNodesChange,
      refreshValidation,
      runtimeState,
      scenarioAlarmEdges,
      scenarioAlarmNodes,
      scenarioBranch,
      scenarioInitialEdges,
      scenarioInitialNodes,
      scenarioMainEdges,
      scenarioMainNodes,
      scenarioOnStopEdges,
      scenarioOnStopNodes,
      scenarioOnDisconnectEdges,
      scenarioOnDisconnectNodes,
      scenarioFunctionEdges,
      scenarioFunctionNodes,
      setMode,
      signalEdges,
      signalNodes,
      startScenario,
      stopScenario,
      syncError,
      syncStatus,
      validationIssues,
    ],
  );

  return (
    <DeviceBoardGraphContext.Provider value={value}>{children}</DeviceBoardGraphContext.Provider>
  );
};

export function useDeviceBoardGraph(): DeviceBoardGraphContextValue {
  const context = useContext(DeviceBoardGraphContext);
  if (context === null) {
    throw new Error('useDeviceBoardGraph must be used within DeviceBoardGraphProvider');
  }
  return context;
}
