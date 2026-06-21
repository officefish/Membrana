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
  createRecordingPolicyValue,
  createScenarioVariable,
  DEFAULT_RECORDING_POLICY,
  resolveScenarioCollectorConfig,
  resolveScenarioRecordingPolicy,
  resolveScenarioFftTrendsPolicy,
  type DeviceKind,
  type DeviceScenarioDocument,
  type RuntimeMode,
  type ScenarioBlockKind,
  type ScenarioCollectorConfig,
  type ScenarioRecordingPolicy,
  type ScenarioFftTrendsPolicy,
  type ScenarioVariable,
  type ScenarioVariableType,
  type ScenarioVariableValue,
  isPureEligibleScenarioNodeKind,
} from '@membrana/core';

import type { ScenarioCommentGroupBranch, ScenarioCommentGroupFrameColor, SocketType } from '@membrana/core';
import { resolveScenarioCommentGroupFrameColor } from '@membrana/core';
import type { BoardLayerTab, ScenarioBranchTab } from '../types/board-ui.js';
import {
  buildDeviceScenarioDocument,
  createDefaultHydratedBoardState,
  createPaletteBoardNode,
  createScenarioBoardNode,
  createVariableBoardNode,
  defaultVariableNamePrefix,
  branchScenarioExportFilename,
  buildBranchScenarioExport,
  exportDeviceScenarioDocument,
  getDefaultMvpMicrophoneDocument,
  hydrateBoardFromDocument,
  importDeviceScenarioFromJson,
  applyBranchScenarioImport,
  parseBranchScenarioExportJson,
  suggestReferenceVariableMapping,
  isReferenceMappingComplete,
  isLegacyHackathonDefaultScenario,
  needsFftTrendsPolicyConstructorMigration,
  needsRecordingGateBootstrapMigration,
  isPreRunValid,
  isValidBoardConnection,
  rejectSystemNodeRemovals,
  clearBranchState,
  shouldPreserveLockedNodes,
  centerNodePositionAtFlowPoint,
  resolveRunDisabledReason,
  scenarioDocumentFingerprint,
  syncVariableNodeLabels,
  validatePreRun,
  stripExecEdgesForNodes,
  syncPureNodePins,
  hydratedFunctionInputs,
  collapseSelectionToFunction,
  collapseSelectionToCommentGroup,
  createEmptyFunctionDraft,
  COMMENT_GROUP_DESCRIPTION_MAX_LENGTH,
  type VariableNodeKind,
  type V04PaletteNodeKind,
  type BranchScenarioExport,
  type ReferenceVariableSlot,
  type HydratedBoardState,
  type PreRunValidationIssue,
  type ScenarioFunctionDraft,
  type ScenarioFunctionCanvasMeta,
} from '../graph/index.js';
import {
  syncFunctionIoNodePins,
} from '../graph/function-io-node.js';
import {
  findFunctionIoNodeIds,
  proposeNewFunctionPin,
  removeFunctionPinFromList,
  remapFunctionCanvasEdgeHandles,
  stripFunctionCanvasEdgesForPins,
  syncSubgraphBlocksForFunctionPins,
  updateFunctionPinInList,
  type FunctionPinSide,
} from '../graph/function-pin-ops.js';
import type { DeviceBoardPersistAdapter } from '../persist/device-board-persist.js';
import {
  ScenarioRuntime,
  createIdleScenarioRuntimeState,
  inspectNodePorts,
  type NodePortInspectionResult,
  type ScenarioRuntimeHost,
  type ScenarioRuntimeState,
  type ScenarioStopReason,
} from '../runtime/index.js';

export interface PendingBranchImportState {
  readonly exportPayload: BranchScenarioExport;
  readonly slots: readonly ReferenceVariableSlot[];
  readonly mapping: Record<string, string>;
}

/** Результат collapse marquee → comment group (CGF G1). */
export interface CollapseMarqueeToCommentGroupResult {
  readonly error: string | null;
  /** Созданная group-нода с selected: true — для фокуса инспектора. */
  readonly groupNode: Node | null;
}

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
  readonly scenarioFunctionMeta: ScenarioFunctionCanvasMeta;
  readonly scenarioFunctionDrafts: readonly ScenarioFunctionDraft[];
  readonly activeFunctionId: string;
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
  /** Signal — полный документ; scenario — только активная ветка-обработчик. */
  readonly exportJson: (layer?: BoardLayerTab) => Promise<void>;
  readonly importJsonFile: (file: File) => Promise<string | null>;
  /** Ожидает сопоставления ссылочных переменных после импорта branch-scenario. */
  readonly pendingBranchImport: PendingBranchImportState | null;
  readonly confirmBranchImport: (mapping: Readonly<Record<string, string>>) => string | null;
  readonly cancelBranchImport: () => void;
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
  /** Показывать служебные логи библиотеки (host.log); Print всегда в консоль. */
  readonly showInfoLogs: boolean;
  readonly setShowInfoLogs: (enabled: boolean) => void;
  /** Phase 3: буфер INFO-логов сценария (copy / download). */
  readonly scenarioTraceLineCount: number;
  readonly copyScenarioTrace: () => Promise<boolean>;
  readonly downloadScenarioTrace: () => void;
  /** Очистка узлов текущей ветки (Signal или активная Scenario-ветка); Event-entry сохраняется. */
  readonly clearCurrentBranch: (layer: BoardLayerTab) => void;
  /** Добавить legacy D0-ноду из палитры в активную ветку (только при legacy-флаге). */
  readonly addScenarioNodeToCurrentBranch: (blockKind: ScenarioBlockKind) => void;
  /** v0.4 DBR5: добавить узел палитры в активную ветку (`flowCenter` — центр viewport в flow coords). */
  readonly addPaletteNodeToCurrentBranch: (
    nodeKind: V04PaletteNodeKind,
    flowCenter?: { readonly x: number; readonly y: number },
  ) => void;
  /** v0.4: добавить узел палитры в точку drop и соединить с исходным портом. */
  readonly addPaletteNodeWithConnection: (
    nodeKind: V04PaletteNodeKind,
    flowCenter: { readonly x: number; readonly y: number },
    connection: {
      readonly source: string;
      readonly sourceHandle: string;
      readonly targetHandle: string;
    },
  ) => void;
  /** v0.4 DBR5: обновить выбранный микрофон на узле get-microphone. */
  readonly updatePaletteNodeMicrophoneId: (nodeId: string, microphoneId: string) => void;
  /** v0.5 DBC3: обновить collectorConfig на Collect-узле. */
  readonly updateCollectorConfig: (nodeId: string, config: ScenarioCollectorConfig) => void;
  /** v0.8 A3: обновить recordingPolicy на MakeRecordingPolicy / StartRecording / IsRecordingWindowFull. */
  readonly updateRecordingPolicy: (nodeId: string, policy: ScenarioRecordingPolicy) => void;
  /** v0.8 B0: обновить fftTrendsPolicy на MakeFftTrendsPolicy. */
  readonly updateFftTrendsPolicy: (nodeId: string, policy: ScenarioFftTrendsPolicy) => void;
  /** v0.4: переменные сценария (document-scope) для конструктора переменных. */
  readonly variables: readonly ScenarioVariable[];
  /** v0.4: объявить новую переменную ссылочного типа. */
  readonly addVariable: (type: ScenarioVariableType) => void;
  /** v0.4: переименовать переменную. */
  readonly renameVariable: (id: string, name: string) => void;
  /** v0.4: удалить переменную и её узлы get/set со всех веток. */
  readonly removeVariable: (id: string) => void;
  /** v0.4: добавить узел get/set переменной в активную ветку. */
  readonly updateActiveFunctionMeta: (
    patch: Partial<Pick<ScenarioFunctionCanvasMeta, 'name' | 'description'>>,
  ) => void;
  readonly addActiveFunctionPin: (side: FunctionPinSide, kind: 'exec' | 'data') => string | null;
  readonly removeActiveFunctionPin: (side: FunctionPinSide, pinId: string) => string | null;
  readonly updateActiveFunctionPin: (
    side: FunctionPinSide,
    pinId: string,
    patch: {
      readonly name?: string;
      readonly kind?: 'exec' | 'data';
      readonly socketType?: SocketType;
    },
  ) => string | null;
  readonly createUserFunction: () => void;
  readonly selectUserFunction: (functionId: string) => void;
  readonly collapseMarqueeToFunction: (
    branch: ScenarioBranchTab,
    selectedNodeIds: readonly string[],
  ) => string | null;
  readonly collapseMarqueeToCommentGroup: (
    branch: ScenarioCommentGroupBranch,
    selectedNodeIds: readonly string[],
  ) => CollapseMarqueeToCommentGroupResult;
  /** CGF G1: название, описание и цвет рамки comment group (только edit mode). */
  readonly updateCommentGroupMetadata: (
    nodeId: string,
    patch: {
      readonly title?: string;
      readonly description?: string;
      readonly frameColor?: ScenarioCommentGroupFrameColor;
    },
  ) => void;
  readonly addVariableNodeToCurrentBranch: (
    kind: VariableNodeKind,
    variableId: string,
    flowCenter?: { readonly x: number; readonly y: number },
  ) => void;
  /** v0.4: привязать variable-get/set к переменной по имени (создаёт при отсутствии). */
  readonly assignNodeVariableName: (nodeId: string, variableName: string) => void;
  /** v0.9: Pure ↔ Impure для variable-get (+ strip exec edges при pure). */
  readonly setVariableGetterPure: (nodeId: string, pure: boolean) => void;
  /** v0.9: задать value переменной (getter value-типов). */
  readonly updateVariableValue: (variableId: string, value: ScenarioVariableValue | null) => void;
  /** Runtime: снимок входов/выходов выбранного узла (только при isRunning). */
  readonly inspectRuntimeNode: (
    nodeId: string,
    branch: ScenarioBranchTab,
    nodes: readonly Node[],
    edges: readonly Edge[],
  ) => NodePortInspectionResult | null;
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
  const [scenarioFunctionMeta, setScenarioFunctionMeta] = useState<ScenarioFunctionCanvasMeta>(
    defaultState.scenarioFunctionMeta,
  );
  const [scenarioFunctionDrafts, setScenarioFunctionDrafts] = useState<readonly ScenarioFunctionDraft[]>(
    defaultState.scenarioFunctionDrafts,
  );
  const [activeFunctionId, setActiveFunctionId] = useState(defaultState.activeFunctionId);
  const [variables, setVariables] = useState<readonly ScenarioVariable[]>(defaultState.variables);
  const [pendingBranchImport, setPendingBranchImport] = useState<PendingBranchImportState | null>(
    null,
  );
  const [validationIssues, setValidationIssues] = useState<readonly PreRunValidationIssue[]>([]);
  const [runtimeState, setRuntimeState] = useState<ScenarioRuntimeState>(createIdleScenarioRuntimeState());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showInfoLogs, setShowInfoLogs] = useState(true);
  const [scenarioTraceLineCount, setScenarioTraceLineCount] = useState(0);

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
    runtimeHost?.setInfoLoggingEnabled?.(showInfoLogs);
  }, [runtimeHost, showInfoLogs]);

  useEffect(() => {
    const syncTraceCount = (): void => {
      setScenarioTraceLineCount(runtimeHost?.getScenarioTraceLineCount?.() ?? 0);
    };
    syncTraceCount();
    return runtimeHost?.subscribeScenarioTraceBuffer?.(syncTraceCount);
  }, [runtimeHost]);

  const copyScenarioTrace = useCallback(async (): Promise<boolean> => {
    return (await runtimeHost?.copyScenarioTraceToClipboard?.()) ?? false;
  }, [runtimeHost]);

  const downloadScenarioTrace = useCallback((): void => {
    runtimeHost?.downloadScenarioTrace?.(null);
  }, [runtimeHost]);

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
    setScenarioFunctionDrafts(state.scenarioFunctionDrafts);
    setActiveFunctionId(state.activeFunctionId);
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
          let document = record.document;
          if (
            deviceKindProp === 'microphone' &&
            (isLegacyHackathonDefaultScenario(document) ||
              needsRecordingGateBootstrapMigration(document) ||
              needsFftTrendsPolicyConstructorMigration(document))
          ) {
            document = getDefaultMvpMicrophoneDocument();
            void persistAdapter
              .save(document)
              .then((saved) => {
                if (cancelled || saved === null) {
                  return;
                }
                markSavedSnapshot(saved.document);
              })
              .catch(() => {
                /* migrate best-effort */
              });
          }
          applyHydratedState(hydrateBoardFromDocument(document));
          pendingBaselineRef.current = true;
        } else {
          pendingBaselineRef.current = true;
          const seedDocument =
            deviceKindProp === 'microphone'
              ? getDefaultMvpMicrophoneDocument()
              : buildDeviceScenarioDocument({
                  deviceKind: deviceKindProp,
                  signalNodes: defaultState.signalNodes,
                  signalEdges: defaultState.signalEdges,
                  scenarioInitialNodes: defaultState.scenarioInitialNodes,
                  scenarioInitialEdges: defaultState.scenarioInitialEdges,
                  scenarioOnConnectNodes: defaultState.scenarioOnConnectNodes,
                  scenarioOnConnectEdges: defaultState.scenarioOnConnectEdges,
                  scenarioMainNodes: defaultState.scenarioMainNodes,
                  scenarioMainEdges: defaultState.scenarioMainEdges,
                  scenarioAlarmNodes: defaultState.scenarioAlarmNodes,
                  scenarioAlarmEdges: defaultState.scenarioAlarmEdges,
                  scenarioOnStopNodes: defaultState.scenarioOnStopNodes,
                  scenarioOnStopEdges: defaultState.scenarioOnStopEdges,
                  scenarioOnDisconnectNodes: defaultState.scenarioOnDisconnectNodes,
                  scenarioOnDisconnectEdges: defaultState.scenarioOnDisconnectEdges,
                  scenarioFunctions: [],
                  variables: defaultState.variables,
                });
          void persistAdapter
            .save(seedDocument)
            .then((saved) => {
              if (cancelled || saved === null) {
                return;
              }
              markSavedSnapshot(saved.document);
            })
            .catch(() => {
              /* seed best-effort; canvas already shows bundled default */
            });
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

  const loadFunctionDraftToCanvas = useCallback((draft: ScenarioFunctionDraft) => {
    setScenarioFunctionNodes([...draft.nodes]);
    setScenarioFunctionEdges([...draft.edges]);
    setScenarioFunctionMeta({
      id: draft.id,
      name: draft.name,
      entry: draft.entry,
      description: draft.description,
      inputPins: draft.inputPins,
      outputPins: draft.outputPins,
    });
    setActiveFunctionId(draft.id);
  }, []);

  const commitActiveFunctionDraft = useCallback(
    (drafts: readonly ScenarioFunctionDraft[]): readonly ScenarioFunctionDraft[] =>
      drafts.map((draft) =>
        draft.id === activeFunctionId
          ? {
              ...draft,
              name: scenarioFunctionMeta.name,
              entry: scenarioFunctionMeta.entry,
              description: scenarioFunctionMeta.description,
              inputPins: scenarioFunctionMeta.inputPins,
              outputPins: scenarioFunctionMeta.outputPins,
              nodes: scenarioFunctionNodes,
              edges: scenarioFunctionEdges,
            }
          : draft,
      ),
    [
      activeFunctionId,
      scenarioFunctionEdges,
      scenarioFunctionMeta,
      scenarioFunctionNodes,
    ],
  );

  const selectUserFunction = useCallback(
    (functionId: string) => {
      if (functionId === activeFunctionId) {
        return;
      }
      const committed = commitActiveFunctionDraft(scenarioFunctionDrafts);
      const target = committed.find((draft) => draft.id === functionId);
      if (target === undefined) {
        return;
      }
      setScenarioFunctionDrafts(committed);
      loadFunctionDraftToCanvas(target);
      setScenarioBranch('function');
    },
    [
      activeFunctionId,
      commitActiveFunctionDraft,
      loadFunctionDraftToCanvas,
      scenarioFunctionDrafts,
    ],
  );

  const createUserFunction = useCallback(() => {
    const committed = commitActiveFunctionDraft(scenarioFunctionDrafts);
    let seq = committed.length + 1;
    while (committed.some((draft) => draft.id === `fn-${seq}`)) {
      seq += 1;
    }
    const id = `fn-${seq}`;
    const draft = createEmptyFunctionDraft(id, `Function ${seq}`);
    setScenarioFunctionDrafts([...committed, draft]);
    loadFunctionDraftToCanvas(draft);
    setScenarioBranch('function');
  }, [commitActiveFunctionDraft, loadFunctionDraftToCanvas, scenarioFunctionDrafts]);

  const updateActiveFunctionMeta = useCallback(
    (patch: Partial<Pick<ScenarioFunctionCanvasMeta, 'name' | 'description'>>) => {
      setScenarioFunctionMeta((meta) => {
        const next = { ...meta, ...patch };
        if (patch.name !== undefined) {
          const payload = {
            functionId: next.id,
            functionName: next.name,
            inputPins: next.inputPins,
            outputPins: next.outputPins,
            removedInputPinIds: new Set<string>(),
            removedOutputPinIds: new Set<string>(),
            renames: [] as const,
          };
          const initial = syncSubgraphBlocksForFunctionPins({
            ...payload,
            nodes: scenarioInitialNodes,
            edges: scenarioInitialEdges,
          });
          setScenarioInitialNodes(initial.nodes);
          setScenarioInitialEdges(initial.edges);
          const onConnect = syncSubgraphBlocksForFunctionPins({
            ...payload,
            nodes: scenarioOnConnectNodes,
            edges: scenarioOnConnectEdges,
          });
          setScenarioOnConnectNodes(onConnect.nodes);
          setScenarioOnConnectEdges(onConnect.edges);
          const main = syncSubgraphBlocksForFunctionPins({
            ...payload,
            nodes: scenarioMainNodes,
            edges: scenarioMainEdges,
          });
          setScenarioMainNodes(main.nodes);
          setScenarioMainEdges(main.edges);
          const alarm = syncSubgraphBlocksForFunctionPins({
            ...payload,
            nodes: scenarioAlarmNodes,
            edges: scenarioAlarmEdges,
          });
          setScenarioAlarmNodes(alarm.nodes);
          setScenarioAlarmEdges(alarm.edges);
          const onStop = syncSubgraphBlocksForFunctionPins({
            ...payload,
            nodes: scenarioOnStopNodes,
            edges: scenarioOnStopEdges,
          });
          setScenarioOnStopNodes(onStop.nodes);
          setScenarioOnStopEdges(onStop.edges);
          const onDisconnect = syncSubgraphBlocksForFunctionPins({
            ...payload,
            nodes: scenarioOnDisconnectNodes,
            edges: scenarioOnDisconnectEdges,
          });
          setScenarioOnDisconnectNodes(onDisconnect.nodes);
          setScenarioOnDisconnectEdges(onDisconnect.edges);
        }
        return next;
      });
    },
    [
      scenarioAlarmEdges,
      scenarioAlarmNodes,
      scenarioInitialEdges,
      scenarioInitialNodes,
      scenarioMainEdges,
      scenarioMainNodes,
      scenarioOnConnectEdges,
      scenarioOnConnectNodes,
      scenarioOnDisconnectEdges,
      scenarioOnDisconnectNodes,
      scenarioOnStopEdges,
      scenarioOnStopNodes,
    ],
  );

  const applyActiveFunctionPinState = useCallback(
    (input: {
      readonly meta: ScenarioFunctionCanvasMeta;
      readonly functionEdges: Edge[];
      readonly removedInputPinIds: readonly string[];
      readonly removedOutputPinIds: readonly string[];
      readonly renames: readonly { readonly side: FunctionPinSide; readonly from: string; readonly to: string }[];
    }) => {
      const { inputNodeId, outputNodeId } = findFunctionIoNodeIds(scenarioFunctionNodes);
      if (inputNodeId === null || outputNodeId === null) {
        return;
      }
      const removedIn = new Set(input.removedInputPinIds);
      const removedOut = new Set(input.removedOutputPinIds);

      const syncedNodes = syncFunctionIoNodePins(
        scenarioFunctionNodes,
        input.meta.inputPins,
        input.meta.outputPins,
      );
      let syncedFunctionEdges = stripFunctionCanvasEdgesForPins(
        input.functionEdges,
        inputNodeId,
        outputNodeId,
        removedIn,
        removedOut,
      );
      for (const rename of input.renames) {
        syncedFunctionEdges = remapFunctionCanvasEdgeHandles(
          syncedFunctionEdges,
          inputNodeId,
          outputNodeId,
          rename.side,
          rename.from,
          rename.to,
        );
      }

      setScenarioFunctionMeta(input.meta);
      setScenarioFunctionNodes(syncedNodes);
      setScenarioFunctionEdges(syncedFunctionEdges);

      const branchPayload = {
        functionId: input.meta.id,
        functionName: input.meta.name,
        inputPins: input.meta.inputPins,
        outputPins: input.meta.outputPins,
        removedInputPinIds: removedIn,
        removedOutputPinIds: removedOut,
        renames: input.renames,
      };

      const initial = syncSubgraphBlocksForFunctionPins({
        ...branchPayload,
        nodes: scenarioInitialNodes,
        edges: scenarioInitialEdges,
      });
      setScenarioInitialNodes(initial.nodes);
      setScenarioInitialEdges(initial.edges);

      const onConnect = syncSubgraphBlocksForFunctionPins({
        ...branchPayload,
        nodes: scenarioOnConnectNodes,
        edges: scenarioOnConnectEdges,
      });
      setScenarioOnConnectNodes(onConnect.nodes);
      setScenarioOnConnectEdges(onConnect.edges);

      const main = syncSubgraphBlocksForFunctionPins({
        ...branchPayload,
        nodes: scenarioMainNodes,
        edges: scenarioMainEdges,
      });
      setScenarioMainNodes(main.nodes);
      setScenarioMainEdges(main.edges);

      const alarm = syncSubgraphBlocksForFunctionPins({
        ...branchPayload,
        nodes: scenarioAlarmNodes,
        edges: scenarioAlarmEdges,
      });
      setScenarioAlarmNodes(alarm.nodes);
      setScenarioAlarmEdges(alarm.edges);

      const onStop = syncSubgraphBlocksForFunctionPins({
        ...branchPayload,
        nodes: scenarioOnStopNodes,
        edges: scenarioOnStopEdges,
      });
      setScenarioOnStopNodes(onStop.nodes);
      setScenarioOnStopEdges(onStop.edges);

      const onDisconnect = syncSubgraphBlocksForFunctionPins({
        ...branchPayload,
        nodes: scenarioOnDisconnectNodes,
        edges: scenarioOnDisconnectEdges,
      });
      setScenarioOnDisconnectNodes(onDisconnect.nodes);
      setScenarioOnDisconnectEdges(onDisconnect.edges);

      setScenarioFunctionDrafts((drafts) =>
        drafts.map((draft) =>
          draft.id === input.meta.id
            ? {
                ...draft,
                name: input.meta.name,
                description: input.meta.description,
                inputPins: input.meta.inputPins,
                outputPins: input.meta.outputPins,
                nodes: syncedNodes,
                edges: syncedFunctionEdges,
              }
            : draft,
        ),
      );
    },
    [
      scenarioAlarmEdges,
      scenarioAlarmNodes,
      scenarioFunctionNodes,
      scenarioInitialEdges,
      scenarioInitialNodes,
      scenarioMainEdges,
      scenarioMainNodes,
      scenarioOnConnectEdges,
      scenarioOnConnectNodes,
      scenarioOnDisconnectEdges,
      scenarioOnDisconnectNodes,
      scenarioOnStopEdges,
      scenarioOnStopNodes,
    ],
  );

  const addActiveFunctionPin = useCallback(
    (side: FunctionPinSide, kind: 'exec' | 'data'): string | null => {
      const pins = side === 'input' ? scenarioFunctionMeta.inputPins : scenarioFunctionMeta.outputPins;
      const proposed = proposeNewFunctionPin(side, kind, pins);
      if ('error' in proposed) {
        return proposed.error;
      }
      const nextMeta: ScenarioFunctionCanvasMeta = {
        ...scenarioFunctionMeta,
        ...(side === 'input'
          ? { inputPins: [...pins, proposed.pin] }
          : { outputPins: [...pins, proposed.pin] }),
      };
      applyActiveFunctionPinState({
        meta: nextMeta,
        functionEdges: scenarioFunctionEdges,
        removedInputPinIds: [],
        removedOutputPinIds: [],
        renames: [],
      });
      return null;
    },
    [applyActiveFunctionPinState, scenarioFunctionEdges, scenarioFunctionMeta],
  );

  const removeActiveFunctionPin = useCallback(
    (side: FunctionPinSide, pinId: string): string | null => {
      const pins = side === 'input' ? scenarioFunctionMeta.inputPins : scenarioFunctionMeta.outputPins;
      const next = removeFunctionPinFromList(pins, pinId);
      if ('error' in next) {
        return next.error;
      }
      const nextMeta: ScenarioFunctionCanvasMeta = {
        ...scenarioFunctionMeta,
        ...(side === 'input' ? { inputPins: next } : { outputPins: next }),
      };
      applyActiveFunctionPinState({
        meta: nextMeta,
        functionEdges: scenarioFunctionEdges,
        removedInputPinIds: side === 'input' ? [pinId] : [],
        removedOutputPinIds: side === 'output' ? [pinId] : [],
        renames: [],
      });
      return null;
    },
    [applyActiveFunctionPinState, scenarioFunctionEdges, scenarioFunctionMeta],
  );

  const updateActiveFunctionPin = useCallback(
    (
      side: FunctionPinSide,
      pinId: string,
      patch: {
        readonly name?: string;
        readonly kind?: 'exec' | 'data';
        readonly socketType?: SocketType;
      },
    ): string | null => {
      const pins = side === 'input' ? scenarioFunctionMeta.inputPins : scenarioFunctionMeta.outputPins;
      const updated = updateFunctionPinInList(pins, pinId, patch);
      if ('error' in updated) {
        return updated.error;
      }
      const nextMeta: ScenarioFunctionCanvasMeta = {
        ...scenarioFunctionMeta,
        ...(side === 'input' ? { inputPins: updated.pins } : { outputPins: updated.pins }),
      };
      const renames =
        updated.renamedFrom !== undefined && updated.renamedTo !== undefined
          ? [{ side, from: updated.renamedFrom, to: updated.renamedTo }]
          : [];
      applyActiveFunctionPinState({
        meta: nextMeta,
        functionEdges: scenarioFunctionEdges,
        removedInputPinIds: [],
        removedOutputPinIds: [],
        renames,
      });
      return null;
    },
    [applyActiveFunctionPinState, scenarioFunctionEdges, scenarioFunctionMeta],
  );

  const applyScenarioBranchGraph = useCallback(
    (branch: ScenarioBranchTab, nodes: Node[], edges: Edge[]) => {
      switch (branch) {
        case 'initial':
          setScenarioInitialNodes(nodes);
          setScenarioInitialEdges(edges);
          break;
        case 'onConnect':
          setScenarioOnConnectNodes(nodes);
          setScenarioOnConnectEdges(edges);
          break;
        case 'main':
          setScenarioMainNodes(nodes);
          setScenarioMainEdges(edges);
          break;
        case 'alarm':
          setScenarioAlarmNodes(nodes);
          setScenarioAlarmEdges(edges);
          break;
        case 'onStop':
          setScenarioOnStopNodes(nodes);
          setScenarioOnStopEdges(edges);
          break;
        case 'onDisconnect':
          setScenarioOnDisconnectNodes(nodes);
          setScenarioOnDisconnectEdges(edges);
          break;
        case 'function':
          setScenarioFunctionNodes(nodes);
          setScenarioFunctionEdges(edges);
          break;
        default:
          break;
      }
    },
    [],
  );

  const readScenarioBranchGraph = useCallback(
    (
      branch: ScenarioBranchTab,
    ): { readonly nodes: readonly Node[]; readonly edges: readonly Edge[] } => {
      switch (branch) {
        case 'initial':
          return { nodes: scenarioInitialNodes, edges: scenarioInitialEdges };
        case 'onConnect':
          return { nodes: scenarioOnConnectNodes, edges: scenarioOnConnectEdges };
        case 'main':
          return { nodes: scenarioMainNodes, edges: scenarioMainEdges };
        case 'alarm':
          return { nodes: scenarioAlarmNodes, edges: scenarioAlarmEdges };
        case 'onStop':
          return { nodes: scenarioOnStopNodes, edges: scenarioOnStopEdges };
        case 'onDisconnect':
          return { nodes: scenarioOnDisconnectNodes, edges: scenarioOnDisconnectEdges };
        case 'function':
          return { nodes: scenarioFunctionNodes, edges: scenarioFunctionEdges };
        default:
          return { nodes: [], edges: [] };
      }
    },
    [
      scenarioAlarmEdges,
      scenarioAlarmNodes,
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

  const collapseMarqueeToFunction = useCallback(
    (branch: ScenarioBranchTab, selectedNodeIds: readonly string[]): string | null => {
      if (branch === 'function') {
        return 'Объединение доступно только на ветках сценария';
      }
      const { nodes: branchNodes, edges: branchEdges } = readScenarioBranchGraph(branch);
      const result = collapseSelectionToFunction({
        selectedNodeIds,
        branchNodes,
        branchEdges,
      });
      if (!result.ok) {
        return result.message;
      }
      const committed = commitActiveFunctionDraft(scenarioFunctionDrafts);
      setScenarioFunctionDrafts([...committed, result.functionDraft]);
      applyScenarioBranchGraph(branch, result.branchNodes, result.branchEdges);
      loadFunctionDraftToCanvas(result.functionDraft);
      setScenarioBranch('function');
      return null;
    },
    [
      applyScenarioBranchGraph,
      commitActiveFunctionDraft,
      loadFunctionDraftToCanvas,
      readScenarioBranchGraph,
      scenarioFunctionDrafts,
    ],
  );

  const collapseMarqueeToCommentGroup = useCallback(
    (branch: ScenarioCommentGroupBranch, selectedNodeIds: readonly string[]): CollapseMarqueeToCommentGroupResult => {
      const branchNodes = branch === 'signal' ? signalNodes : readScenarioBranchGraph(branch).nodes;
      const branchEdges =
        branch === 'signal' ? signalEdges : readScenarioBranchGraph(branch).edges;
      const result = collapseSelectionToCommentGroup({
        branch,
        selectedNodeIds,
        branchNodes,
      });
      if (!result.ok) {
        return { error: result.message, groupNode: null };
      }
      const groupId = result.group.id;
      const branchNodesSelected = result.branchNodes.map((node) => ({
        ...node,
        selected: node.id === groupId,
      }));
      const groupNode = branchNodesSelected.find((node) => node.id === groupId) ?? null;
      if (branch === 'signal') {
        setSignalNodes(branchNodesSelected);
      } else {
        applyScenarioBranchGraph(branch, branchNodesSelected, [...branchEdges]);
      }
      return { error: null, groupNode };
    },
    [
      applyScenarioBranchGraph,
      readScenarioBranchGraph,
      signalEdges,
      signalNodes,
    ],
  );

  const buildHydratedSnapshot = useCallback(
    (): HydratedBoardState => ({
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
      scenarioFunctionDrafts: commitActiveFunctionDraft(scenarioFunctionDrafts),
      activeFunctionId,
      variables,
    }),
    [
      activeFunctionId,
      commitActiveFunctionDraft,
      deviceKind,
      scenarioAlarmEdges,
      scenarioAlarmNodes,
      scenarioFunctionDrafts,
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
    ],
  );

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
      scenarioFunctionNodes,
      scenarioFunctions: hydratedFunctionInputs(buildHydratedSnapshot()),
      variables,
    });
  }, [buildHydratedSnapshot, deviceKind, scenarioAlarmEdges, scenarioAlarmNodes, scenarioFunctionNodes, scenarioInitialEdges, scenarioInitialNodes, scenarioOnConnectEdges, scenarioOnConnectNodes, scenarioMainEdges, scenarioMainNodes, scenarioOnDisconnectEdges, scenarioOnDisconnectNodes, scenarioOnStopEdges, scenarioOnStopNodes, signalEdges, signalNodes, variables]);

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
      scenarioFunctions: hydratedFunctionInputs(buildHydratedSnapshot()),
    });
    setValidationIssues(issues);
    return issues;
  }, [buildHydratedSnapshot, deviceKind, scenarioAlarmEdges, scenarioAlarmNodes, scenarioInitialEdges, scenarioInitialNodes, scenarioOnConnectEdges, scenarioOnConnectNodes, scenarioMainEdges, scenarioMainNodes, scenarioOnDisconnectEdges, scenarioOnDisconnectNodes, scenarioOnStopEdges, scenarioOnStopNodes, signalEdges, signalNodes]);

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

  const exportJson = useCallback(
    async (layer: BoardLayerTab = 'scenario') => {
      let json: string;
      let downloadName: string;

      if (layer === 'signal') {
        const exported = await exportDeviceScenarioDocument(buildDocument());
        json = exported.json;
        downloadName = `device-scenario-${deviceKind}.json`;
      } else {
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
        const branchEdges =
          scenarioBranch === 'initial'
            ? scenarioInitialEdges
            : scenarioBranch === 'onConnect'
              ? scenarioOnConnectEdges
              : scenarioBranch === 'main'
                ? scenarioMainEdges
                : scenarioBranch === 'alarm'
                  ? scenarioAlarmEdges
                  : scenarioBranch === 'onStop'
                    ? scenarioOnStopEdges
                    : scenarioBranch === 'onDisconnect'
                      ? scenarioOnDisconnectEdges
                      : scenarioFunctionEdges;

        const branchExport = buildBranchScenarioExport({
          deviceKind,
          branch: scenarioBranch,
          nodes: branchNodes,
          edges: branchEdges,
          variables,
          ...(scenarioBranch === 'function'
            ? { functionMeta: scenarioFunctionMeta }
            : {}),
        });
        json = JSON.stringify(branchExport, null, 2);
        downloadName = branchScenarioExportFilename(deviceKind, scenarioBranch);
      }

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName;
      anchor.click();
      URL.revokeObjectURL(url);
      runValidation();
    },
    [
      buildDocument,
      deviceKind,
      runValidation,
      scenarioAlarmEdges,
      scenarioAlarmNodes,
      scenarioBranch,
      scenarioFunctionEdges,
      scenarioFunctionMeta,
      scenarioFunctionNodes,
      scenarioInitialEdges,
      scenarioInitialNodes,
      scenarioMainEdges,
      scenarioMainNodes,
      scenarioOnConnectEdges,
      scenarioOnConnectNodes,
      scenarioOnDisconnectEdges,
      scenarioOnDisconnectNodes,
      scenarioOnStopEdges,
      scenarioOnStopNodes,
      variables,
    ],
  );

  const applyBranchImportResult = useCallback(
    (nodes: Node[], edges: Edge[], nextVariables: readonly ScenarioVariable[]) => {
      setVariables([...nextVariables]);
      switch (scenarioBranch) {
        case 'initial':
          setScenarioInitialNodes(nodes);
          setScenarioInitialEdges(edges);
          break;
        case 'onConnect':
          setScenarioOnConnectNodes(nodes);
          setScenarioOnConnectEdges(edges);
          break;
        case 'main':
          setScenarioMainNodes(nodes);
          setScenarioMainEdges(edges);
          break;
        case 'alarm':
          setScenarioAlarmNodes(nodes);
          setScenarioAlarmEdges(edges);
          break;
        case 'onStop':
          setScenarioOnStopNodes(nodes);
          setScenarioOnStopEdges(edges);
          break;
        case 'onDisconnect':
          setScenarioOnDisconnectNodes(nodes);
          setScenarioOnDisconnectEdges(edges);
          break;
        case 'function':
          setScenarioFunctionNodes(nodes);
          setScenarioFunctionEdges(edges);
          break;
        default:
          break;
      }
      pendingBaselineRef.current = true;
      runValidation();
    },
    [runValidation, scenarioBranch],
  );

  const importJsonFile = useCallback(
    async (file: File): Promise<string | null> => {
      const text = await file.text();
      const branchParsed = parseBranchScenarioExportJson(text);
      if (branchParsed.ok) {
        const autoMapping = suggestReferenceVariableMapping(
          branchParsed.referenceVariableSlots,
          variables,
        );
        if (isReferenceMappingComplete(branchParsed.referenceVariableSlots, autoMapping)) {
          const applied = applyBranchScenarioImport({
            targetBranch: scenarioBranch,
            deviceKind,
            export: branchParsed.export,
            referenceVariableSlots: branchParsed.referenceVariableSlots,
            localVariables: variables,
            mapping: autoMapping,
          });
          if (!applied.ok) {
            return applied.message;
          }
          applyBranchImportResult(applied.nodes, applied.edges, applied.variables);
          return null;
        }
        setPendingBranchImport({
          exportPayload: branchParsed.export,
          slots: branchParsed.referenceVariableSlots,
          mapping: autoMapping,
        });
        return null;
      }

      const result = importDeviceScenarioFromJson(text);
      if (!result.ok) {
        return result.message;
      }
      setPendingBranchImport(null);
      applyHydratedState(result.state);
      pendingBaselineRef.current = true;
      runValidation();
      return null;
    },
    [applyBranchImportResult, applyHydratedState, deviceKind, runValidation, scenarioBranch, variables],
  );

  const confirmBranchImport = useCallback(
    (mapping: Readonly<Record<string, string>>): string | null => {
      if (pendingBranchImport === null) {
        return 'Нет активного импорта ветки';
      }
      const applied = applyBranchScenarioImport({
        targetBranch: scenarioBranch,
        deviceKind,
        export: pendingBranchImport.exportPayload,
        referenceVariableSlots: pendingBranchImport.slots,
        localVariables: variables,
        mapping,
      });
      if (!applied.ok) {
        return applied.message;
      }
      setPendingBranchImport(null);
      applyBranchImportResult(applied.nodes, applied.edges, applied.variables);
      return null;
    },
    [applyBranchImportResult, deviceKind, pendingBranchImport, scenarioBranch, variables],
  );

  const cancelBranchImport = useCallback(() => {
    setPendingBranchImport(null);
  }, []);

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
      const name = `${defaultVariableNamePrefix(type)}${sameType + 1}`;
      const id = `var-${type}-${Date.now().toString(36)}-${current.length + 1}`;
      const variable = createScenarioVariable(id, name, type);
      if (type === 'RecordingPolicy') {
        return [
          ...current,
          {
            ...variable,
            value: createRecordingPolicyValue(
              DEFAULT_RECORDING_POLICY.windowSec,
              DEFAULT_RECORDING_POLICY.captureFormat,
            ),
          },
        ];
      }
      return [...current, variable];
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
    (
      kind: VariableNodeKind,
      variableId: string,
      flowCenter?: { readonly x: number; readonly y: number },
    ) => {
      const variable = variables.find((candidate) => candidate.id === variableId);
      if (variable === undefined) {
        return;
      }
      const position =
        flowCenter !== undefined ? centerNodePositionAtFlowPoint(flowCenter) : undefined;
      appendNodeToBranch(
        scenarioBranch,
        createVariableBoardNode(kind, variable, position !== undefined ? { position } : {}),
      );
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
    (nodeKind: V04PaletteNodeKind, flowCenter?: { readonly x: number; readonly y: number }) => {
      const position =
        flowCenter !== undefined ? centerNodePositionAtFlowPoint(flowCenter) : undefined;
      appendNodeToBranch(
        scenarioBranch,
        createPaletteBoardNode(nodeKind, position !== undefined ? { position } : {}),
      );
    },
    [appendNodeToBranch, scenarioBranch],
  );

  const addPaletteNodeWithConnection = useCallback(
    (
      nodeKind: V04PaletteNodeKind,
      flowCenter: { readonly x: number; readonly y: number },
      connection: {
        readonly source: string;
        readonly sourceHandle: string;
        readonly targetHandle: string;
      },
    ) => {
      const position = centerNodePositionAtFlowPoint(flowCenter);
      const node = createPaletteBoardNode(nodeKind, { position });
      const edgeConnection: Connection = {
        source: connection.source,
        sourceHandle: connection.sourceHandle,
        target: node.id,
        targetHandle: connection.targetHandle,
      };
      switch (scenarioBranch) {
        case 'initial':
          setScenarioInitialNodes((nodes) => [...nodes, node]);
          setScenarioInitialEdges((edges) => addEdge(edgeConnection, edges));
          break;
        case 'onConnect':
          setScenarioOnConnectNodes((nodes) => [...nodes, node]);
          setScenarioOnConnectEdges((edges) => addEdge(edgeConnection, edges));
          break;
        case 'main':
          setScenarioMainNodes((nodes) => [...nodes, node]);
          setScenarioMainEdges((edges) => addEdge(edgeConnection, edges));
          break;
        case 'alarm':
          setScenarioAlarmNodes((nodes) => [...nodes, node]);
          setScenarioAlarmEdges((edges) => addEdge(edgeConnection, edges));
          break;
        case 'onStop':
          setScenarioOnStopNodes((nodes) => [...nodes, node]);
          setScenarioOnStopEdges((edges) => addEdge(edgeConnection, edges));
          break;
        case 'onDisconnect':
          setScenarioOnDisconnectNodes((nodes) => [...nodes, node]);
          setScenarioOnDisconnectEdges((edges) => addEdge(edgeConnection, edges));
          break;
        case 'function':
          setScenarioFunctionNodes((nodes) => [...nodes, node]);
          setScenarioFunctionEdges((edges) => addEdge(edgeConnection, edges));
          break;
        default:
          break;
      }
    },
    [scenarioBranch],
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

  const updateCollectorConfig = useCallback(
    (nodeId: string, config: ScenarioCollectorConfig) => {
      patchNodeData(nodeId, { collectorConfig: resolveScenarioCollectorConfig(config) });
    },
    [patchNodeData],
  );

  const updateRecordingPolicy = useCallback(
    (nodeId: string, policy: ScenarioRecordingPolicy) => {
      patchNodeData(nodeId, { recordingPolicy: resolveScenarioRecordingPolicy(policy) });
    },
    [patchNodeData],
  );

  const updateFftTrendsPolicy = useCallback(
    (nodeId: string, policy: ScenarioFftTrendsPolicy) => {
      patchNodeData(nodeId, { fftTrendsPolicy: resolveScenarioFftTrendsPolicy(policy) });
    },
    [patchNodeData],
  );

  const updateCommentGroupMetadata = useCallback(
    (
      nodeId: string,
      patch: {
        readonly title?: string;
        readonly description?: string;
        readonly frameColor?: ScenarioCommentGroupFrameColor;
      },
    ) => {
      const dataPatch: Record<string, unknown> = {};
      if (patch.title !== undefined) {
        const trimmed = patch.title.trim();
        dataPatch.title = trimmed.length > 0 ? trimmed : 'Группа';
      }
      if (patch.description !== undefined) {
        const trimmed = patch.description.trim().slice(0, COMMENT_GROUP_DESCRIPTION_MAX_LENGTH);
        dataPatch.description = trimmed;
      }
      if (patch.frameColor !== undefined) {
        dataPatch.frameColor = resolveScenarioCommentGroupFrameColor(patch.frameColor);
      }
      const mapNodes = (nodes: Node[]) =>
        nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...dataPatch } } : node,
        );
      setSignalNodes(mapNodes);
      setScenarioInitialNodes(mapNodes);
      setScenarioOnConnectNodes(mapNodes);
      setScenarioMainNodes(mapNodes);
      setScenarioAlarmNodes(mapNodes);
      setScenarioOnStopNodes(mapNodes);
      setScenarioOnDisconnectNodes(mapNodes);
      setScenarioFunctionNodes(mapNodes);
    },
    [],
  );

  const setVariableGetterPure = useCallback(
    (nodeId: string, pure: boolean) => {
      const mapNodes = (nodes: Node[]) =>
        syncPureNodePins(
          nodes.map((node) => {
            if (node.id !== nodeId) {
              return node;
            }
            const kind = node.data?.nodeKind;
            if (typeof kind !== 'string' || !isPureEligibleScenarioNodeKind(kind)) {
              return node;
            }
            const nextData = { ...node.data };
            if (pure) {
              delete nextData.pure;
            } else {
              nextData.pure = false;
            }
            return { ...node, data: nextData };
          }),
          variables,
        );
      const mapEdges = (edges: Edge[]) =>
        pure ? stripExecEdgesForNodes(edges, new Set([nodeId])) : edges;

      setScenarioInitialNodes(mapNodes);
      setScenarioOnConnectNodes(mapNodes);
      setScenarioMainNodes(mapNodes);
      setScenarioAlarmNodes(mapNodes);
      setScenarioOnStopNodes(mapNodes);
      setScenarioOnDisconnectNodes(mapNodes);
      setScenarioFunctionNodes(mapNodes);
      setScenarioInitialEdges(mapEdges);
      setScenarioOnConnectEdges(mapEdges);
      setScenarioMainEdges(mapEdges);
      setScenarioAlarmEdges(mapEdges);
      setScenarioOnStopEdges(mapEdges);
      setScenarioOnDisconnectEdges(mapEdges);
      setScenarioFunctionEdges(mapEdges);
    },
    [variables],
  );

  const updateVariableValue = useCallback((variableId: string, value: ScenarioVariableValue | null) => {
    setVariables((current) =>
      current.map((variable) => (variable.id === variableId ? { ...variable, value } : variable)),
    );
  }, []);

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

  const inspectRuntimeNode = useCallback(
    (
      nodeId: string,
      branch: ScenarioBranchTab,
      nodes: readonly Node[],
      edges: readonly Edge[],
    ): NodePortInspectionResult | null => {
      const runtime = runtimeRef.current;
      if (runtime === null || !runtime.getState().isRunning) {
        return null;
      }
      const context = runtime.getInspectionResolveContext(branch);
      const variables = runtime.getVariables();
      return inspectNodePorts(nodeId, nodes, edges, variables, context);
    },
    [],
  );

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
      scenarioFunctionMeta,
      scenarioFunctionDrafts,
      activeFunctionId,
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
      pendingBranchImport,
      confirmBranchImport,
      cancelBranchImport,
      syncStatus,
      syncError,
      isDirty,
      saveScenario,
      startScenario,
      stopScenario,
      mode: runtimeState.mode,
      setMode,
      showInfoLogs,
      setShowInfoLogs,
      scenarioTraceLineCount,
      copyScenarioTrace,
      downloadScenarioTrace,
      clearCurrentBranch,
      addScenarioNodeToCurrentBranch,
      addPaletteNodeToCurrentBranch,
      addPaletteNodeWithConnection,
      updatePaletteNodeMicrophoneId,
      updateCollectorConfig,
      updateRecordingPolicy,
      updateFftTrendsPolicy,
      updateActiveFunctionMeta,
      addActiveFunctionPin,
      removeActiveFunctionPin,
      updateActiveFunctionPin,
      createUserFunction,
      selectUserFunction,
      collapseMarqueeToFunction,
      collapseMarqueeToCommentGroup,
      updateCommentGroupMetadata,
      setVariableGetterPure,
      updateVariableValue,
      variables,
      addVariable,
      renameVariable,
      removeVariable,
      addVariableNodeToCurrentBranch,
      assignNodeVariableName,
      inspectRuntimeNode,
    }),
    [
      addScenarioNodeToCurrentBranch,
      addPaletteNodeToCurrentBranch,
      addPaletteNodeWithConnection,
      updatePaletteNodeMicrophoneId,
      updateCollectorConfig,
      updateRecordingPolicy,
      updateFftTrendsPolicy,
      updateActiveFunctionMeta,
      addActiveFunctionPin,
      removeActiveFunctionPin,
      updateActiveFunctionPin,
      createUserFunction,
      selectUserFunction,
      collapseMarqueeToFunction,
      collapseMarqueeToCommentGroup,
      updateCommentGroupMetadata,
      setVariableGetterPure,
      updateVariableValue,
      addVariable,
      addVariableNodeToCurrentBranch,
      assignNodeVariableName,
      canRun,
      clearCurrentBranch,
      deviceKind,
      exportJson,
      importJsonFile,
      pendingBranchImport,
      confirmBranchImport,
      cancelBranchImport,
      inspectRuntimeNode,
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
      activeFunctionId,
      scenarioAlarmEdges,
      scenarioAlarmNodes,
      scenarioBranch,
      scenarioFunctionDrafts,
      scenarioFunctionMeta,
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
      copyScenarioTrace,
      downloadScenarioTrace,
      scenarioTraceLineCount,
      setShowInfoLogs,
      showInfoLogs,
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
