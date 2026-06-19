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
import {
  createScenarioVariable,
  type DeviceKind,
  type DeviceScenarioDocument,
  type RuntimeMode,
  type ScenarioBlockKind,
  type ScenarioVariable,
  type ScenarioVariableType,
} from '@membrana/core';

import type { BoardLayerTab, ScenarioBranchTab } from '../types/board-ui.js';
import {
  buildDeviceScenarioDocument,
  createDefaultHydratedBoardState,
  createPaletteBoardNode,
  createScenarioBoardNode,
  createVariableBoardNode,
  exportDeviceScenarioDocument,
  hydrateBoardFromDocument,
  hydratedFunctionInput,
  importDeviceScenarioFromJson,
  isPreRunValid,
  isValidBoardConnection,
  rejectSystemNodeRemovals,
  clearBranchState,
  shouldPreserveLockedNodes,
  resolveRunDisabledReason,
  scenarioDocumentFingerprint,
  syncVariableNodeLabels,
  validatePreRun,
  type VariableNodeKind,
  type V04PaletteNodeKind,
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
  readonly scenarioOnConnectNodes: Node[];
  readonly scenarioOnConnectEdges: Edge[];
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
  readonly runDisabledReason: string | null;
  readonly runtimeState: ScenarioRuntimeState;
  readonly onSignalNodesChange: (changes: NodeChange[]) => void;
  readonly onSignalEdgesChange: (changes: EdgeChange[]) => void;
  readonly onScenarioInitialNodesChange: (changes: NodeChange[]) => void;
  readonly onScenarioInitialEdgesChange: (changes: EdgeChange[]) => void;
  readonly onScenarioOnConnectNodesChange: (changes: NodeChange[]) => void;
  readonly onScenarioOnConnectEdgesChange: (changes: EdgeChange[]) => void;
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
  readonly onScenarioOnConnectConnect: (connection: Connection) => void;
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
  readonly syncStatus: 'idle' | 'loading' | 'saving' | 'error';
  readonly syncError: string | null;
  /** Черновик отличается от последнего сохранённого снимка. */
  readonly isDirty: boolean;
  /** Сохранить сценарий на сервер / в persist-адаптер (только по явному клику). */
  readonly saveScenario: () => Promise<boolean>;
  readonly startScenario: () => Promise<void>;
  readonly stopScenario: (reason?: ScenarioStopReason) => void;
  /** Ручной режim normal/alarm (MP7b RT3/RT6). Делегируется в ScenarioRuntime. */
  readonly mode: RuntimeMode;
  readonly setMode: (mode: RuntimeMode) => void;
  /** Очистка узлов текущей ветки (Signal или активная Scenario-ветка); Event-entry сохраняется. */
  readonly clearCurrentBranch: (layer: BoardLayerTab) => void;
  /** Добавить legacy D0-ноду из палитры в активную ветку (только при legacy-флаге). */
  readonly addScenarioNodeToCurrentBranch: (blockKind: ScenarioBlockKind) => void;
  /** v0.4 DBR5: добавить узел палитры Print/isValid/GetMicrophone в активную ветку. */
  readonly addPaletteNodeToCurrentBranch: (nodeKind: V04PaletteNodeKind) => void;
  /** v0.4 DBR5: обновить выбранный микрофон на узле get-microphone. */
  readonly updatePaletteNodeMicrophoneId: (nodeId: string, microphoneId: string) => void;
  /** v0.4: переменные сценария (document-scope) для конструктора переменных. */
  readonly variables: readonly ScenarioVariable[];
  /** v0.4: объявить новую переменную ссылочного типа. */
  readonly addVariable: (type: ScenarioVariableType) => void;
  /** v0.4: переименовать переменную. */
  readonly renameVariable: (id: string, name: string) => void;
  /** v0.4: удалить переменную и её узлы get/set со всех веток. */
  readonly removeVariable: (id: string) => void;
  /** v0.4: добавить узел get/set переменной в активную ветку. */
  readonly addVariableNodeToCurrentBranch: (kind: VariableNodeKind, variableId: string) => void;
  /** v0.4: привязать variable-get/set к переменной по имени (создаёт при отсутствии). */
  readonly assignNodeVariableName: (nodeId: string, variableName: string) => void;
}

const DeviceBoardGraphContext = createContext<DeviceBoardGraphContextValue | null>(null);

export interface DeviceBoardGraphProviderProps {
  readonly children: React.ReactNode;
  readonly deviceKind?: DeviceKind;
  readonly runtimeHost?: ScenarioRuntimeHost;
  readonly persistAdapter?: DeviceBoardPersistAdapter;
  readonly initialHydratedState?: HydratedBoardState;
  /** Online-presence выбранного устройства; `undefined` — не проверять (автономный клиент). */
  readonly deviceLive?: boolean;
}

export const DeviceBoardGraphProvider: React.FC<DeviceBoardGraphProviderProps> = ({
  children,
  deviceKind: deviceKindProp = 'microphone',
  runtimeHost,
  persistAdapter,
  initialHydratedState,
  deviceLive,
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
  const [scenarioOnConnectNodes, setScenarioOnConnectNodes] = useState<Node[]>(
    defaultState.scenarioOnConnectNodes,
  );
  const [scenarioOnConnectEdges, setScenarioOnConnectEdges] = useState<Edge[]>(
    defaultState.scenarioOnConnectEdges,
  );
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
  const [variables, setVariables] = useState<readonly ScenarioVariable[]>(defaultState.variables);
  const [validationIssues, setValidationIssues] = useState<readonly PreRunValidationIssue[]>([]);
  const [runtimeState, setRuntimeState] = useState<ScenarioRuntimeState>(createIdleScenarioRuntimeState());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const runtimeRef = useRef<ScenarioRuntime | null>(null);
  const savedSnapshotRef = useRef<string | null>(null);
  const skipDirtyRef = useRef(false);
  /** После hydrate/load: baseline снимается из buildDocument() на следующем commit state. */
  const pendingBaselineRef = useRef(false);

  const markSavedSnapshot = useCallback((document: DeviceScenarioDocument) => {
    savedSnapshotRef.current = scenarioDocumentFingerprint(document);
    setIsDirty(false);
  }, []);

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
    skipDirtyRef.current = true;
    setDeviceKind(state.deviceKind);
    setSignalNodes(state.signalNodes);
    setSignalEdges(state.signalEdges);
    setScenarioInitialNodes(state.scenarioInitialNodes);
    setScenarioInitialEdges(state.scenarioInitialEdges);
    setScenarioOnConnectNodes(state.scenarioOnConnectNodes);
    setScenarioOnConnectEdges(state.scenarioOnConnectEdges);
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
    setVariables(state.variables);
    window.setTimeout(() => {
      skipDirtyRef.current = false;
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
          pendingBaselineRef.current = true;
        } else {
          pendingBaselineRef.current = true;
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
  }, [applyHydratedState, defaultState, deviceKindProp, markSavedSnapshot, persistAdapter]);

  const buildDocument = useCallback(() => {
    return buildDeviceScenarioDocument({
      deviceKind,
      title: 'Device board export',
      signalNodes,
      signalEdges,
      scenarioInitialNodes,
      scenarioInitialEdges,
      scenarioOnConnectNodes,
      scenarioOnConnectEdges,
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
        scenarioOnConnectNodes,
        scenarioOnConnectEdges,
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
        variables,
      })],
      variables,
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
    scenarioOnConnectEdges,
    scenarioOnConnectNodes,
    scenarioMainEdges,
    scenarioMainNodes,
    scenarioOnDisconnectEdges,
    scenarioOnDisconnectNodes,
    scenarioOnStopEdges,
    scenarioOnStopNodes,
    signalEdges,
    signalNodes,
    variables,
  ]);

  const runValidation = useCallback(() => {
    const issues = validatePreRun({
      deviceKind,
      signalNodes,
      signalEdges,
      scenarioInitialNodes,
      scenarioInitialEdges,
      scenarioOnConnectNodes,
      scenarioOnConnectEdges,
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
        scenarioOnConnectNodes,
        scenarioOnConnectEdges,
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
        variables,
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
    scenarioOnConnectEdges,
    scenarioOnConnectNodes,
    scenarioMainEdges,
    scenarioMainNodes,
    scenarioOnDisconnectEdges,
    scenarioOnDisconnectNodes,
    scenarioOnStopEdges,
    scenarioOnStopNodes,
    signalEdges,
    signalNodes,
    variables,
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
    setScenarioInitialNodes((nodes) => applyNodeChanges(rejectSystemNodeRemovals(changes, nodes), nodes));
  }, []);

  const onScenarioInitialEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioInitialEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioOnConnectNodesChange = useCallback((changes: NodeChange[]) => {
    setScenarioOnConnectNodes((nodes) => applyNodeChanges(rejectSystemNodeRemovals(changes, nodes), nodes));
  }, []);

  const onScenarioOnConnectEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioOnConnectEdges((edges) => applyEdgeChanges(changes, edges));
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
    setScenarioOnStopNodes((nodes) => applyNodeChanges(rejectSystemNodeRemovals(changes, nodes), nodes));
  }, []);

  const onScenarioOnStopEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioOnStopEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioOnDisconnectNodesChange = useCallback((changes: NodeChange[]) => {
    setScenarioOnDisconnectNodes((nodes) => applyNodeChanges(rejectSystemNodeRemovals(changes, nodes), nodes));
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
    setScenarioInitialEdges((edges) => addEdge(connection, edges));
  }, []);

  const onScenarioOnConnectConnect = useCallback((connection: Connection) => {
    setScenarioOnConnectEdges((edges) => addEdge(connection, edges));
  }, []);

  const onScenarioMainConnect = useCallback((connection: Connection) => {
    setScenarioMainEdges((edges) => addEdge(connection, edges));
  }, []);

  const onScenarioAlarmConnect = useCallback((connection: Connection) => {
    setScenarioAlarmEdges((edges) => addEdge(connection, edges));
  }, []);

  const onScenarioOnStopConnect = useCallback((connection: Connection) => {
    setScenarioOnStopEdges((edges) => addEdge(connection, edges));
  }, []);

  const onScenarioOnDisconnectConnect = useCallback((connection: Connection) => {
    setScenarioOnDisconnectEdges((edges) => addEdge(connection, edges));
  }, []);

  const onScenarioFunctionConnect = useCallback((connection: Connection) => {
    setScenarioFunctionEdges((edges) => addEdge(connection, edges));
  }, []);

  const isValidConnectionForLayer = useCallback(
    (layer: BoardLayerTab, connection: Connection) => {
      if (layer === 'signal') {
        return isValidBoardConnection(connection, signalNodes, layer);
      }
      const nodes =
        scenarioBranch === 'initial'
          ? scenarioInitialNodes
          : scenarioBranch === 'onConnect'
            ? scenarioOnConnectNodes
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
      scenarioOnConnectNodes,
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
  }, [buildDocument, deviceKind, runValidation]);

  const importJsonFile = useCallback(
    async (file: File): Promise<string | null> => {
      const text = await file.text();
      const result = importDeviceScenarioFromJson(text);
      if (!result.ok) {
        return result.message;
      }
      applyHydratedState(result.state);
      pendingBaselineRef.current = true;
      runValidation();
      return null;
    },
    [applyHydratedState, runValidation],
  );

  const saveScenario = useCallback(async (): Promise<boolean> => {
    if (persistAdapter === undefined) {
      return false;
    }
    setSyncStatus('saving');
    setSyncError(null);
    const document = buildDocument();
    try {
      await persistAdapter.save(document);
      markSavedSnapshot(document);
      setSyncStatus('idle');
      return true;
    } catch (error: unknown) {
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Не удалось сохранить сценарий');
      return false;
    }
  }, [buildDocument, markSavedSnapshot, persistAdapter]);

  useEffect(() => {
    if (persistAdapter !== undefined) {
      return;
    }
    if (savedSnapshotRef.current === null) {
      markSavedSnapshot(buildDocument());
    }
  }, [buildDocument, markSavedSnapshot, persistAdapter]);

  useEffect(() => {
    if (skipDirtyRef.current || syncStatus === 'loading') {
      return;
    }
    if (pendingBaselineRef.current) {
      pendingBaselineRef.current = false;
      markSavedSnapshot(buildDocument());
      return;
    }
    if (savedSnapshotRef.current === null) {
      return;
    }
    const dirty = scenarioDocumentFingerprint(buildDocument()) !== savedSnapshotRef.current;
    setIsDirty(dirty);
  }, [
    buildDocument,
    markSavedSnapshot,
    syncStatus,
    scenarioAlarmEdges,
    scenarioAlarmNodes,
    scenarioFunctionEdges,
    scenarioFunctionMeta,
    scenarioFunctionNodes,
    scenarioInitialEdges,
    scenarioInitialNodes,
    scenarioOnConnectEdges,
    scenarioOnConnectNodes,
    scenarioMainEdges,
    scenarioMainNodes,
    scenarioOnDisconnectEdges,
    scenarioOnDisconnectNodes,
    scenarioOnStopEdges,
    scenarioOnStopNodes,
    signalEdges,
    signalNodes,
    variables,
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

  const clearCurrentBranch = useCallback(
    (layer: BoardLayerTab) => {
      if (layer === 'signal') {
        setSignalNodes([]);
        setSignalEdges([]);
        return;
      }

      const preserveLocked = shouldPreserveLockedNodes(layer, scenarioBranch);
      const apply = (nodes: Node[], edges: Edge[]) => clearBranchState(nodes, edges, preserveLocked);

      switch (scenarioBranch) {
        case 'initial': {
          const next = apply(scenarioInitialNodes, scenarioInitialEdges);
          setScenarioInitialNodes(next.nodes);
          setScenarioInitialEdges(next.edges);
          break;
        }
        case 'onConnect': {
          const next = apply(scenarioOnConnectNodes, scenarioOnConnectEdges);
          setScenarioOnConnectNodes(next.nodes);
          setScenarioOnConnectEdges(next.edges);
          break;
        }
        case 'main': {
          const next = apply(scenarioMainNodes, scenarioMainEdges);
          setScenarioMainNodes(next.nodes);
          setScenarioMainEdges(next.edges);
          break;
        }
        case 'alarm': {
          const next = apply(scenarioAlarmNodes, scenarioAlarmEdges);
          setScenarioAlarmNodes(next.nodes);
          setScenarioAlarmEdges(next.edges);
          break;
        }
        case 'onStop': {
          const next = apply(scenarioOnStopNodes, scenarioOnStopEdges);
          setScenarioOnStopNodes(next.nodes);
          setScenarioOnStopEdges(next.edges);
          break;
        }
        case 'onDisconnect': {
          const next = apply(scenarioOnDisconnectNodes, scenarioOnDisconnectEdges);
          setScenarioOnDisconnectNodes(next.nodes);
          setScenarioOnDisconnectEdges(next.edges);
          break;
        }
        case 'function': {
          const next = apply(scenarioFunctionNodes, scenarioFunctionEdges);
          setScenarioFunctionNodes(next.nodes);
          setScenarioFunctionEdges(next.edges);
          break;
        }
        default:
          break;
      }
    },
    [
      scenarioAlarmEdges,
      scenarioAlarmNodes,
      scenarioBranch,
      scenarioFunctionEdges,
      scenarioFunctionNodes,
      scenarioInitialEdges,
      scenarioInitialNodes,
      scenarioOnConnectEdges,
      scenarioOnConnectNodes,
      scenarioMainEdges,
      scenarioMainNodes,
      scenarioOnDisconnectEdges,
      scenarioOnDisconnectNodes,
      scenarioOnStopEdges,
      scenarioOnStopNodes,
    ],
  );

  const appendNodeToBranch = useCallback(
    (branch: ScenarioBranchTab, node: Node) => {
      switch (branch) {
        case 'initial':
          setScenarioInitialNodes((nodes) => [...nodes, node]);
          break;
        case 'onConnect':
          setScenarioOnConnectNodes((nodes) => [...nodes, node]);
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
    [],
  );

  const addVariable = useCallback((type: ScenarioVariableType) => {
    setVariables((current) => {
      const sameType = current.filter((variable) => variable.type === type).length;
      const prefix = type === 'DeviceRef' ? 'device' : 'microphone';
      const name = `${prefix}${sameType + 1}`;
      const id = `var-${type}-${Date.now().toString(36)}-${current.length + 1}`;
      return [...current, createScenarioVariable(id, name, type)];
    });
  }, []);

  const renameVariable = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (trimmed === '') {
      return;
    }
    setVariables((current) => {
      const target = current.find((variable) => variable.id === id);
      if (target === undefined || target.name === trimmed) {
        return current;
      }
      const nameTaken = current.some(
        (variable) =>
          variable.id !== id && variable.name === trimmed && variable.type === target.type,
      );
      if (nameTaken) {
        return current;
      }
      return current.map((variable) =>
        variable.id === id ? { ...variable, name: trimmed } : variable,
      );
    });
    const syncLabels = (nodes: Node[]) => syncVariableNodeLabels(nodes, id, trimmed);
    setScenarioInitialNodes(syncLabels);
    setScenarioOnConnectNodes(syncLabels);
    setScenarioMainNodes(syncLabels);
    setScenarioAlarmNodes(syncLabels);
    setScenarioOnStopNodes(syncLabels);
    setScenarioOnDisconnectNodes(syncLabels);
    setScenarioFunctionNodes(syncLabels);
  }, []);

  const dropVariableNodes = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Node[]>>, variableId: string) => {
      setter((nodes) => nodes.filter((node) => node.data?.variableId !== variableId));
    },
    [],
  );

  const removeVariable = useCallback(
    (id: string) => {
      setVariables((current) => current.filter((variable) => variable.id !== id));
      dropVariableNodes(setScenarioInitialNodes, id);
      dropVariableNodes(setScenarioOnConnectNodes, id);
      dropVariableNodes(setScenarioMainNodes, id);
      dropVariableNodes(setScenarioAlarmNodes, id);
      dropVariableNodes(setScenarioOnStopNodes, id);
      dropVariableNodes(setScenarioOnDisconnectNodes, id);
      dropVariableNodes(setScenarioFunctionNodes, id);
    },
    [dropVariableNodes],
  );

  const addVariableNodeToCurrentBranch = useCallback(
    (kind: VariableNodeKind, variableId: string) => {
      const variable = variables.find((candidate) => candidate.id === variableId);
      if (variable === undefined) {
        return;
      }
      appendNodeToBranch(scenarioBranch, createVariableBoardNode(kind, variable));
    },
    [appendNodeToBranch, scenarioBranch, variables],
  );

  const assignNodeVariableName = useCallback(
    (nodeId: string, rawName: string) => {
      const variableName = rawName.trim();
      if (variableName === '') {
        return;
      }

      const branchNodes =
        scenarioBranch === 'initial'
          ? scenarioInitialNodes
          : scenarioBranch === 'onConnect'
            ? scenarioOnConnectNodes
            : scenarioBranch === 'main'
              ? scenarioMainNodes
              : scenarioBranch === 'alarm'
                ? scenarioAlarmNodes
                : scenarioBranch === 'onStop'
                  ? scenarioOnStopNodes
                  : scenarioBranch === 'onDisconnect'
                    ? scenarioOnDisconnectNodes
                    : scenarioFunctionNodes;

      const target = branchNodes.find((node) => node.id === nodeId);
      if (target === undefined) {
        return;
      }
      if (target.data?.nodeKind !== 'variable-set') {
        return;
      }
      const currentVariableId =
        typeof target.data?.variableId === 'string' ? target.data.variableId : undefined;
      if (currentVariableId === undefined) {
        return;
      }
      const currentVariable = variables.find((item) => item.id === currentVariableId);
      if (currentVariable === undefined || currentVariable.name === variableName) {
        return;
      }
      const nameTaken = variables.some(
        (item) =>
          item.id !== currentVariableId &&
          item.name === variableName &&
          item.type === currentVariable.type,
      );
      if (nameTaken) {
        return;
      }

      setVariables((current) =>
        current.map((variable) =>
          variable.id === currentVariableId ? { ...variable, name: variableName } : variable,
        ),
      );

      const syncLabels = (nodes: Node[]) =>
        syncVariableNodeLabels(nodes, currentVariableId, variableName);
      setScenarioInitialNodes(syncLabels);
      setScenarioOnConnectNodes(syncLabels);
      setScenarioMainNodes(syncLabels);
      setScenarioAlarmNodes(syncLabels);
      setScenarioOnStopNodes(syncLabels);
      setScenarioOnDisconnectNodes(syncLabels);
      setScenarioFunctionNodes(syncLabels);
    },
    [
      scenarioAlarmNodes,
      scenarioBranch,
      scenarioFunctionNodes,
      scenarioInitialNodes,
      scenarioOnConnectNodes,
      scenarioMainNodes,
      scenarioOnDisconnectNodes,
      scenarioOnStopNodes,
      variables,
    ],
  );

  const addScenarioNodeToCurrentBranch = useCallback(
    (blockKind: ScenarioBlockKind) => {
      appendNodeToBranch(scenarioBranch, createScenarioBoardNode(blockKind));
    },
    [appendNodeToBranch, scenarioBranch],
  );

  const addPaletteNodeToCurrentBranch = useCallback(
    (nodeKind: V04PaletteNodeKind) => {
      appendNodeToBranch(scenarioBranch, createPaletteBoardNode(nodeKind));
    },
    [appendNodeToBranch, scenarioBranch],
  );

  const patchNodeData = useCallback((nodeId: string, patch: Record<string, unknown>) => {
    const mapNodes = (nodes: Node[]) =>
      nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node,
      );
    setScenarioInitialNodes(mapNodes);
    setScenarioOnConnectNodes(mapNodes);
    setScenarioMainNodes(mapNodes);
    setScenarioAlarmNodes(mapNodes);
    setScenarioOnStopNodes(mapNodes);
    setScenarioOnDisconnectNodes(mapNodes);
    setScenarioFunctionNodes(mapNodes);
  }, []);

  const updatePaletteNodeMicrophoneId = useCallback(
    (nodeId: string, microphoneId: string) => {
      patchNodeData(nodeId, { microphoneId });
    },
    [patchNodeData],
  );

  const runDisabledReason = useMemo(
    () =>
      resolveRunDisabledReason({
        validationIssues,
        hasRuntimeHost: runtimeHost !== undefined,
        isRunning: runtimeState.isRunning,
        deviceLive,
      }),
    [deviceLive, runtimeHost, runtimeState.isRunning, validationIssues],
  );

  const canRun = runDisabledReason === null;

  const value = useMemo<DeviceBoardGraphContextValue>(
    () => ({
      deviceKind,
      signalNodes,
      signalEdges,
      scenarioBranch,
      scenarioInitialNodes,
      scenarioInitialEdges,
      scenarioOnConnectNodes,
      scenarioOnConnectEdges,
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
      runDisabledReason,
      runtimeState,
      onSignalNodesChange,
      onSignalEdgesChange,
      onScenarioInitialNodesChange,
      onScenarioInitialEdgesChange,
      onScenarioOnConnectNodesChange,
      onScenarioOnConnectEdgesChange,
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
      onScenarioOnConnectConnect,
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
      isDirty,
      saveScenario,
      startScenario,
      stopScenario,
      mode: runtimeState.mode,
      setMode,
      clearCurrentBranch,
      addScenarioNodeToCurrentBranch,
      addPaletteNodeToCurrentBranch,
      updatePaletteNodeMicrophoneId,
      variables,
      addVariable,
      renameVariable,
      removeVariable,
      addVariableNodeToCurrentBranch,
      assignNodeVariableName,
    }),
    [
      addScenarioNodeToCurrentBranch,
      addPaletteNodeToCurrentBranch,
      updatePaletteNodeMicrophoneId,
      addVariable,
      addVariableNodeToCurrentBranch,
      assignNodeVariableName,
      canRun,
      clearCurrentBranch,
      deviceKind,
      exportJson,
      importJsonFile,
      isDirty,
      isValidConnectionForLayer,
      onScenarioAlarmConnect,
      onScenarioAlarmEdgesChange,
      onScenarioAlarmNodesChange,
      onScenarioInitialConnect,
      onScenarioInitialEdgesChange,
      onScenarioInitialNodesChange,
      onScenarioOnConnectConnect,
      onScenarioOnConnectEdgesChange,
      onScenarioOnConnectNodesChange,
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
      removeVariable,
      renameVariable,
      runDisabledReason,
      runtimeState,
      scenarioAlarmEdges,
      scenarioAlarmNodes,
      scenarioBranch,
      scenarioInitialEdges,
      scenarioInitialNodes,
      scenarioOnConnectEdges,
      scenarioOnConnectNodes,
      scenarioMainEdges,
      scenarioMainNodes,
      scenarioOnStopEdges,
      scenarioOnStopNodes,
      scenarioOnDisconnectEdges,
      scenarioOnDisconnectNodes,
      scenarioFunctionEdges,
      scenarioFunctionNodes,
      saveScenario,
      setMode,
      signalEdges,
      signalNodes,
      startScenario,
      stopScenario,
      syncError,
      syncStatus,
      validationIssues,
      variables,
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
