import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyEdgeChanges,
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
  DEFAULT_COMPETITION_TIMEOUT_SEC,
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
  type ScenarioSequenceConfig,
  type ScenarioAsyncJobNodeConfig,
  resolveScenarioSequenceConfig,
  resolveScenarioAsyncJobNodeConfig,
  type ScenarioVariable,
  type ScenarioVariableType,
  type ScenarioVariableValue,
  isPureEligibleScenarioNodeKind,
  canonicalizeScenarioFunctionPinOrder,
  createDefaultFunctionExecInputPin,
  createDefaultFunctionExecOutputPin,
} from '@membrana/core';

import type { ScenarioCommentGroupBranch, ScenarioCommentGroupFrameColor, SocketType } from '@membrana/core';
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
  deviceScenarioExportFilename,
  downloadDeviceScenarioJson,
  getDefaultMvpMicrophoneDocument,
  hydrateBoardFromDocument,
  importDeviceScenarioFromJson,
  applyBranchScenarioImport,
  applyUserCaseDocument,
  parseBranchScenarioExportJson,
  prepareUserCaseApply,
  suggestReferenceVariableMapping,
  isReferenceMappingComplete,
  isPreRunValid,
  isValidBoardConnection,
  rejectSystemNodeRemovals,
  isLockedBoardNode,
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
  applyBoardNodeChangesWithCommentGroupDissolve,
  applyBranchNodeRemovals,
  buildCommentGroupDataPatch,
  patchCommentGroupNodeData,
  collectCommentGroupNodeIdsFromBoard,
  cloneBoardSelectionForPaste,
  collectBoardSelectionNodeIds,
  extractBoardSelectionClipboard,
  isBoardSelectionCopyEligibleNode,
  type BoardSelectionClipboard,
  shouldMigrateMicrophoneScenarioToBundledMvp,
  stampUserWorkspaceDocument,
  stampSystemPreviewDocument,
  resolveCompetitionExecutionPolicy,
  isCompetitionStructureLocked,
  createEmptyFunctionDraft,
  type VariableNodeKind,
  type V04PaletteNodeKind,
  type BranchScenarioExport,
  type ReferenceVariableSlot,
  type HydratedBoardState,
  type PreRunValidationIssue,
  type ScenarioFunctionDraft,
  type ScenarioFunctionCanvasMeta,
  insertFunctionSubgraphBlock,
  removeUserFunctionDraft,
} from '../graph/index.js';
import { stripSubgraphBlocksForFunctionOccurrence } from '../graph/remove-user-function.js';
import { isScenarioBranchForFunctionInsert } from '../types/board-ui.js';
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
import { addBoardEdge, dedupeBoardEdges } from '../graph/dedupe-board-edges.js';
import {
  applySequenceConfigToNodeData,
  pruneSequenceThenEdges,
} from '../graph/sequence-node.js';
import { isBoardFlowNodeData } from '../graph/board-node-data.js';
import {
  logBoardClipboardStep,
  planNodeRemovalUndo,
  type BoardEditStepAction,
} from '../graph/edit-step-log.js';
import { useEditUndoController } from '../graph/edit-undo-controller.js';
import {
  inFunctionLayerRevertPolicy,
  planBranchNavigation,
  sidebarHandlerRevertPolicy,
  type ScenarioRevertPolicy,
} from '../graph/branch-navigation.js';
import type { DeviceBoardPersistAdapter } from '../persist/device-board-persist.js';
import { isDeviceBoardPersistConflict } from '../persist/device-board-persist.js';
import type {
  DeviceBoardWorkspaceHost,
  DeviceBoardWorkspaceListItem,
} from '../persist/device-board-workspace-host.js';
import type { DeviceBoardSession } from '../types/device-board-session.js';
import { isDeviceBoardSessionReadOnly } from '../types/device-board-session.js';
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

/** Результат apply UserCase: success | текст ошибки | нужен ref-mapping modal. */
export type ApplyUserCaseOutcome =
  | null
  | string
  | {
      readonly kind: 'needs-mapping';
      readonly title: string;
      readonly slots: readonly ReferenceVariableSlot[];
      readonly mapping: Record<string, string>;
    };

/** Результат collapse marquee → comment group (CGF G1). */
export interface CollapseMarqueeToCommentGroupResult {
  readonly error: string | null;
  /** Созданная group-нода с selected: true — для фокуса инспектора. */
  readonly groupNode: Node | null;
}

export type InsertUserFunctionIntoBranchResult =
  | { readonly ok: true; readonly nodeId: string }
  | { readonly ok: false; readonly message: string };

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
  readonly activeFunctionDraftIndex: number;
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
  /** D-BRANCH-SNAPSHOT: откат к последнему сохранённому document, если isDirty. */
  readonly revertToSavedDocumentIfDirty: () => void;
  /** D-UNDO-1: снимок перед последней mutating op; depth=1. */
  readonly captureEditUndoSnapshot: (
    action: BoardEditStepAction,
    meta?: Record<string, unknown>,
  ) => void;
  readonly undoLastEdit: () => boolean;
  readonly canUndoLastEdit: boolean;
  readonly lastUndoableEditLabel: string | null;
  /** Сброс pending undo без restore (навигация из тела функции). */
  readonly forgetPendingEditUndo: (reason: string) => void;
  readonly refreshValidation: () => readonly PreRunValidationIssue[];
  /** Signal — полный документ; scenario — только активная ветка-обработчик. */
  readonly exportJson: (layer?: BoardLayerTab) => Promise<void>;
  /** Полный `device-scenario` (все ветки + `functions[]`), независимо от активного слоя. */
  readonly exportFullUserCaseJson: () => Promise<void>;
  readonly importJsonFile: (file: File) => Promise<string | null>;
  /** Ожидает сопоставления ссылочных переменных после импорта branch-scenario. */
  readonly pendingBranchImport: PendingBranchImportState | null;
  readonly confirmBranchImport: (mapping: Readonly<Record<string, string>>) => string | null;
  readonly cancelBranchImport: () => void;
  /** Apply-all UserCase (U9 P1): null = ok; string = error; needs-mapping → ref modal. */
  readonly applyUserCase: (
    userCaseId: string,
    mapping?: Readonly<Record<string, string>>,
  ) => ApplyUserCaseOutcome;
  readonly syncStatus: 'idle' | 'loading' | 'saving' | 'error';
  readonly syncError: string | null;
  readonly syncConflict: boolean;
  /** Черновик отличается от последнего сохранённого снимка. */
  readonly isDirty: boolean;
  /** Сохранить сценарий на сервер / в persist-адаптер (только по явному клику). */
  readonly saveScenario: () => Promise<boolean>;
  /** Перезагрузить активный workspace с сервера (после conflict 409). */
  readonly reloadScenarioFromServer: () => Promise<boolean>;
  /** U10 W2: user workspace slots (undefined host → поля no-op). */
  readonly workspaceEnabled: boolean;
  readonly isSessionReadOnly: boolean;
  /** Competition mode: block structure edits (delete, paste, collapse). */
  readonly isStructureLocked: boolean;
  readonly isCompetitionMode: boolean;
  readonly competitionTimeoutSec: number;
  readonly sessionTitle: string | null;
  readonly workspaceList: readonly DeviceBoardWorkspaceListItem[];
  readonly activeWorkspaceId: string | null;
  readonly maxUserWorkspaces: number;
  readonly refreshWorkspaces: () => Promise<void>;
  readonly switchWorkspace: (workspaceId: string) => Promise<string | null>;
  readonly createEmptyWorkspace: (title?: string) => Promise<string | null>;
  readonly renameWorkspace: (workspaceId: string, title: string) => Promise<string | null>;
  readonly deleteWorkspace: (workspaceId: string) => Promise<string | null>;
  readonly startScenario: () => Promise<void>;
  readonly stopScenario: (reason?: ScenarioStopReason) => void;
  readonly pauseScenario: () => void;
  readonly resumeScenario: () => void;
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
  /** W0-H2: copy selected scenario nodes to in-memory clipboard. */
  readonly copyBoardSelection: (options?: {
    readonly forcedSelectedIds?: readonly string[];
    readonly branchNodes?: readonly Node[];
    readonly branchEdges?: readonly Edge[];
  }) => number | null;
  /** W0-H2: paste clipboard into active scenario branch (anchor = flow coords under cursor). */
  readonly pasteBoardSelection: (anchorFlowPosition?: {
    readonly x: number;
    readonly y: number;
  }) => readonly string[] | null;
  readonly hasBoardSelectionClipboard: boolean;
  readonly boardClipboardNodeCount: number;
  /** Очищает in-memory буфер copy/paste узлов доски. */
  readonly clearBoardClipboard: () => void;
  /** Удаляет узлы с текущей ветки (не locked/system). Возвращает число удалённых. */
  readonly removeNodesFromCurrentBranch: (nodeIds: readonly string[]) => number;
  /** v0.4 DBR5: обновить выбранный микрофон на узле get-microphone. */
  readonly updatePaletteNodeMicrophoneId: (nodeId: string, microphoneId: string) => void;
  /** v0.5 DBC3: обновить collectorConfig на Collect-узле. */
  readonly updateCollectorConfig: (nodeId: string, config: ScenarioCollectorConfig) => void;
  /** v0.8 A3: обновить recordingPolicy на MakeRecordingPolicy / StartRecording / IsRecordingWindowFull. */
  readonly updateRecordingPolicy: (nodeId: string, policy: ScenarioRecordingPolicy) => void;
  /** v0.8 B0: обновить fftTrendsPolicy на MakeFftTrendsPolicy. */
  readonly updateFftTrendsPolicy: (nodeId: string, policy: ScenarioFftTrendsPolicy) => void;
  readonly updateSequenceConfig: (nodeId: string, config: ScenarioSequenceConfig) => void;
  /** AP v1: asyncJobConfig на promise orchestration nodes. */
  readonly updateAsyncJobConfig: (nodeId: string, config: ScenarioAsyncJobNodeConfig) => void;
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
  /** Переименование / описание пользовательской функции (активной или по id с handler-веток). */
  readonly updateUserFunctionMeta: (
    functionId: string,
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
  readonly selectUserFunction: (functionId: string, draftIndex?: number) => void;
  /** Удаляет пользовательскую функцию и её subgraph-блоки со всех веток. */
  readonly removeUserFunction: (functionId: string, draftIndex?: number) => string | null;
  /** Вставляет subgraph-блок функции на указанную ветку (без автосвязки). */
  readonly insertUserFunctionIntoBranch: (
    functionId: string,
    branch: ScenarioBranchTab,
    position?: { readonly x: number; readonly y: number },
  ) => InsertUserFunctionIntoBranchResult;
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
    branch: ScenarioCommentGroupBranch,
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
  /** Загрузка entitled UserCase document (client catalog). */
  readonly loadUserCaseDocument?: (id: string) => DeviceScenarioDocument | null;
  /** CRUD user workspace (client IndexedDB). */
  readonly workspaceHost?: DeviceBoardWorkspaceHost;
  /** Сессия из DeviceBoardModule launcher (U10 W2-module). */
  readonly boardSession?: DeviceBoardSession | null;
}

export const DeviceBoardGraphProvider: React.FC<DeviceBoardGraphProviderProps> = ({
  children,
  deviceKind: deviceKindProp = 'microphone',
  runtimeHost,
  persistAdapter,
  initialHydratedState,
  deviceLive,
  loadUserCaseDocument,
  workspaceHost,
  boardSession = null,
}) => {
  const isSessionReadOnly = isDeviceBoardSessionReadOnly(boardSession);
  const structureLockRef = useRef({
    locked: isSessionReadOnly,
    competition: false,
    timeoutSec: DEFAULT_COMPETITION_TIMEOUT_SEC,
  });

  const defaultState = useMemo(
    () => initialHydratedState ?? createDefaultHydratedBoardState(deviceKindProp),
    [deviceKindProp, initialHydratedState],
  );

  const [deviceKind, setDeviceKind] = useState<DeviceKind>(defaultState.deviceKind);
  const [signalNodes, setSignalNodes] = useState<Node[]>(defaultState.signalNodes);
  const [signalEdges, setSignalEdges] = useState<Edge[]>(defaultState.signalEdges);
  const [scenarioBranch, setScenarioBranchState] = useState<ScenarioBranchTab>('initial');
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
  const [activeFunctionDraftIndex, setActiveFunctionDraftIndex] = useState(0);
  const [variables, setVariables] = useState<readonly ScenarioVariable[]>(defaultState.variables);
  const [pendingBranchImport, setPendingBranchImport] = useState<PendingBranchImportState | null>(
    null,
  );
  const [validationIssues, setValidationIssues] = useState<readonly PreRunValidationIssue[]>([]);
  const [runtimeState, setRuntimeState] = useState<ScenarioRuntimeState>(createIdleScenarioRuntimeState());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncConflict, setSyncConflict] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showInfoLogs, setShowInfoLogs] = useState(true);
  const [scenarioTraceLineCount, setScenarioTraceLineCount] = useState(0);
  const [workspaceList, setWorkspaceList] = useState<readonly DeviceBoardWorkspaceListItem[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  const runtimeRef = useRef<ScenarioRuntime | null>(null);
  const boardClipboardRef = useRef<BoardSelectionClipboard | null>(null);
  const [hasBoardSelectionClipboard, setHasBoardSelectionClipboard] = useState(false);
  const [boardClipboardNodeCount, setBoardClipboardNodeCount] = useState(0);
  const savedSnapshotRef = useRef<string | null>(null);
  const savedDocumentRef = useRef<DeviceScenarioDocument | null>(null);
  const showInfoLogsRef = useRef(showInfoLogs);
  const buildDocumentRef = useRef<(() => DeviceScenarioDocument) | null>(null);
  const buildHydratedSnapshotRef = useRef<(() => HydratedBoardState) | null>(null);
  const runValidationRef = useRef<() => readonly PreRunValidationIssue[]>(() => []);
  const skipDirtyRef = useRef(false);
  const applyHydratedStateRef = useRef<(state: HydratedBoardState) => void>(() => {});
  /** После hydrate/load: baseline снимается из buildDocument() на следующем commit state. */
  const pendingBaselineRef = useRef(false);

  const recalcDirtyAfterSkip = useCallback(() => {
    window.setTimeout(() => {
      skipDirtyRef.current = false;
      const build = buildDocumentRef.current;
      const saved = savedSnapshotRef.current;
      if (build === null || saved === null) {
        return;
      }
      setIsDirty(scenarioDocumentFingerprint(build()) !== saved);
    }, 0);
  }, []);

  const {
    canUndoLastEdit,
    lastUndoableEditLabel,
    clearEditUndoSnapshot,
    captureEditUndoSnapshot,
    undoLastEdit,
    forgetPendingEditUndo,
  } = useEditUndoController({
    isRuntimeRunning: runtimeState.isRunning,
    showInfoLogsRef,
    buildHydratedSnapshotRef,
    applyHydratedStateRef,
    runValidationRef,
    recalcDirtyAfterSkip,
    skipDirtyRef,
  });

  const markSavedSnapshot = useCallback((document: DeviceScenarioDocument) => {
    savedSnapshotRef.current = scenarioDocumentFingerprint(document);
    savedDocumentRef.current = structuredClone(document);
    clearEditUndoSnapshot();
    setIsDirty(false);
  }, [clearEditUndoSnapshot]);

  useEffect(() => {
    runtimeHost?.setInfoLoggingEnabled?.(showInfoLogs);
    showInfoLogsRef.current = showInfoLogs;
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
    clearEditUndoSnapshot();
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
    setActiveFunctionDraftIndex(
      Math.max(0, state.scenarioFunctionDrafts.findIndex((draft) => draft.id === state.activeFunctionId)),
    );
    setVariables(state.variables);
    window.setTimeout(() => {
      skipDirtyRef.current = false;
    }, 0);
  }, [clearEditUndoSnapshot]);

  applyHydratedStateRef.current = applyHydratedState;

  const revertToSavedDocumentIfDirty = useCallback(() => {
    const build = buildDocumentRef.current;
    const saved = savedDocumentRef.current;
    if (build === null || saved === null || savedSnapshotRef.current === null) {
      return;
    }
    if (skipDirtyRef.current || syncStatus === 'loading') {
      return;
    }
    const dirty = scenarioDocumentFingerprint(build()) !== savedSnapshotRef.current;
    if (!dirty) {
      return;
    }
    clearEditUndoSnapshot();
    skipDirtyRef.current = true;
    applyHydratedState(hydrateBoardFromDocument(structuredClone(saved)));
    markSavedSnapshot(saved);
    runValidationRef.current();
    window.setTimeout(() => {
      skipDirtyRef.current = false;
    }, 0);
  }, [applyHydratedState, clearEditUndoSnapshot, markSavedSnapshot, syncStatus]);

  const navigateScenarioBranch = useCallback(
    (branch: ScenarioBranchTab, revertPolicy: ScenarioRevertPolicy) => {
      const plan = planBranchNavigation(scenarioBranch, branch, revertPolicy);
      if (plan.shouldRevertIfDirty) {
        revertToSavedDocumentIfDirty();
      }
      if (plan.undoClearReason !== null) {
        forgetPendingEditUndo(plan.undoClearReason);
      }
      if (plan.shouldChangeBranch) {
        setScenarioBranchState(branch);
      }
    },
    [forgetPendingEditUndo, revertToSavedDocumentIfDirty, scenarioBranch],
  );

  useEffect(() => {
    let cancelled = false;

    const finishIdle = (): void => {
      if (!cancelled) {
        setSyncStatus('idle');
      }
    };

    const failLoad = (error: unknown): void => {
      if (cancelled) {
        return;
      }
      setSyncStatus('error');
      setSyncConflict(false);
      setSyncError(error instanceof Error ? error.message : 'Не удалось загрузить сценарий');
    };

    if (boardSession?.kind === 'system-preview') {
      if (loadUserCaseDocument === undefined) {
        failLoad(new Error('Каталог UserCase недоступен'));
        return () => {
          cancelled = true;
        };
      }
      setSyncStatus('loading');
      setSyncError(null);
      setSyncConflict(false);
      const catalogDocument = loadUserCaseDocument(boardSession.userCaseId);
      if (catalogDocument === null) {
        failLoad(new Error('UserCase недоступен'));
        return () => {
          cancelled = true;
        };
      }
      const document = stampSystemPreviewDocument(catalogDocument, boardSession.title);
      savedDocumentRef.current = structuredClone(document);
      applyHydratedState(hydrateBoardFromDocument(document));
      pendingBaselineRef.current = true;
      markSavedSnapshot(document);
      finishIdle();
      return () => {
        cancelled = true;
      };
    }

    if (persistAdapter === undefined) {
      return;
    }
    setSyncStatus('loading');
    setSyncError(null);
    setSyncConflict(false);
    void persistAdapter
      .load()
      .then((record) => {
        if (cancelled) return;
        if (record !== null) {
          let document = record.document;
          if (shouldMigrateMicrophoneScenarioToBundledMvp(document)) {
            document = getDefaultMvpMicrophoneDocument();
            savedDocumentRef.current = null;
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
          } else {
            savedDocumentRef.current = structuredClone(document);
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
        finishIdle();
      })
      .catch(failLoad);
    return () => {
      cancelled = true;
    };
  }, [
    applyHydratedState,
    boardSession,
    defaultState,
    deviceKindProp,
    loadUserCaseDocument,
    markSavedSnapshot,
    persistAdapter,
  ]);

  const loadFunctionDraftToCanvas = useCallback(
    (draft: ScenarioFunctionDraft, draftIndex?: number) => {
      setScenarioFunctionNodes([...draft.nodes]);
      setScenarioFunctionEdges(dedupeBoardEdges(draft.edges));
      setScenarioFunctionMeta({
        id: draft.id,
        name: draft.name,
        entry: draft.entry,
        description: draft.description,
        inputPins: draft.inputPins,
        outputPins: draft.outputPins,
      });
      setActiveFunctionId(draft.id);
      setActiveFunctionDraftIndex(
        draftIndex ?? scenarioFunctionDrafts.findIndex((item) => item.id === draft.id),
      );
    },
    [scenarioFunctionDrafts],
  );

  const commitActiveFunctionDraft = useCallback(
    (drafts: readonly ScenarioFunctionDraft[]): readonly ScenarioFunctionDraft[] =>
      drafts.map((draft, index) =>
        index === activeFunctionDraftIndex && draft.id === activeFunctionId
          ? {
              ...draft,
              name: scenarioFunctionMeta.name,
              entry: scenarioFunctionMeta.entry,
              description: scenarioFunctionMeta.description,
              inputPins: canonicalizeScenarioFunctionPinOrder(
                scenarioFunctionMeta.inputPins,
                createDefaultFunctionExecInputPin(),
              ),
              outputPins: canonicalizeScenarioFunctionPinOrder(
                scenarioFunctionMeta.outputPins,
                createDefaultFunctionExecOutputPin(),
              ),
              nodes: scenarioFunctionNodes,
              edges: dedupeBoardEdges(scenarioFunctionEdges),
            }
          : draft,
      ),
    [
      activeFunctionDraftIndex,
      activeFunctionId,
      scenarioFunctionEdges,
      scenarioFunctionMeta,
      scenarioFunctionNodes,
    ],
  );

  const setScenarioBranch = useCallback(
    (branch: ScenarioBranchTab) => {
      if (scenarioBranch === 'function' && branch !== 'function') {
        setScenarioFunctionDrafts((drafts) => commitActiveFunctionDraft(drafts));
        navigateScenarioBranch(branch, inFunctionLayerRevertPolicy());
        return;
      }
      navigateScenarioBranch(branch, sidebarHandlerRevertPolicy());
    },
    [commitActiveFunctionDraft, navigateScenarioBranch, scenarioBranch],
  );

  const selectUserFunction = useCallback(
    (functionId: string, draftIndex?: number) => {
      const committed = commitActiveFunctionDraft(scenarioFunctionDrafts);
      const targetIndex =
        draftIndex ?? committed.findIndex((draft) => draft.id === functionId);
      const target = targetIndex >= 0 ? committed[targetIndex] : undefined;
      if (target === undefined) {
        return;
      }
      setScenarioFunctionDrafts(committed);
      if (targetIndex !== activeFunctionDraftIndex || functionId !== activeFunctionId) {
        forgetPendingEditUndo('switch-function');
      }
      if (
        targetIndex !== activeFunctionDraftIndex ||
        functionId !== activeFunctionId ||
        scenarioBranch !== 'function'
      ) {
        loadFunctionDraftToCanvas(target, targetIndex);
      }
      if (scenarioBranch === 'function') {
        navigateScenarioBranch('function', inFunctionLayerRevertPolicy());
      } else {
        navigateScenarioBranch('function', sidebarHandlerRevertPolicy());
      }
    },
    [
      activeFunctionDraftIndex,
      activeFunctionId,
      commitActiveFunctionDraft,
      forgetPendingEditUndo,
      loadFunctionDraftToCanvas,
      navigateScenarioBranch,
      scenarioBranch,
      scenarioFunctionDrafts,
    ],
  );

  const createUserFunction = useCallback(() => {
    const committed = commitActiveFunctionDraft(scenarioFunctionDrafts);
    forgetPendingEditUndo('create-function');
    let seq = committed.length + 1;
    while (committed.some((draft) => draft.id === `fn-${seq}`)) {
      seq += 1;
    }
    const id = `fn-${seq}`;
    const draft = createEmptyFunctionDraft(id, `Function ${seq}`);
    setScenarioFunctionDrafts([...committed, draft]);
    loadFunctionDraftToCanvas(draft, committed.length);
    navigateScenarioBranch(
      'function',
      scenarioBranch === 'function' ? inFunctionLayerRevertPolicy() : sidebarHandlerRevertPolicy(),
    );
  }, [
    commitActiveFunctionDraft,
    forgetPendingEditUndo,
    loadFunctionDraftToCanvas,
    navigateScenarioBranch,
    scenarioBranch,
    scenarioFunctionDrafts,
  ]);

  const removeUserFunction = useCallback(
    (functionId: string, draftIndex?: number): string | null => {
      const committed =
        functionId === activeFunctionId
          ? commitActiveFunctionDraft(scenarioFunctionDrafts)
          : scenarioFunctionDrafts;
      const resolvedIndex =
        draftIndex ??
        committed.findIndex((draft) => draft.id === functionId);
      if (resolvedIndex < 0) {
        return 'Функция не найдена';
      }
      const removedIndex = resolvedIndex;
      const { drafts, removed } = removeUserFunctionDraft({
        functionId,
        drafts: committed,
        draftIndex: removedIndex,
      });
      if (!removed) {
        return 'Функция не найдена';
      }
      captureEditUndoSnapshot('remove-function', { functionId, draftIndex: removedIndex });

      const branchGraphs = [
        { nodes: scenarioInitialNodes, edges: scenarioInitialEdges },
        { nodes: scenarioOnConnectNodes, edges: scenarioOnConnectEdges },
        { nodes: scenarioMainNodes, edges: scenarioMainEdges },
        { nodes: scenarioAlarmNodes, edges: scenarioAlarmEdges },
        { nodes: scenarioOnStopNodes, edges: scenarioOnStopEdges },
        { nodes: scenarioOnDisconnectNodes, edges: scenarioOnDisconnectEdges },
      ];
      const occurrence =
        committed.slice(0, removedIndex).filter((draft) => draft.id === functionId).length;
      stripSubgraphBlocksForFunctionOccurrence(branchGraphs, functionId, occurrence);

      setScenarioInitialNodes([...branchGraphs[0]!.nodes]);
      setScenarioInitialEdges([...branchGraphs[0]!.edges]);
      setScenarioOnConnectNodes([...branchGraphs[1]!.nodes]);
      setScenarioOnConnectEdges([...branchGraphs[1]!.edges]);
      setScenarioMainNodes([...branchGraphs[2]!.nodes]);
      setScenarioMainEdges([...branchGraphs[2]!.edges]);
      setScenarioAlarmNodes([...branchGraphs[3]!.nodes]);
      setScenarioAlarmEdges([...branchGraphs[3]!.edges]);
      setScenarioOnStopNodes([...branchGraphs[4]!.nodes]);
      setScenarioOnStopEdges([...branchGraphs[4]!.edges]);
      setScenarioOnDisconnectNodes([...branchGraphs[5]!.nodes]);
      setScenarioOnDisconnectEdges([...branchGraphs[5]!.edges]);

      setScenarioFunctionDrafts(drafts);

      if (removedIndex < activeFunctionDraftIndex) {
        setActiveFunctionDraftIndex(activeFunctionDraftIndex - 1);
      }

      if (scenarioBranch === 'function' && committed[removedIndex]?.id === activeFunctionId) {
        if (drafts.length > 0) {
          const nextIndex = Math.min(
            removedIndex >= 0 ? removedIndex : 0,
            drafts.length - 1,
          );
          loadFunctionDraftToCanvas(drafts[nextIndex]!, nextIndex);
          navigateScenarioBranch('function', inFunctionLayerRevertPolicy());
        } else {
          setScenarioFunctionNodes([]);
          setScenarioFunctionEdges([]);
          setActiveFunctionId('');
          setScenarioBranch('main');
        }
      }

      return null;
    },
    [
      activeFunctionDraftIndex,
      activeFunctionId,
      captureEditUndoSnapshot,
      commitActiveFunctionDraft,
      loadFunctionDraftToCanvas,
      navigateScenarioBranch,
      scenarioAlarmEdges,
      scenarioAlarmNodes,
      scenarioBranch,
      scenarioFunctionDrafts,
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
      setScenarioBranch,
    ],
  );

  const syncSubgraphBlocksForFunctionMeta = useCallback(
    (input: {
      readonly functionId: string;
      readonly functionName: string;
      readonly inputPins: ScenarioFunctionCanvasMeta['inputPins'];
      readonly outputPins: ScenarioFunctionCanvasMeta['outputPins'];
    }) => {
      const payload = {
        functionId: input.functionId,
        functionName: input.functionName,
        inputPins: input.inputPins,
        outputPins: input.outputPins,
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

  const updateUserFunctionMeta = useCallback(
    (functionId: string, patch: Partial<Pick<ScenarioFunctionCanvasMeta, 'name' | 'description'>>) => {
      const draft = scenarioFunctionDrafts.find((item) => item.id === functionId);
      if (draft === undefined) {
        return;
      }

      const baseMeta: ScenarioFunctionCanvasMeta =
        functionId === activeFunctionId
          ? scenarioFunctionMeta
          : {
              id: draft.id,
              name: draft.name,
              description: draft.description,
              inputPins: draft.inputPins,
              outputPins: draft.outputPins,
              entry: draft.entry,
            };

      const nextName =
        patch.name !== undefined
          ? patch.name.trim().length > 0
            ? patch.name.trim()
            : baseMeta.name
          : baseMeta.name;
      const nextDescription =
        patch.description !== undefined ? patch.description : baseMeta.description;
      const nextMeta: ScenarioFunctionCanvasMeta = {
        ...baseMeta,
        ...patch,
        name: nextName,
        description: nextDescription,
      };

      if (patch.name !== undefined && nextName !== baseMeta.name) {
        syncSubgraphBlocksForFunctionMeta({
          functionId,
          functionName: nextName,
          inputPins: nextMeta.inputPins,
          outputPins: nextMeta.outputPins,
        });
      }

      setScenarioFunctionDrafts((drafts) =>
        drafts.map((item) =>
          item.id === functionId
            ? { ...item, name: nextMeta.name, description: nextMeta.description }
            : item,
        ),
      );

      if (functionId === activeFunctionId) {
        setScenarioFunctionMeta((meta) => ({
          ...meta,
          ...patch,
          name: nextMeta.name,
          description: nextMeta.description,
        }));
      }
    },
    [
      activeFunctionId,
      scenarioFunctionDrafts,
      scenarioFunctionMeta,
      syncSubgraphBlocksForFunctionMeta,
    ],
  );

  const updateActiveFunctionMeta = useCallback(
    (patch: Partial<Pick<ScenarioFunctionCanvasMeta, 'name' | 'description'>>) => {
      updateUserFunctionMeta(activeFunctionId, patch);
    },
    [activeFunctionId, updateUserFunctionMeta],
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
      setScenarioFunctionEdges(dedupeBoardEdges(syncedFunctionEdges));

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
      captureEditUndoSnapshot('add-function-pin', { side, kind });
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
    [applyActiveFunctionPinState, captureEditUndoSnapshot, scenarioFunctionEdges, scenarioFunctionMeta],
  );

  const removeActiveFunctionPin = useCallback(
    (side: FunctionPinSide, pinId: string): string | null => {
      const pins = side === 'input' ? scenarioFunctionMeta.inputPins : scenarioFunctionMeta.outputPins;
      const next = removeFunctionPinFromList(pins, pinId);
      if ('error' in next) {
        return next.error;
      }
      captureEditUndoSnapshot('remove-function-pin', { side, pinId });
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
    [applyActiveFunctionPinState, captureEditUndoSnapshot, scenarioFunctionEdges, scenarioFunctionMeta],
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
      const nextEdges = dedupeBoardEdges(edges);
      switch (branch) {
        case 'initial':
          setScenarioInitialNodes(nodes);
          setScenarioInitialEdges(nextEdges);
          break;
        case 'onConnect':
          setScenarioOnConnectNodes(nodes);
          setScenarioOnConnectEdges(nextEdges);
          break;
        case 'main':
          setScenarioMainNodes(nodes);
          setScenarioMainEdges(nextEdges);
          break;
        case 'alarm':
          setScenarioAlarmNodes(nodes);
          setScenarioAlarmEdges(nextEdges);
          break;
        case 'onStop':
          setScenarioOnStopNodes(nodes);
          setScenarioOnStopEdges(nextEdges);
          break;
        case 'onDisconnect':
          setScenarioOnDisconnectNodes(nodes);
          setScenarioOnDisconnectEdges(nextEdges);
          break;
        case 'function':
          setScenarioFunctionNodes(nodes);
          setScenarioFunctionEdges(nextEdges);
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
      if (structureLockRef.current.locked) {
        return structureLockRef.current.competition
          ? 'Конкурсный сценарий: структура заблокирована'
          : 'Режим только просмотра';
      }
      if (branch === 'function') {
        return 'Объединение доступно только на ветках сценария';
      }
      const { nodes: branchNodes, edges: branchEdges } = readScenarioBranchGraph(branch);
      const committed = commitActiveFunctionDraft(scenarioFunctionDrafts);
      const result = collapseSelectionToFunction({
        selectedNodeIds,
        branchNodes,
        branchEdges,
        existingFunctionIds: committed.map((draft) => draft.id),
      });
      if (!result.ok) {
        return result.message;
      }
      captureEditUndoSnapshot('collapse-to-function', { branch, selectedCount: selectedNodeIds.length });
      setScenarioFunctionDrafts([...committed, result.functionDraft]);
      applyScenarioBranchGraph(branch, result.branchNodes, result.branchEdges);
      loadFunctionDraftToCanvas(result.functionDraft, committed.length);
      navigateScenarioBranch('function', inFunctionLayerRevertPolicy());
      return null;
    },
    [
      applyScenarioBranchGraph,
      captureEditUndoSnapshot,
      commitActiveFunctionDraft,
      loadFunctionDraftToCanvas,
      navigateScenarioBranch,
      readScenarioBranchGraph,
      scenarioFunctionDrafts,
    ],
  );

  const collapseMarqueeToCommentGroup = useCallback(
    (branch: ScenarioCommentGroupBranch, selectedNodeIds: readonly string[]): CollapseMarqueeToCommentGroupResult => {
      if (structureLockRef.current.locked) {
        return {
          error: structureLockRef.current.competition
            ? 'Конкурсный сценарий: структура заблокирована'
            : 'Режим только просмотра',
          groupNode: null,
        };
      }
      const branchNodes = branch === 'signal' ? signalNodes : readScenarioBranchGraph(branch).nodes;
      const branchEdges =
        branch === 'signal' ? signalEdges : readScenarioBranchGraph(branch).edges;
      const reservedGroupIds = collectCommentGroupNodeIdsFromBoard({
        signalNodes,
        scenarioInitialNodes,
        scenarioOnConnectNodes,
        scenarioMainNodes,
        scenarioAlarmNodes,
        scenarioOnStopNodes,
        scenarioOnDisconnectNodes,
        scenarioFunctionNodes,
      });
      const result = collapseSelectionToCommentGroup({
        branch,
        selectedNodeIds,
        branchNodes,
        reservedGroupIds,
      });
      if (!result.ok) {
        return { error: result.message, groupNode: null };
      }
      captureEditUndoSnapshot('collapse-to-group', { branch, selectedCount: selectedNodeIds.length });
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
      captureEditUndoSnapshot,
      readScenarioBranchGraph,
      signalEdges,
      signalNodes,
      scenarioAlarmNodes,
      scenarioFunctionNodes,
      scenarioInitialNodes,
      scenarioMainNodes,
      scenarioOnConnectNodes,
      scenarioOnDisconnectNodes,
      scenarioOnStopNodes,
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
    const built = buildDeviceScenarioDocument({
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
    const persistedMeta = savedDocumentRef.current?.meta;
    if (persistedMeta === undefined) {
      return built;
    }
    return {
      ...built,
      meta: {
        ...built.meta,
        ...persistedMeta,
      },
    };
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
      variables,
    });
    setValidationIssues(issues);
    return issues;
  }, [buildHydratedSnapshot, deviceKind, scenarioAlarmEdges, scenarioAlarmNodes, scenarioInitialEdges, scenarioInitialNodes, scenarioOnConnectEdges, scenarioOnConnectNodes, scenarioMainEdges, scenarioMainNodes, scenarioOnDisconnectEdges, scenarioOnDisconnectNodes, scenarioOnStopEdges, scenarioOnStopNodes, signalEdges, signalNodes, variables]);

  const refreshValidation = useCallback((): readonly PreRunValidationIssue[] => {
    return runValidation();
  }, [runValidation]);

  useEffect(() => {
    buildDocumentRef.current = buildDocument;
    buildHydratedSnapshotRef.current = buildHydratedSnapshot;
    runValidationRef.current = runValidation;
  }, [buildDocument, buildHydratedSnapshot, runValidation]);

  const scenarioPolicy = useMemo(() => {
    const meta = buildDocument().meta;
    const competition = resolveCompetitionExecutionPolicy(meta);
    return {
      isCompetitionMode: competition !== null,
      competitionTimeoutSec: competition?.timeoutSec ?? DEFAULT_COMPETITION_TIMEOUT_SEC,
      isStructureLocked: isSessionReadOnly || isCompetitionStructureLocked(meta),
    };
  }, [buildDocument, isSessionReadOnly]);

  useEffect(() => {
    structureLockRef.current = {
      locked: scenarioPolicy.isStructureLocked,
      competition: scenarioPolicy.isCompetitionMode,
      timeoutSec: scenarioPolicy.competitionTimeoutSec,
    };
  }, [scenarioPolicy]);

  const onSignalNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const plan = planNodeRemovalUndo(changes, signalNodes, false);
      if (plan.shouldCapture) {
        captureEditUndoSnapshot('remove-nodes', { layer: 'signal', nodeIds: plan.nodeIds });
      }
      setSignalNodes((nodes) =>
        applyBoardNodeChangesWithCommentGroupDissolve(changes, nodes),
      );
    },
    [captureEditUndoSnapshot, signalNodes],
  );

  const onSignalEdgesChange = useCallback((changes: EdgeChange[]) => {
    setSignalEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioInitialNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const plan = planNodeRemovalUndo(changes, scenarioInitialNodes, true);
      if (plan.shouldCapture) {
        captureEditUndoSnapshot('remove-nodes', { branch: 'initial', nodeIds: plan.nodeIds });
      }
      setScenarioInitialNodes((nodes) =>
        applyBoardNodeChangesWithCommentGroupDissolve(
          rejectSystemNodeRemovals(changes, nodes),
          nodes,
        ),
      );
    },
    [captureEditUndoSnapshot, scenarioInitialNodes],
  );

  const onScenarioInitialEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioInitialEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioOnConnectNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const plan = planNodeRemovalUndo(changes, scenarioOnConnectNodes, true);
      if (plan.shouldCapture) {
        captureEditUndoSnapshot('remove-nodes', { branch: 'onConnect', nodeIds: plan.nodeIds });
      }
      setScenarioOnConnectNodes((nodes) =>
        applyBoardNodeChangesWithCommentGroupDissolve(
          rejectSystemNodeRemovals(changes, nodes),
          nodes,
        ),
      );
    },
    [captureEditUndoSnapshot, scenarioOnConnectNodes],
  );

  const onScenarioOnConnectEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioOnConnectEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioMainNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const plan = planNodeRemovalUndo(changes, scenarioMainNodes, false);
      if (plan.shouldCapture) {
        captureEditUndoSnapshot('remove-nodes', { branch: 'main', nodeIds: plan.nodeIds });
      }
      setScenarioMainNodes((nodes) =>
        applyBoardNodeChangesWithCommentGroupDissolve(changes, nodes),
      );
    },
    [captureEditUndoSnapshot, scenarioMainNodes],
  );

  const onScenarioMainEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioMainEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioAlarmNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const plan = planNodeRemovalUndo(changes, scenarioAlarmNodes, false);
      if (plan.shouldCapture) {
        captureEditUndoSnapshot('remove-nodes', { branch: 'alarm', nodeIds: plan.nodeIds });
      }
      setScenarioAlarmNodes((nodes) =>
        applyBoardNodeChangesWithCommentGroupDissolve(changes, nodes),
      );
    },
    [captureEditUndoSnapshot, scenarioAlarmNodes],
  );

  const onScenarioAlarmEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioAlarmEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioOnStopNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const plan = planNodeRemovalUndo(changes, scenarioOnStopNodes, true);
      if (plan.shouldCapture) {
        captureEditUndoSnapshot('remove-nodes', { branch: 'onStop', nodeIds: plan.nodeIds });
      }
      setScenarioOnStopNodes((nodes) =>
        applyBoardNodeChangesWithCommentGroupDissolve(
          rejectSystemNodeRemovals(changes, nodes),
          nodes,
        ),
      );
    },
    [captureEditUndoSnapshot, scenarioOnStopNodes],
  );

  const onScenarioOnStopEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioOnStopEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioOnDisconnectNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const plan = planNodeRemovalUndo(changes, scenarioOnDisconnectNodes, true);
      if (plan.shouldCapture) {
        captureEditUndoSnapshot('remove-nodes', { branch: 'onDisconnect', nodeIds: plan.nodeIds });
      }
      setScenarioOnDisconnectNodes((nodes) =>
        applyBoardNodeChangesWithCommentGroupDissolve(
          rejectSystemNodeRemovals(changes, nodes),
          nodes,
        ),
      );
    },
    [captureEditUndoSnapshot, scenarioOnDisconnectNodes],
  );

  const onScenarioOnDisconnectEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioOnDisconnectEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onScenarioFunctionNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const plan = planNodeRemovalUndo(changes, scenarioFunctionNodes, false);
      if (plan.shouldCapture) {
        captureEditUndoSnapshot('remove-nodes', { branch: 'function', nodeIds: plan.nodeIds });
      }
      setScenarioFunctionNodes((nodes) =>
        applyBoardNodeChangesWithCommentGroupDissolve(
          rejectSystemNodeRemovals(changes, nodes),
          nodes,
        ),
      );
    },
    [captureEditUndoSnapshot, scenarioFunctionNodes],
  );

  const onScenarioFunctionEdgesChange = useCallback((changes: EdgeChange[]) => {
    setScenarioFunctionEdges((edges) => applyEdgeChanges(changes, edges));
  }, []);

  const onSignalConnect = useCallback((connection: Connection) => {
    setSignalEdges((edges) => addBoardEdge(connection, edges));
  }, []);

  const onScenarioInitialConnect = useCallback((connection: Connection) => {
    setScenarioInitialEdges((edges) => addBoardEdge(connection, edges));
  }, []);

  const onScenarioOnConnectConnect = useCallback((connection: Connection) => {
    setScenarioOnConnectEdges((edges) => addBoardEdge(connection, edges));
  }, []);

  const onScenarioMainConnect = useCallback((connection: Connection) => {
    setScenarioMainEdges((edges) => addBoardEdge(connection, edges));
  }, []);

  const onScenarioAlarmConnect = useCallback((connection: Connection) => {
    setScenarioAlarmEdges((edges) => addBoardEdge(connection, edges));
  }, []);

  const onScenarioOnStopConnect = useCallback((connection: Connection) => {
    setScenarioOnStopEdges((edges) => addBoardEdge(connection, edges));
  }, []);

  const onScenarioOnDisconnectConnect = useCallback((connection: Connection) => {
    setScenarioOnDisconnectEdges((edges) => addBoardEdge(connection, edges));
  }, []);

  const onScenarioFunctionConnect = useCallback((connection: Connection) => {
    setScenarioFunctionEdges((edges) => addBoardEdge(connection, edges));
  }, []);

  const isValidConnectionForLayer = useCallback(
    (layer: BoardLayerTab, connection: Connection) => {
      if (layer === 'signal') {
        return isValidBoardConnection(connection, signalNodes, layer, signalEdges);
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
      const edges =
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
      return isValidBoardConnection(connection, nodes, layer, edges);
    },
    [
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
      signalEdges,
      signalNodes,
    ],
  );

  const exportFullUserCaseJson = useCallback(async () => {
    await downloadDeviceScenarioJson(
      buildDocument(),
      deviceScenarioExportFilename(buildDocument()),
    );
    runValidation();
  }, [buildDocument, runValidation]);

  const exportJson = useCallback(
    async (layer: BoardLayerTab = 'scenario') => {
      let json: string;
      let downloadName: string;

      if (layer === 'signal') {
        await downloadDeviceScenarioJson(
          buildDocument(),
          deviceScenarioExportFilename(buildDocument(), { label: `device-scenario-${deviceKind}` }),
        );
        runValidation();
        return;
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

  const applyUserCase = useCallback(
    (userCaseId: string, mapping?: Readonly<Record<string, string>>): ApplyUserCaseOutcome => {
      if (loadUserCaseDocument === undefined) {
        return 'Каталог UserCase недоступен';
      }
      const userCaseDocument = loadUserCaseDocument(userCaseId);
      if (userCaseDocument === null) {
        return 'UserCase недоступен или не найден';
      }

      const prepared = prepareUserCaseApply({
        userCaseDocument,
        localDeviceKind: deviceKind,
        localVariables: variables,
      });
      if (!prepared.ok) {
        return prepared.message;
      }

      const effectiveMapping = mapping ?? prepared.suggestedMapping;
      if (mapping === undefined && !prepared.mappingComplete) {
        return {
          kind: 'needs-mapping',
          title: userCaseDocument.meta?.title ?? userCaseId,
          slots: prepared.slots,
          mapping: prepared.suggestedMapping,
        };
      }

      const result = applyUserCaseDocument({
        userCaseDocument,
        currentDocument: buildDocument(),
        localVariables: variables,
        mapping: effectiveMapping,
      });
      if (!result.ok) {
        return result.message;
      }

      setPendingBranchImport(null);
      applyHydratedState(result.state);
      pendingBaselineRef.current = true;
      runValidation();
      return null;
    },
    [applyHydratedState, buildDocument, deviceKind, loadUserCaseDocument, runValidation, variables],
  );

  const maxUserWorkspaces = workspaceHost?.maxUserWorkspaces ?? 0;
  const workspaceEnabled = workspaceHost !== undefined;
  const sessionTitle = boardSession?.title ?? null;

  const refreshWorkspaces = useCallback(async (): Promise<void> => {
    if (workspaceHost === undefined) {
      setWorkspaceList([]);
      setActiveWorkspaceId(null);
      return;
    }
    const [list, active] = await Promise.all([
      workspaceHost.listWorkspaces(),
      workspaceHost.getActiveWorkspaceId(),
    ]);
    setWorkspaceList(list);
    setActiveWorkspaceId(active);
  }, [workspaceHost]);

  useEffect(() => {
    if (workspaceHost !== undefined) {
      void refreshWorkspaces();
    }
  }, [refreshWorkspaces, workspaceHost]);

  const saveScenario = useCallback(async (): Promise<boolean> => {
    if (persistAdapter === undefined || isSessionReadOnly) {
      return false;
    }
    setSyncStatus('saving');
    setSyncError(null);
    setSyncConflict(false);
    const document = stampUserWorkspaceDocument(buildDocument());
    try {
      await persistAdapter.save(document);
      markSavedSnapshot(document);
      setSyncStatus('idle');
      if (workspaceHost !== undefined) {
        void refreshWorkspaces();
      }
      return true;
    } catch (error: unknown) {
      setSyncStatus('error');
      setSyncConflict(isDeviceBoardPersistConflict(error));
      setSyncError(error instanceof Error ? error.message : 'Не удалось сохранить сценарий');
      return false;
    }
  }, [buildDocument, isSessionReadOnly, markSavedSnapshot, persistAdapter, refreshWorkspaces, workspaceHost]);

  const replaceLoadedDocument = useCallback(
    (document: DeviceScenarioDocument) => {
      skipDirtyRef.current = true;
      savedDocumentRef.current = structuredClone(document);
      setPendingBranchImport(null);
      applyHydratedState(hydrateBoardFromDocument(document));
      pendingBaselineRef.current = true;
      runValidation();
      window.setTimeout(() => {
        skipDirtyRef.current = false;
      }, 0);
    },
    [applyHydratedState, runValidation],
  );

  const reloadScenarioFromServer = useCallback(async (): Promise<boolean> => {
    if (persistAdapter === undefined || isSessionReadOnly) {
      return false;
    }
    setSyncStatus('loading');
    setSyncError(null);
    setSyncConflict(false);
    try {
      const record = await persistAdapter.load();
      if (record === null) {
        setSyncStatus('error');
        setSyncError('На сервере нет сохранённого сценария');
        return false;
      }
      replaceLoadedDocument(record.document);
      markSavedSnapshot(record.document);
      setSyncStatus('idle');
      if (workspaceHost !== undefined) {
        void refreshWorkspaces();
      }
      return true;
    } catch (error: unknown) {
      setSyncStatus('error');
      setSyncConflict(false);
      setSyncError(error instanceof Error ? error.message : 'Не удалось загрузить сценарий');
      return false;
    }
  }, [
    isSessionReadOnly,
    markSavedSnapshot,
    persistAdapter,
    refreshWorkspaces,
    replaceLoadedDocument,
    workspaceHost,
  ]);

  const switchWorkspace = useCallback(
    async (workspaceId: string): Promise<string | null> => {
      if (workspaceHost === undefined) {
        return 'User workspace недоступен';
      }
      if (runtimeState.isRunning) {
        return 'Остановите сценарий перед переключением';
      }
      const document = await workspaceHost.loadWorkspace(workspaceId);
      if (document === null) {
        return 'Сценарий не найден';
      }
      replaceLoadedDocument(document);
      await workspaceHost.setActiveWorkspaceId(workspaceId);
      setActiveWorkspaceId(workspaceId);
      return null;
    },
    [replaceLoadedDocument, runtimeState.isRunning, workspaceHost],
  );

  const createEmptyWorkspace = useCallback(
    async (title?: string): Promise<string | null> => {
      if (workspaceHost === undefined) {
        return 'User workspace недоступен';
      }
      if (runtimeState.isRunning) {
        return 'Остановите сценарий перед созданием';
      }
      const count = await workspaceHost.countWorkspaces();
      const max = workspaceHost.maxUserWorkspaces;
      if (count >= max) {
        return `Достигнут лимит тарифа: ${count}/${max} user workspace`;
      }
      const created = await workspaceHost.createWorkspace(title ?? `Сценарий ${count + 1}`);
      if (created === null) {
        return 'Не удалось создать сценарий. Проверьте связь с media и обновите список.';
      }
      replaceLoadedDocument(created.document);
      await workspaceHost.setActiveWorkspaceId(created.workspaceId);
      await refreshWorkspaces();
      return null;
    },
    [refreshWorkspaces, replaceLoadedDocument, runtimeState.isRunning, workspaceHost],
  );

  const renameWorkspace = useCallback(
    async (workspaceId: string, title: string): Promise<string | null> => {
      if (workspaceHost === undefined) {
        return 'User workspace недоступен';
      }
      const ok = await workspaceHost.renameWorkspace(workspaceId, title);
      if (!ok) {
        return 'Не удалось переименовать';
      }
      await refreshWorkspaces();
      return null;
    },
    [refreshWorkspaces, workspaceHost],
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: string): Promise<string | null> => {
      if (workspaceHost === undefined) {
        return 'User workspace недоступен';
      }
      if (runtimeState.isRunning) {
        return 'Остановите сценарий перед удалением';
      }
      const wasActive = activeWorkspaceId === workspaceId;
      const ok = await workspaceHost.deleteWorkspace(workspaceId);
      if (!ok) {
        return 'Сценарий не найден';
      }
      await refreshWorkspaces();
      if (!wasActive) {
        return null;
      }
      const list = await workspaceHost.listWorkspaces();
      if (list.length === 0) {
        setActiveWorkspaceId(null);
        return null;
      }
      return switchWorkspace(list[0]!.workspaceId);
    },
    [activeWorkspaceId, refreshWorkspaces, runtimeState.isRunning, switchWorkspace, workspaceHost],
  );

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

  const pauseScenario = useCallback(() => {
    runtimeRef.current?.pause();
  }, []);

  const resumeScenario = useCallback(() => {
    runtimeRef.current?.resume();
  }, []);

  const setMode = useCallback((mode: RuntimeMode) => {
    runtimeRef.current?.setMode(mode);
  }, []);

  const clearCurrentBranch = useCallback(
    (layer: BoardLayerTab) => {
      captureEditUndoSnapshot('clear-branch', { layer, branch: scenarioBranch });
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
      captureEditUndoSnapshot,
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

  const insertUserFunctionIntoBranch = useCallback(
    (
      functionId: string,
      branch: ScenarioBranchTab,
      position?: { readonly x: number; readonly y: number },
    ): InsertUserFunctionIntoBranchResult => {
      if (!isScenarioBranchForFunctionInsert(branch)) {
        return {
          ok: false,
          message: 'Вставка доступна только на ветках сценария (не на вкладке функции)',
        };
      }
      const committed = commitActiveFunctionDraft(scenarioFunctionDrafts);
      const draft = committed.find((item) => item.id === functionId);
      if (draft === undefined) {
        return { ok: false, message: 'Функция не найдена' };
      }
      setScenarioFunctionDrafts(committed);

      const branchNodes =
        branch === 'initial'
          ? scenarioInitialNodes
          : branch === 'onConnect'
            ? scenarioOnConnectNodes
            : branch === 'main'
              ? scenarioMainNodes
              : branch === 'alarm'
                ? scenarioAlarmNodes
                : branch === 'onStop'
                  ? scenarioOnStopNodes
                  : branch === 'onDisconnect'
                    ? scenarioOnDisconnectNodes
                    : scenarioFunctionNodes;

      const outcome = insertFunctionSubgraphBlock({
        draft,
        branchNodes,
        position,
      });

      appendNodeToBranch(branch, outcome.node);
      return { ok: true, nodeId: outcome.node.id };
    },
    [
      appendNodeToBranch,
      commitActiveFunctionDraft,
      scenarioAlarmNodes,
      scenarioFunctionDrafts,
      scenarioFunctionNodes,
      scenarioInitialNodes,
      scenarioMainNodes,
      scenarioOnConnectNodes,
      scenarioOnDisconnectNodes,
      scenarioOnStopNodes,
    ],
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
          setScenarioInitialEdges((edges) => addBoardEdge(edgeConnection, edges));
          break;
        case 'onConnect':
          setScenarioOnConnectNodes((nodes) => [...nodes, node]);
          setScenarioOnConnectEdges((edges) => addBoardEdge(edgeConnection, edges));
          break;
        case 'main':
          setScenarioMainNodes((nodes) => [...nodes, node]);
          setScenarioMainEdges((edges) => addBoardEdge(edgeConnection, edges));
          break;
        case 'alarm':
          setScenarioAlarmNodes((nodes) => [...nodes, node]);
          setScenarioAlarmEdges((edges) => addBoardEdge(edgeConnection, edges));
          break;
        case 'onStop':
          setScenarioOnStopNodes((nodes) => [...nodes, node]);
          setScenarioOnStopEdges((edges) => addBoardEdge(edgeConnection, edges));
          break;
        case 'onDisconnect':
          setScenarioOnDisconnectNodes((nodes) => [...nodes, node]);
          setScenarioOnDisconnectEdges((edges) => addBoardEdge(edgeConnection, edges));
          break;
        case 'function':
          setScenarioFunctionNodes((nodes) => [...nodes, node]);
          setScenarioFunctionEdges((edges) => addBoardEdge(edgeConnection, edges));
          break;
        default:
          break;
      }
    },
    [scenarioBranch],
  );

  const copyBoardSelection = useCallback(
    (options?: {
      readonly forcedSelectedIds?: readonly string[];
      readonly branchNodes?: readonly Node[];
      readonly branchEdges?: readonly Edge[];
    }): number | null => {
      const snapshot =
        options?.branchNodes !== undefined
          ? { nodes: options.branchNodes, edges: options?.branchEdges ?? [] }
          : readScenarioBranchGraph(scenarioBranch);
      const selectedIds = collectBoardSelectionNodeIds(
        snapshot.nodes,
        options?.forcedSelectedIds,
      );
      logBoardClipboardStep(showInfoLogsRef.current, 'copy-attempt', {
        branch: scenarioBranch,
        forcedSelectedIds: options?.forcedSelectedIds,
        resolvedSelectedIds: [...selectedIds],
      });
      const clipboard = extractBoardSelectionClipboard(
        snapshot.nodes,
        snapshot.edges,
        options?.forcedSelectedIds,
      );
      if (clipboard === null) {
        const eligibleCount = snapshot.nodes.filter(
          (node) => selectedIds.has(node.id) && isBoardSelectionCopyEligibleNode(node),
        ).length;
        logBoardClipboardStep(showInfoLogsRef.current, 'copy-failed', {
          branch: scenarioBranch,
          reason: selectedIds.size === 0 ? 'no-selection' : 'no-eligible-nodes',
          selectedCount: selectedIds.size,
          eligibleCount,
        });
        return null;
      }
      boardClipboardRef.current = clipboard;
      setHasBoardSelectionClipboard(true);
      setBoardClipboardNodeCount(clipboard.nodes.length);
      logBoardClipboardStep(showInfoLogsRef.current, 'copy-ok', {
        branch: scenarioBranch,
        nodeCount: clipboard.nodes.length,
        edgeCount: clipboard.edges.length,
        nodeIds: clipboard.nodes.map((node) => node.id),
      });
      return clipboard.nodes.length;
    },
    [readScenarioBranchGraph, scenarioBranch],
  );

  const clearBoardClipboard = useCallback(() => {
    boardClipboardRef.current = null;
    setHasBoardSelectionClipboard(false);
    setBoardClipboardNodeCount(0);
    logBoardClipboardStep(showInfoLogsRef.current, 'clear-ok', {
      branch: scenarioBranch,
    });
  }, [scenarioBranch]);

  const pasteBoardSelection = useCallback(
    (anchorFlowPosition?: { readonly x: number; readonly y: number }): readonly string[] | null => {
    logBoardClipboardStep(showInfoLogsRef.current, 'paste-attempt', {
      branch: scenarioBranch,
      clipboardCount: boardClipboardRef.current?.nodes.length ?? 0,
      anchor: anchorFlowPosition ?? null,
      readOnly: structureLockRef.current.locked,
    });
    if (structureLockRef.current.locked) {
      logBoardClipboardStep(showInfoLogsRef.current, 'paste-failed', {
        branch: scenarioBranch,
        reason: 'read-only-session',
      });
      return null;
    }
    const clipboard = boardClipboardRef.current;
    if (clipboard === null || clipboard.nodes.length === 0) {
      logBoardClipboardStep(showInfoLogsRef.current, 'paste-failed', {
        branch: scenarioBranch,
        reason: 'empty-clipboard',
      });
      return null;
    }
    const pasted = cloneBoardSelectionForPaste(clipboard, anchorFlowPosition);
    const { nodes: branchNodes, edges: branchEdges } = readScenarioBranchGraph(scenarioBranch);
    captureEditUndoSnapshot('paste-nodes', { count: pasted.nodes.length, branch: scenarioBranch });
    const cleared = branchNodes.map((node) => ({ ...node, selected: false }));
    applyScenarioBranchGraph(scenarioBranch, [...cleared, ...pasted.nodes], [
      ...branchEdges,
      ...pasted.edges,
    ]);
    logBoardClipboardStep(showInfoLogsRef.current, 'paste-ok', {
      branch: scenarioBranch,
      pastedCount: pasted.nodes.length,
      pastedIds: pasted.nodes.map((node) => node.id),
    });
    return pasted.nodes.map((node) => node.id);
  },
    [
    applyScenarioBranchGraph,
    captureEditUndoSnapshot,
    readScenarioBranchGraph,
    scenarioBranch,
  ],
  );

  const removeNodesFromCurrentBranch = useCallback(
    (nodeIds: readonly string[]): number => {
      logBoardClipboardStep(showInfoLogsRef.current, 'delete-attempt', {
        branch: scenarioBranch,
        nodeIds,
        readOnly: structureLockRef.current.locked,
      });
      if (structureLockRef.current.locked) {
        logBoardClipboardStep(showInfoLogsRef.current, 'delete-failed', {
          branch: scenarioBranch,
          reason: 'read-only-session',
        });
        return 0;
      }
      const { nodes: branchNodes, edges: branchEdges } = readScenarioBranchGraph(scenarioBranch);
      const removal = applyBranchNodeRemovals(
        branchNodes,
        nodeIds,
        (node) => !isLockedBoardNode(node),
      );
      if (!removal) {
        logBoardClipboardStep(showInfoLogsRef.current, 'delete-failed', {
          branch: scenarioBranch,
          reason: 'no-removable-nodes',
        });
        return 0;
      }
      const { nodes: nextNodes, removedNodeIds, dissolvedGroupIds } = removal;
      const deletedIds = [...removedNodeIds, ...dissolvedGroupIds];
      captureEditUndoSnapshot('remove-nodes', {
        branch: scenarioBranch,
        nodeIds: deletedIds,
      });
      const deletedIdSet = new Set(deletedIds);
      const nextEdges = branchEdges.filter(
        (edge) => !deletedIdSet.has(edge.source) && !deletedIdSet.has(edge.target),
      );
      applyScenarioBranchGraph(scenarioBranch, nextNodes, nextEdges);
      logBoardClipboardStep(showInfoLogsRef.current, 'delete-ok', {
        branch: scenarioBranch,
        removedCount: deletedIds.length,
        nodeIds: deletedIds,
      });
      return deletedIds.length;
    },
    [
      applyScenarioBranchGraph,
      captureEditUndoSnapshot,
      readScenarioBranchGraph,
      scenarioBranch,
    ],
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

  const updateSequenceConfig = useCallback((nodeId: string, config: ScenarioSequenceConfig) => {
    const resolved = resolveScenarioSequenceConfig(config);
    const mapNodes = (nodes: Node[]) =>
      nodes.map((node) => {
        if (
          node.id !== nodeId ||
          !isBoardFlowNodeData(node.data) ||
          node.data.nodeKind !== 'sequence'
        ) {
          return node;
        }
        return { ...node, data: applySequenceConfigToNodeData(node.data, resolved) };
      });
    const mapEdges = (edges: Edge[]) => pruneSequenceThenEdges(edges, nodeId, resolved.thenCount);
    setScenarioInitialNodes(mapNodes);
    setScenarioInitialEdges(mapEdges);
    setScenarioOnConnectNodes(mapNodes);
    setScenarioOnConnectEdges(mapEdges);
    setScenarioMainNodes(mapNodes);
    setScenarioMainEdges(mapEdges);
    setScenarioAlarmNodes(mapNodes);
    setScenarioAlarmEdges(mapEdges);
    setScenarioOnStopNodes(mapNodes);
    setScenarioOnStopEdges(mapEdges);
    setScenarioOnDisconnectNodes(mapNodes);
    setScenarioOnDisconnectEdges(mapEdges);
    setScenarioFunctionNodes(mapNodes);
    setScenarioFunctionEdges(mapEdges);
  }, []);

  const updateAsyncJobConfig = useCallback(
    (nodeId: string, config: ScenarioAsyncJobNodeConfig) => {
      patchNodeData(nodeId, { asyncJobConfig: resolveScenarioAsyncJobNodeConfig(config) });
    },
    [patchNodeData],
  );

  const updateCommentGroupMetadata = useCallback(
    (
      branch: ScenarioCommentGroupBranch,
      nodeId: string,
      patch: {
        readonly title?: string;
        readonly description?: string;
        readonly frameColor?: ScenarioCommentGroupFrameColor;
      },
    ) => {
      const dataPatch = buildCommentGroupDataPatch(patch);
      const patchBranch = (setter: React.Dispatch<React.SetStateAction<Node[]>>) => {
        setter((prev) => patchCommentGroupNodeData(prev, nodeId, dataPatch) ?? prev);
      };
      switch (branch) {
        case 'signal':
          patchBranch(setSignalNodes);
          break;
        case 'initial':
          patchBranch(setScenarioInitialNodes);
          break;
        case 'onConnect':
          patchBranch(setScenarioOnConnectNodes);
          break;
        case 'main':
          patchBranch(setScenarioMainNodes);
          break;
        case 'alarm':
          patchBranch(setScenarioAlarmNodes);
          break;
        case 'onStop':
          patchBranch(setScenarioOnStopNodes);
          break;
        case 'onDisconnect':
          patchBranch(setScenarioOnDisconnectNodes);
          break;
        case 'function':
          patchBranch(setScenarioFunctionNodes);
          break;
        default: {
          const _exhaustive: never = branch;
          return _exhaustive;
        }
      }
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
      activeFunctionDraftIndex,
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
      revertToSavedDocumentIfDirty,
      captureEditUndoSnapshot,
      undoLastEdit,
      canUndoLastEdit,
      lastUndoableEditLabel,
      forgetPendingEditUndo,
      refreshValidation,
      exportJson,
      exportFullUserCaseJson,
      importJsonFile,
      pendingBranchImport,
      confirmBranchImport,
      cancelBranchImport,
      applyUserCase,
      syncStatus,
      syncError,
      syncConflict,
      isDirty,
      saveScenario,
      reloadScenarioFromServer,
      workspaceEnabled,
      isSessionReadOnly,
      isStructureLocked: scenarioPolicy.isStructureLocked,
      isCompetitionMode: scenarioPolicy.isCompetitionMode,
      competitionTimeoutSec: scenarioPolicy.competitionTimeoutSec,
      sessionTitle,
      workspaceList,
      activeWorkspaceId,
      maxUserWorkspaces,
      refreshWorkspaces,
      switchWorkspace,
      createEmptyWorkspace,
      renameWorkspace,
      deleteWorkspace,
      startScenario,
      stopScenario,
      pauseScenario,
      resumeScenario,
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
      copyBoardSelection,
      pasteBoardSelection,
      hasBoardSelectionClipboard,
      boardClipboardNodeCount,
      clearBoardClipboard,
      removeNodesFromCurrentBranch,
      updatePaletteNodeMicrophoneId,
      updateCollectorConfig,
      updateRecordingPolicy,
      updateFftTrendsPolicy,
      updateSequenceConfig,
      updateAsyncJobConfig,
      updateActiveFunctionMeta,
      updateUserFunctionMeta,
      addActiveFunctionPin,
      removeActiveFunctionPin,
      updateActiveFunctionPin,
      createUserFunction,
      selectUserFunction,
      removeUserFunction,
      insertUserFunctionIntoBranch,
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
      copyBoardSelection,
      pasteBoardSelection,
      hasBoardSelectionClipboard,
      boardClipboardNodeCount,
      clearBoardClipboard,
      removeNodesFromCurrentBranch,
      updatePaletteNodeMicrophoneId,
      updateCollectorConfig,
      updateRecordingPolicy,
      updateFftTrendsPolicy,
      updateSequenceConfig,
      updateAsyncJobConfig,
      updateActiveFunctionMeta,
      updateUserFunctionMeta,
      addActiveFunctionPin,
      removeActiveFunctionPin,
      updateActiveFunctionPin,
      createUserFunction,
      selectUserFunction,
      removeUserFunction,
      insertUserFunctionIntoBranch,
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
      exportFullUserCaseJson,
      importJsonFile,
      pendingBranchImport,
      confirmBranchImport,
      cancelBranchImport,
      applyUserCase,
      activeWorkspaceId,
      createEmptyWorkspace,
      deleteWorkspace,
      inspectRuntimeNode,
      isDirty,
      isSessionReadOnly,
      scenarioPolicy,
      sessionTitle,
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
      activeFunctionDraftIndex,
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
      reloadScenarioFromServer,
      setScenarioBranch,
      maxUserWorkspaces,
      refreshWorkspaces,
      renameWorkspace,
      revertToSavedDocumentIfDirty,
      captureEditUndoSnapshot,
      undoLastEdit,
      canUndoLastEdit,
      lastUndoableEditLabel,
      forgetPendingEditUndo,
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
      pauseScenario,
      resumeScenario,
      switchWorkspace,
      syncError,
      syncConflict,
      syncStatus,
      workspaceEnabled,
      workspaceList,
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
