import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScenarioCommentGroupBranch } from '@membrana/core';
import type {
  DeviceScenarioDocument,
  ScenarioNodeKind,
  ScenarioCollectorConfig,
  ScenarioFftTrendsPolicy,
  ScenarioRecordingPolicy,
  ScenarioSequenceConfig,
  ScenarioAsyncJobNodeConfig,
} from '@membrana/core';
import {
  isPureEligibleScenarioNodeKind,
  resolveScenarioCollectorConfig,
  resolveScenarioFftTrendsPolicy,
  resolveScenarioSequenceConfig,
  resolveScenarioAsyncJobNodeConfig,
  resolveScenarioGraphNodePure,
  resolveScenarioRecordingPolicy,
  resolveScenarioCommentGroupFrameColor,
  DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR,
} from '@membrana/core';
import type { ScenarioCommentGroupFrameColor } from '@membrana/core';
import type { Edge, Node, NodeChange, OnSelectionChangeParams } from '@xyflow/react';

import { BoardServerFirstBadges } from './board-server-first-badges.js';
import { BoardCanvasBreadcrumb } from './board-canvas-breadcrumb.js';
import { buildBoardCanvasBreadcrumb } from './board-context-breadcrumb.js';
import { BoardEditUndoControl } from './board-edit-undo-control.js';
import { resolveScenarioEditFlags } from './scenario-edit-flags.js';
import type { ServerFirstFlagsInput } from './server-first-flags.js';
import { useDeviceBoardMode } from '../context/device-board-mode-context.js';
import { DeviceBoardGraphProvider, useDeviceBoardGraph } from '../context/device-board-graph-context.js';
import type { ScenarioMicrophoneOption, ScenarioRuntimeHost } from '../runtime/index.js';
import type { DeviceBoardPersistAdapter } from '../persist/device-board-persist.js';
import type { HydratedBoardState } from '../graph/hydrate-board-from-document.js';
import type { PaletteConnectionSuggestion } from '../graph/connection-suggest.js';
import { suggestPaletteNodesForOutgoingConnection } from '../graph/index.js';
import { listSubgraphBlocksForFunction } from '../graph/list-subgraph-blocks-for-function.js';
import {
  BRANCH_TAB_LABEL,
  BRANCH_SCENARIO_TITLE,
  boardHeaderContentOffsetClass,
  SIGNAL_LAYER_TITLE,
  isSignalAdvancedEnabled,
  isScenarioBranchForFunctionInsert,
  type ScenarioBranchTab,
} from '../types/board-ui.js';
import {
  BoardFlowCanvas,
  type BoardConnectionDropOnPanePayload,
  type BoardFlowViewportApi,
  type BoardMarqueeSelectionPayload,
} from './board-flow-canvas.js';
import { BoardConnectionSuggestModal } from './board-connection-suggest-modal.js';
import {
  BoardClipboardPaneModal,
  type BoardClipboardPaneModalMode,
} from './board-clipboard-pane-modal.js';
import { BoardSelectionActionModal } from './board-selection-action-modal.js';
import { BoardFunctionActionModal } from './board-function-action-modal.js';
import { BoardBranchImportModal } from './board-branch-import-modal.js';
import { BoardLeftSidebar } from './board-left-sidebar.js';
import { BoardRightSidebar } from './board-right-sidebar.js';
import type { FunctionPinEditSide } from './board-function-pin-inspector.js';
import { DeleteFunctionModal } from './board-variable-modals.js';
import { BoardRuntimeStatus } from './board-runtime-status.js';
import { PlaybackClusterControl } from './playback-cluster-control.js';
import { CompetitionRunTimer } from './competition-run-timer.js';
import { BoardValidationBanner } from './board-validation-banner.js';
import { shouldPreserveLockedNodes } from '../graph/clear-branch.js';
import { referenceTypeLabel, isBoardGroupNode, collectValidationErrorNodeIds, parseEncodedSubgraphRefLabel } from '../graph/index.js';
import type { BoardGroupNodeData } from '../graph/index.js';
import { computeSmartAlignPositions, computeAlignPositions } from '../graph/align-nodes.js';
import {
  computeExecChainLayoutPositions,
  computeExecChainLayoutFromEntry,
  buildLayoutGhostNodes,
  isExecChainLayoutEnabled,
  isLoopBranchExecLayoutEnabled,
  isLoopBranchExecLayoutCanonical,
  resolveLoopBranchExecEntryId,
} from '../graph/layout-exec-chain.js';
import type { LoopExecLayoutBranch } from '../graph/layout-exec-chain.js';
import { BoardExecLayoutPreviewModal } from './board-exec-layout-preview-modal.js';
import type { BoardAlignMode } from '../graph/align-nodes.js';
import {
  isCollapseToFunctionEnabled,
  isCollapseToGroupEnabled,
  pickCollapseEligibleNodeIds,
  isCollapseToFunctionEligibleNode,
  isCollapseToGroupEligibleNode,
} from '../graph/collapse-selection-eligibility.js';
import { computeRuntimeExecHighlight } from '../graph/runtime-exec-highlight.js';
import { logBoardClipboardStep } from '../graph/edit-step-log.js';

export interface DeviceBoardShellProps {
  readonly runtimeHost?: ScenarioRuntimeHost;
  readonly persistAdapter?: DeviceBoardPersistAdapter;
  readonly initialHydratedState?: HydratedBoardState;
  readonly onRequestExit?: () => void;
  readonly exitLabel?: string;
  readonly showRunControls?: boolean;
  /** Online-presence выбранного устройства; `undefined` — не проверять (автономный клиент). */
  readonly deviceLive?: boolean;
  /** Загрузка документа каталога (U10 W2-module: выбор в launcher модуля). */
  readonly loadUserCaseDocument?: (id: string) => DeviceScenarioDocument | null;
  /** Server-first SF4: lease + capture с поля (paired client). */
  readonly serverFirstState?: ServerFirstFlagsInput | null;
  /** SF5: перспектива badge copy (поле vs кабинет). */
  readonly serverFirstPerspective?: 'field' | 'cabinet';
}

const DeviceBoardShellInner: React.FC<{
  onRequestExit?: () => void;
  exitLabel: string;
  showRunControls: boolean;
  runtimeHost?: ScenarioRuntimeHost;
  serverFirstPerspective: 'field' | 'cabinet';
}> = ({ onRequestExit, exitLabel, showRunControls, runtimeHost, serverFirstPerspective }) => {
  const { exitBoardMode } = useDeviceBoardMode();
  const graph = useDeviceBoardGraph();
  const signalAdvanced = isSignalAdvancedEnabled();
  const [activeLayer, setActiveLayer] = useState<'signal' | 'scenario'>('scenario');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);
  const [selectedNodeKind, setSelectedNodeKind] = useState<ScenarioNodeKind | null>(null);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [selectedFunctionName, setSelectedFunctionName] = useState<string | null>(null);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string | null>(null);
  const [selectedCollectorConfig, setSelectedCollectorConfig] = useState<ScenarioCollectorConfig | null>(
    null,
  );
  const [selectedRecordingPolicy, setSelectedRecordingPolicy] = useState<ScenarioRecordingPolicy | null>(
    null,
  );
  const [selectedRecordingPolicyWired, setSelectedRecordingPolicyWired] = useState(false);
  const [selectedFftTrendsPolicy, setSelectedFftTrendsPolicy] =
    useState<ScenarioFftTrendsPolicy | null>(null);
  const [selectedSequenceConfig, setSelectedSequenceConfig] = useState<ScenarioSequenceConfig | null>(
    null,
  );
  const [selectedAsyncJobConfig, setSelectedAsyncJobConfig] = useState<ScenarioAsyncJobNodeConfig | null>(
    null,
  );
  const [selectedVariableId, setSelectedVariableId] = useState<string | null>(null);
  const [selectedGetterPure, setSelectedGetterPure] = useState(true);
  const [selectedGetterPureLocked, setSelectedGetterPureLocked] = useState(false);
  const [selectedIsCommentGroup, setSelectedIsCommentGroup] = useState(false);
  const [selectedGroupTitle, setSelectedGroupTitle] = useState('');
  const [selectedGroupDescription, setSelectedGroupDescription] = useState('');
  const [selectedGroupFrameColor, setSelectedGroupFrameColor] = useState<ScenarioCommentGroupFrameColor>(
    DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR,
  );
  const [microphoneOptions, setMicrophoneOptions] = useState<readonly ScenarioMicrophoneOption[]>([]);
  const [microphoneOptionsLoading, setMicrophoneOptionsLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [traceCopyStatus, setTraceCopyStatus] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const viewportApiRef = useRef<BoardFlowViewportApi | null>(null);
  const lastCanvasPointerRef = useRef<{ readonly clientX: number; readonly clientY: number } | null>(
    null,
  );
  const [connectionSuggestOpen, setConnectionSuggestOpen] = useState(false);
  const [connectionSuggestItems, setConnectionSuggestItems] = useState<
    readonly PaletteConnectionSuggestion[]
  >([]);
  const pendingConnectionDropRef = useRef<BoardConnectionDropOnPanePayload | null>(null);
  const [selectionActionOpen, setSelectionActionOpen] = useState(false);
  const [clipboardPaneModal, setClipboardPaneModal] = useState<BoardClipboardPaneModalMode | null>(
    null,
  );
  const [clipboardHint, setClipboardHint] = useState<string | null>(null);
  const clipboardHintTimerRef = useRef<number | null>(null);
  const [execLayoutPreview, setExecLayoutPreview] = useState<
    Map<string, { readonly x: number; readonly y: number }> | null
  >(null);
  const [marqueeSelectedIds, setMarqueeSelectedIds] = useState<readonly string[]>([]);
  const [functionActionTarget, setFunctionActionTarget] = useState<{
    readonly functionId: string;
    readonly functionName: string;
  } | null>(null);
  const [functionActionMessage, setFunctionActionMessage] = useState<string | null>(null);
  const [deleteFunctionTarget, setDeleteFunctionTarget] = useState<{
    readonly id: string;
    readonly index: number;
  } | null>(null);

  const handleViewportApiReady = useCallback((api: BoardFlowViewportApi) => {
    viewportApiRef.current = api;
  }, []);

  const flashEditHint = useCallback((message: string) => {
    setClipboardHint(message);
    if (clipboardHintTimerRef.current !== null) {
      window.clearTimeout(clipboardHintTimerRef.current);
    }
    clipboardHintTimerRef.current = window.setTimeout(() => {
      setClipboardHint(null);
      clipboardHintTimerRef.current = null;
    }, 5000);
  }, []);

  const flashClipboardHint = useCallback(
    (count: number) => {
      flashEditHint(`в буфере ${count} узлов`);
    },
    [flashEditHint],
  );

  useEffect(
    () => () => {
      if (clipboardHintTimerRef.current !== null) {
        window.clearTimeout(clipboardHintTimerRef.current);
      }
    },
    [],
  );

  const addPaletteNodeAtViewportCenter = useCallback(
    (nodeKind: Parameters<typeof graph.addPaletteNodeToCurrentBranch>[0]) => {
      const center = viewportApiRef.current?.getCenterFlowPosition();
      graph.addPaletteNodeToCurrentBranch(nodeKind, center);
    },
    [graph],
  );

  const addVariableNodeAtViewportCenter = useCallback(
    (kind: Parameters<typeof graph.addVariableNodeToCurrentBranch>[0], variableId: string) => {
      const center = viewportApiRef.current?.getCenterFlowPosition();
      graph.addVariableNodeToCurrentBranch(kind, variableId, center);
    },
    [graph],
  );

  const handleCopyScenarioTrace = useCallback(async () => {
    const copied = await graph.copyScenarioTrace();
    setTraceCopyStatus(
      copied
        ? `Скопировано ${graph.scenarioTraceLineCount} строк`
        : graph.scenarioTraceLineCount === 0
          ? 'Буфер trace пуст'
          : 'Не удалось скопировать',
    );
  }, [graph]);

  const handleDownloadScenarioTrace = useCallback(() => {
    if (graph.scenarioTraceLineCount === 0) {
      setTraceCopyStatus('Буфер trace пуст');
      return;
    }
    graph.downloadScenarioTrace();
    setTraceCopyStatus(`Скачано ${graph.scenarioTraceLineCount} строк`);
  }, [graph]);

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
    setSelectedCollectorConfig(null);
    setSelectedRecordingPolicy(null);
    setSelectedRecordingPolicyWired(false);
    setSelectedFftTrendsPolicy(null);
    setSelectedSequenceConfig(null);
    setSelectedAsyncJobConfig(null);
    setSelectedVariableId(null);
    setSelectedGetterPure(true);
    setSelectedGetterPureLocked(false);
    setSelectedIsCommentGroup(false);
    setSelectedGroupTitle('');
    setSelectedGroupDescription('');
    setSelectedGroupFrameColor(DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR);
    setSelectedFunctionId(null);
    setSelectedFunctionName(null);
  }, []);

  const resolveBranchEdges = useCallback((): readonly Edge[] => {
    switch (graph.scenarioBranch) {
      case 'initial':
        return graph.scenarioInitialEdges;
      case 'onConnect':
        return graph.scenarioOnConnectEdges;
      case 'main':
        return graph.scenarioMainEdges;
      case 'alarm':
        return graph.scenarioAlarmEdges;
      case 'onStop':
        return graph.scenarioOnStopEdges;
      case 'onDisconnect':
        return graph.scenarioOnDisconnectEdges;
      case 'function':
        return graph.scenarioFunctionEdges;
      default:
        return graph.scenarioInitialEdges;
    }
  }, [
    graph.scenarioAlarmEdges,
    graph.scenarioBranch,
    graph.scenarioFunctionEdges,
    graph.scenarioInitialEdges,
    graph.scenarioMainEdges,
    graph.scenarioOnConnectEdges,
    graph.scenarioOnDisconnectEdges,
    graph.scenarioOnStopEdges,
  ]);

  const handleSelectionChange = useCallback((selection: OnSelectionChangeParams) => {
    const node = selection.nodes[0];
    if (node === undefined) {
      setSelectedNodeId(null);
      setSelectedNodeLabel(null);
      setSelectedNodeKind(null);
      setSelectedMicrophoneId(null);
      setSelectedCollectorConfig(null);
      setSelectedRecordingPolicy(null);
      setSelectedRecordingPolicyWired(false);
      setSelectedFftTrendsPolicy(null);
    setSelectedSequenceConfig(null);
    setSelectedAsyncJobConfig(null);
      setSelectedVariableId(null);
      setSelectedGetterPure(true);
      setSelectedGetterPureLocked(false);
      setSelectedIsCommentGroup(false);
      setSelectedGroupTitle('');
      setSelectedGroupDescription('');
      setSelectedGroupFrameColor(DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR);
      setSelectedFunctionId(null);
      setSelectedFunctionName(null);
      return;
    }
    setSelectedNodeId(node.id);
    const isGroup = isBoardGroupNode(node);
    setSelectedIsCommentGroup(isGroup);
    if (isGroup) {
      const groupData = node.data as BoardGroupNodeData;
      setSelectedGroupTitle(typeof groupData.title === 'string' ? groupData.title : 'Группа');
      setSelectedGroupDescription(
        typeof groupData.description === 'string' ? groupData.description : '',
      );
      setSelectedGroupFrameColor(resolveScenarioCommentGroupFrameColor(groupData.frameColor));
      setSelectedNodeLabel(typeof groupData.title === 'string' ? groupData.title : node.id);
      setSelectedNodeKind(null);
      setSelectedMicrophoneId(null);
      setSelectedCollectorConfig(null);
      setSelectedRecordingPolicy(null);
      setSelectedRecordingPolicyWired(false);
      setSelectedFftTrendsPolicy(null);
    setSelectedSequenceConfig(null);
    setSelectedAsyncJobConfig(null);
      setSelectedVariableId(null);
      setSelectedGetterPure(false);
      setSelectedGetterPureLocked(false);
      setSelectedFunctionId(null);
      setSelectedFunctionName(null);
      return;
    }
    const rawLabel = typeof node.data?.label === 'string' ? node.data.label : node.id;
    const blockKind = node.data?.blockKind;
    const functionId = typeof node.data?.functionId === 'string' ? node.data.functionId : null;
    if (blockKind === 'subgraph' && functionId !== null) {
      const fn = graph.scenarioFunctionDrafts.find((draft) => draft.id === functionId);
      const displayName = fn?.name ?? parseEncodedSubgraphRefLabel(rawLabel);
      setSelectedNodeLabel(displayName);
      setSelectedFunctionId(functionId);
      setSelectedFunctionName(displayName);
    } else {
      setSelectedNodeLabel(rawLabel);
      setSelectedFunctionId(null);
      setSelectedFunctionName(null);
    }
    const kind = typeof node.data?.nodeKind === 'string' ? (node.data.nodeKind as ScenarioNodeKind) : null;
    setSelectedNodeKind(kind);
    const micId = typeof node.data?.microphoneId === 'string' ? node.data.microphoneId : null;
    setSelectedMicrophoneId(micId);
    const collectorRaw = node.data?.collectorConfig;
    setSelectedCollectorConfig(
      collectorRaw !== undefined && collectorRaw !== null && typeof collectorRaw === 'object'
        ? resolveScenarioCollectorConfig(collectorRaw as Partial<ScenarioCollectorConfig>)
        : null,
    );
    const policyRaw = node.data?.recordingPolicy;
    setSelectedRecordingPolicy(
      policyRaw !== undefined && policyRaw !== null && typeof policyRaw === 'object'
        ? resolveScenarioRecordingPolicy(policyRaw as Partial<ScenarioRecordingPolicy>)
        : null,
    );
    const edges = resolveBranchEdges();
    const policyWired =
      kind === 'start-recording'
        ? edges.some((edge) => edge.target === node.id && edge.targetHandle === 'policy')
        : kind === 'is-recording-window-full'
          ? edges.some((edge) => edge.target === node.id && edge.targetHandle === 'windowSec')
          : false;
    setSelectedRecordingPolicyWired(policyWired);
    const fftTrendsRaw = node.data?.fftTrendsPolicy;
    setSelectedFftTrendsPolicy(
      fftTrendsRaw !== undefined && fftTrendsRaw !== null && typeof fftTrendsRaw === 'object'
        ? resolveScenarioFftTrendsPolicy(fftTrendsRaw as Partial<ScenarioFftTrendsPolicy>)
        : null,
    );
    const sequenceRaw = node.data?.sequenceConfig;
    setSelectedSequenceConfig(
      sequenceRaw !== undefined && sequenceRaw !== null && typeof sequenceRaw === 'object'
        ? resolveScenarioSequenceConfig(sequenceRaw as Partial<ScenarioSequenceConfig>)
        : null,
    );
    const asyncJobRaw = node.data?.asyncJobConfig;
    setSelectedAsyncJobConfig(
      asyncJobRaw !== undefined && asyncJobRaw !== null && typeof asyncJobRaw === 'object'
        ? resolveScenarioAsyncJobNodeConfig(asyncJobRaw as Partial<ScenarioAsyncJobNodeConfig>)
        : null,
    );
    const varId = typeof node.data?.variableId === 'string' ? node.data.variableId : null;
    setSelectedVariableId(varId);
    const pureFlag = typeof node.data?.pure === 'boolean' ? node.data.pure : undefined;
    if (kind !== null && isPureEligibleScenarioNodeKind(kind)) {
      setSelectedGetterPure(resolveScenarioGraphNodePure({ nodeKind: kind, pure: pureFlag }));
      setSelectedGetterPureLocked(false);
    } else if (kind === 'make-recording-policy' || kind === 'make-fft-trends-policy') {
      setSelectedGetterPure(true);
      setSelectedGetterPureLocked(true);
    } else {
      setSelectedGetterPure(false);
      setSelectedGetterPureLocked(false);
    }
    if (kind === 'get-microphone') {
      void refreshMicrophoneOptions();
    }
  }, [graph.scenarioFunctionDrafts, refreshMicrophoneOptions, resolveBranchEdges]);

  const handleSelectBranch = useCallback(
    (branch: ScenarioBranchTab) => {
      setMarqueeSelectedIds([]);
      setSelectionActionOpen(false);
      setClipboardPaneModal(null);
      graph.setScenarioBranch(branch);
      setActiveLayer('scenario');
      clearSelection();
    },
    [clearSelection, graph],
  );

  const handleSelectSignal = useCallback(() => {
    graph.revertToSavedDocumentIfDirty();
    graph.forgetPendingEditUndo('leave-scenario-layer');
    setActiveLayer('signal');
    clearSelection();
  }, [clearSelection, graph]);

  const isSignal = activeLayer === 'signal';
  const scenarioBranch = graph.scenarioBranch;
  const isRuntime = graph.runtimeState.isRunning;
  const scenarioEditFlags = useMemo(
    () =>
      resolveScenarioEditFlags({
        isSignal,
        isRuntime,
        isSessionReadOnly: graph.isSessionReadOnly,
      }),
    [graph.isSessionReadOnly, isRuntime, isSignal],
  );

  useEffect(() => {
    if (
      scenarioBranch !== 'function' &&
      (selectedNodeKind === 'function-input' || selectedNodeKind === 'function-output')
    ) {
      clearSelection();
    }
  }, [clearSelection, scenarioBranch, selectedNodeKind]);

  const handleUserFunctionListClick = useCallback(
    (functionId: string, draftIndex: number) => {
      if (isSignal || isRuntime) {
        return;
      }
      if (scenarioBranch === 'function') {
        graph.selectUserFunction(functionId, draftIndex);
        clearSelection();
        return;
      }
      const fn = graph.scenarioFunctionDrafts[draftIndex];
      if (fn === undefined || fn.id !== functionId) {
        return;
      }
      setFunctionActionMessage(null);
      setFunctionActionTarget({ functionId, functionName: fn.name });
    },
    [clearSelection, graph, isRuntime, isSignal, scenarioBranch],
  );

  const dismissFunctionAction = useCallback(() => {
    setFunctionActionTarget(null);
    setFunctionActionMessage(null);
  }, []);

  const handleEditUserFunction = useCallback(() => {
    if (functionActionTarget === null) {
      return;
    }
    graph.selectUserFunction(functionActionTarget.functionId, graph.activeFunctionDraftIndex);
    clearSelection();
    dismissFunctionAction();
  }, [clearSelection, dismissFunctionAction, functionActionTarget, graph]);

  const handleOpenFunctionEditor = useCallback(
    (functionId: string) => {
      if (isSignal || isRuntime) {
        return;
      }
      graph.selectUserFunction(functionId);
      clearSelection();
    },
    [clearSelection, graph, isRuntime, isSignal],
  );

  const handleRenameFunction = useCallback(
    (functionId: string, name: string) => {
      graph.updateUserFunctionMeta(functionId, { name });
      if (selectedFunctionId === functionId) {
        setSelectedFunctionName(name);
      }
    },
    [graph, selectedFunctionId],
  );

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (isSignal || isRuntime) {
        return;
      }
      if (scenarioBranch === 'function') {
        return;
      }
      const functionId =
        node.data?.blockKind === 'subgraph' && typeof node.data.functionId === 'string'
          ? node.data.functionId
          : null;
      if (functionId !== null) {
        graph.selectUserFunction(functionId);
        clearSelection();
      }
    },
    [clearSelection, graph, isRuntime, isSignal, scenarioBranch],
  );

  const handleInsertUserFunction = useCallback(() => {
    if (functionActionTarget === null) {
      return;
    }
    const center = viewportApiRef.current?.getCenterFlowPosition();
    const result = graph.insertUserFunctionIntoBranch(
      functionActionTarget.functionId,
      scenarioBranch,
      center,
    );
    if (!result.ok) {
      setFunctionActionMessage(result.message);
      return;
    }
    flashEditHint(`функция «${functionActionTarget.functionName}» добавлена`);
    setFunctionActionTarget(null);
    setFunctionActionMessage(null);
    viewportApiRef.current?.focusNodeIds([result.nodeId]);
  }, [flashEditHint, functionActionTarget, graph, scenarioBranch]);

  const functionInsertDisabled = !isScenarioBranchForFunctionInsert(scenarioBranch);

  const functionPinEditSide = useMemo((): FunctionPinEditSide => {
    if (scenarioBranch !== 'function') {
      return null;
    }
    if (selectedNodeKind === 'function-input') {
      return 'input';
    }
    if (selectedNodeKind === 'function-output') {
      return 'output';
    }
    return null;
  }, [scenarioBranch, selectedNodeKind]);

  const deleteFunctionTargetName = useMemo(() => {
    if (deleteFunctionTarget === null) {
      return null;
    }
    const draft = graph.scenarioFunctionDrafts[deleteFunctionTarget.index];
    return draft?.name ?? null;
  }, [deleteFunctionTarget, graph.scenarioFunctionDrafts]);

  const handleRemoveUserFunction = useCallback(
    (functionId: string, draftIndex: number) => {
      const error = graph.removeUserFunction(functionId, draftIndex);
      if (error !== null) {
        setImportError(error);
        return;
      }
      if (scenarioBranch === 'function') {
        clearSelection();
      }
    },
    [clearSelection, graph, scenarioBranch],
  );

  const handleConnectionDropOnPane = useCallback(
    (payload: BoardConnectionDropOnPanePayload) => {
      if (isSignal || isRuntime) {
        return;
      }
      const nodes =
        scenarioBranch === 'initial'
          ? graph.scenarioInitialNodes
          : scenarioBranch === 'onConnect'
            ? graph.scenarioOnConnectNodes
            : scenarioBranch === 'main'
              ? graph.scenarioMainNodes
              : scenarioBranch === 'alarm'
                ? graph.scenarioAlarmNodes
                : scenarioBranch === 'onStop'
                  ? graph.scenarioOnStopNodes
                  : scenarioBranch === 'onDisconnect'
                    ? graph.scenarioOnDisconnectNodes
                    : graph.scenarioFunctionNodes;
      const suggestions = suggestPaletteNodesForOutgoingConnection(
        nodes,
        payload.sourceNodeId,
        payload.sourceHandle,
        { sourceNode: payload.sourceNode },
      );
      pendingConnectionDropRef.current = payload;
      setConnectionSuggestItems(suggestions);
      setConnectionSuggestOpen(true);
    },
    [
      graph.scenarioAlarmNodes,
      graph.scenarioFunctionNodes,
      graph.scenarioInitialNodes,
      graph.scenarioMainNodes,
      graph.scenarioOnConnectNodes,
      graph.scenarioOnDisconnectNodes,
      graph.scenarioOnStopNodes,
      isRuntime,
      isSignal,
      scenarioBranch,
    ],
  );

  const dismissConnectionSuggest = useCallback(() => {
    setConnectionSuggestOpen(false);
    setConnectionSuggestItems([]);
    pendingConnectionDropRef.current = null;
  }, []);

  const handleConnectionSuggestPick = useCallback(
    (suggestion: PaletteConnectionSuggestion) => {
      const drop = pendingConnectionDropRef.current;
      const viewport = viewportApiRef.current;
      if (drop === null || viewport === null) {
        dismissConnectionSuggest();
        return;
      }
      const flowCenter = viewport.clientToFlowPosition(drop.clientX, drop.clientY);
      graph.addPaletteNodeWithConnection(suggestion.nodeKind, flowCenter, {
        source: drop.sourceNodeId,
        sourceHandle: drop.sourceHandle,
        targetHandle: suggestion.targetHandle,
      });
      dismissConnectionSuggest();
    },
    [dismissConnectionSuggest, graph],
  );

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
      ? scenarioBranch === 'function'
        ? ' Узлы Input и Output останутся.'
        : ' Системный Event-узел останется.'
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

  const canSave =
    !graph.isSessionReadOnly &&
    graph.isDirty &&
    graph.syncStatus !== 'saving' &&
    graph.syncStatus !== 'loading';
  const mode = graph.mode;
  const isSaving = graph.syncStatus === 'saving';
  const isCanvasReadOnly = scenarioEditFlags.isCanvasStructureReadOnly;

  const scenarioCanvas = useMemo(() => {
    if (scenarioBranch === 'initial') {
      return {
        nodes: graph.scenarioInitialNodes,
        edges: graph.scenarioInitialEdges,
        onNodesChange: graph.onScenarioInitialNodesChange,
        onEdgesChange: graph.onScenarioInitialEdgesChange,
        onConnect: graph.onScenarioInitialConnect,
      };
    }
    if (scenarioBranch === 'onConnect') {
      return {
        nodes: graph.scenarioOnConnectNodes,
        edges: graph.scenarioOnConnectEdges,
        onNodesChange: graph.onScenarioOnConnectNodesChange,
        onEdgesChange: graph.onScenarioOnConnectEdgesChange,
        onConnect: graph.onScenarioOnConnectConnect,
      };
    }
    if (scenarioBranch === 'main') {
      return {
        nodes: graph.scenarioMainNodes,
        edges: graph.scenarioMainEdges,
        onNodesChange: graph.onScenarioMainNodesChange,
        onEdgesChange: graph.onScenarioMainEdgesChange,
        onConnect: graph.onScenarioMainConnect,
      };
    }
    if (scenarioBranch === 'alarm') {
      return {
        nodes: graph.scenarioAlarmNodes,
        edges: graph.scenarioAlarmEdges,
        onNodesChange: graph.onScenarioAlarmNodesChange,
        onEdgesChange: graph.onScenarioAlarmEdgesChange,
        onConnect: graph.onScenarioAlarmConnect,
      };
    }
    if (scenarioBranch === 'onStop') {
      return {
        nodes: graph.scenarioOnStopNodes,
        edges: graph.scenarioOnStopEdges,
        onNodesChange: graph.onScenarioOnStopNodesChange,
        onEdgesChange: graph.onScenarioOnStopEdgesChange,
        onConnect: graph.onScenarioOnStopConnect,
      };
    }
    if (scenarioBranch === 'onDisconnect') {
      return {
        nodes: graph.scenarioOnDisconnectNodes,
        edges: graph.scenarioOnDisconnectEdges,
        onNodesChange: graph.onScenarioOnDisconnectNodesChange,
        onEdgesChange: graph.onScenarioOnDisconnectEdgesChange,
        onConnect: graph.onScenarioOnDisconnectConnect,
      };
    }
    return {
      nodes: graph.scenarioFunctionNodes,
      edges: graph.scenarioFunctionEdges,
      onNodesChange: graph.onScenarioFunctionNodesChange,
      onEdgesChange: graph.onScenarioFunctionEdgesChange,
      onConnect: graph.onScenarioFunctionConnect,
    };
  }, [scenarioBranch, graph]);

  const validationErrorNodeIds = useMemo(() => {
    const edges = isSignal ? graph.signalEdges : scenarioCanvas.edges;
    return collectValidationErrorNodeIds(graph.validationIssues, edges);
  }, [graph.validationIssues, graph.signalEdges, isSignal, scenarioCanvas.edges]);

  const collectCanvasSelectedIds = useCallback((): readonly string[] => {
    const fromCanvas = scenarioCanvas.nodes.filter((node) => node.selected).map((node) => node.id);
    return [
      ...new Set([
        ...fromCanvas,
        ...marqueeSelectedIds,
        ...(selectedNodeId !== null ? [selectedNodeId] : []),
      ]),
    ];
  }, [marqueeSelectedIds, scenarioCanvas.nodes, selectedNodeId]);

  const handlePaneClick = useCallback((): boolean => {
    setClipboardPaneModal(null);
    setSelectionActionOpen(false);
    setMarqueeSelectedIds([]);
    clearSelection();
    return false;
  }, [clearSelection]);

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (isSignal || isRuntime || graph.isSessionReadOnly) {
        return;
      }
      lastCanvasPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
      const selectedIds = collectCanvasSelectedIds();
      if (selectedIds.length >= 2) {
        setClipboardPaneModal('selection');
        logBoardClipboardStep(graph.showInfoLogs, 'pane-modal-open', {
          mode: 'selection',
          selectedCount: selectedIds.length,
          branch: scenarioBranch,
          trigger: 'contextmenu',
        });
        return;
      }
      if (graph.boardClipboardNodeCount > 0) {
        setClipboardPaneModal('paste');
        logBoardClipboardStep(graph.showInfoLogs, 'pane-modal-open', {
          mode: 'paste',
          clipboardCount: graph.boardClipboardNodeCount,
          branch: scenarioBranch,
          trigger: 'contextmenu',
        });
      }
    },
    [
      collectCanvasSelectedIds,
      graph.boardClipboardNodeCount,
      graph.isSessionReadOnly,
      graph.showInfoLogs,
      isRuntime,
      isSignal,
      scenarioBranch,
    ],
  );

  const clearCanvasNodeSelection = useCallback(() => {
    if (isSignal) {
      return;
    }
    const changes: NodeChange[] = scenarioCanvas.nodes.map((node) => ({
      type: 'select',
      id: node.id,
      selected: false,
    }));
    scenarioCanvas.onNodesChange(changes);
  }, [isSignal, scenarioCanvas]);

  const selectCanvasNodeById = useCallback(
    (nodeId: string) => {
      if (isSignal || isRuntime) {
        return;
      }
      const changes: NodeChange[] = scenarioCanvas.nodes.map((node) => ({
        type: 'select',
        id: node.id,
        selected: node.id === nodeId,
      }));
      scenarioCanvas.onNodesChange(changes);
      viewportApiRef.current?.focusNodeIds([nodeId]);
    },
    [isRuntime, isSignal, scenarioCanvas],
  );

  const selectedFunctionBlockInstances = useMemo(() => {
    if (selectedFunctionId === null || isSignal || scenarioBranch === 'function') {
      return [];
    }
    return listSubgraphBlocksForFunction(scenarioCanvas.nodes, selectedFunctionId);
  }, [isSignal, scenarioBranch, scenarioCanvas.nodes, selectedFunctionId]);

  const dismissSelectionAction = useCallback(() => {
    setSelectionActionOpen(false);
    setMarqueeSelectedIds([]);
    clearCanvasNodeSelection();
  }, [clearCanvasNodeSelection]);

  const closeSelectionActionModal = useCallback(() => {
    setSelectionActionOpen(false);
  }, []);

  const handleMarqueeSelection = useCallback(
    (payload: BoardMarqueeSelectionPayload) => {
      if (isSignal || isRuntime) {
        return;
      }
      setMarqueeSelectedIds(payload.nodeIds);
      setSelectionActionOpen(true);
    },
    [isRuntime, isSignal],
  );

  const marqueeSelectionMeta = useMemo(() => {
    const selected = scenarioCanvas.nodes.filter((node) => marqueeSelectedIds.includes(node.id));
    const functionEligibleIds = pickCollapseEligibleNodeIds(
      scenarioCanvas.nodes,
      marqueeSelectedIds,
      isCollapseToFunctionEligibleNode,
    );
    const groupEligibleIds = pickCollapseEligibleNodeIds(
      scenarioCanvas.nodes,
      marqueeSelectedIds,
      isCollapseToGroupEligibleNode,
    );
    const count = selected.length;
    const idSet = new Set(marqueeSelectedIds);
    const collapseFunctionDisabled =
      scenarioBranch === 'function' || !isCollapseToFunctionEnabled(scenarioCanvas.nodes, marqueeSelectedIds);
    const collapseGroupDisabled = !isCollapseToGroupEnabled(scenarioCanvas.nodes, marqueeSelectedIds);
    return {
      count,
      functionEligibleIds,
      groupEligibleIds,
      collapseFunctionDisabled,
      collapseGroupDisabled,
      collapseFunctionDisabledReason:
        scenarioBranch === 'function'
          ? 'Только на ветках сценария (не в теле функции)'
          : functionEligibleIds.length < 2
            ? 'Нужно ≥2 обычных узла (системные Event/loop не считаются)'
            : undefined,
      collapseGroupDisabledReason:
        groupEligibleIds.length < 2
          ? 'Нужно ≥2 обычных узла вне группы (системные Event/loop не считаются)'
          : undefined,
      execChainLayoutDisabled: !isExecChainLayoutEnabled(
        scenarioCanvas.nodes,
        scenarioCanvas.edges,
        idSet,
      ),
    };
  }, [marqueeSelectedIds, scenarioBranch, scenarioCanvas.edges, scenarioCanvas.nodes]);

  const applyAlignPositions = useCallback(
    (positions: Map<string, { readonly x: number; readonly y: number }>) => {
      if (positions.size === 0) {
        return;
      }
      graph.captureEditUndoSnapshot('align-layout', { nodeCount: positions.size });
      const changes: NodeChange[] = [...positions.entries()].map(([id, position]) => ({
        type: 'position',
        id,
        position,
      }));
      scenarioCanvas.onNodesChange(changes);
      dismissSelectionAction();
    },
    [dismissSelectionAction, graph, scenarioCanvas],
  );

  const handleAlignMode = useCallback(
    (mode: BoardAlignMode) => {
      if (isSignal || isRuntime || marqueeSelectedIds.length < 2) {
        return;
      }
      const idSet = new Set(marqueeSelectedIds);
      const positions = computeAlignPositions(scenarioCanvas.nodes, idSet, mode);
      applyAlignPositions(positions);
    },
    [applyAlignPositions, isRuntime, isSignal, marqueeSelectedIds, scenarioCanvas],
  );

  const handleSmartAlign = useCallback(() => {
    if (isSignal || isRuntime || marqueeSelectedIds.length < 2) {
      return;
    }
    const idSet = new Set(marqueeSelectedIds);
    const positions = computeSmartAlignPositions(scenarioCanvas.nodes, idSet);
    applyAlignPositions(positions);
  }, [applyAlignPositions, isRuntime, isSignal, marqueeSelectedIds, scenarioCanvas]);

  const handleExecChainLayout = useCallback(() => {
    if (isSignal || isRuntime || marqueeSelectedIds.length < 2) {
      return;
    }
    const idSet = new Set(marqueeSelectedIds);
    const positions = computeExecChainLayoutPositions(
      scenarioCanvas.nodes,
      scenarioCanvas.edges,
      idSet,
    );
    applyAlignPositions(positions);
  }, [applyAlignPositions, isRuntime, isSignal, marqueeSelectedIds, scenarioCanvas]);

  const isLoopExecLayoutBranch =
    !isSignal && (scenarioBranch === 'main' || scenarioBranch === 'alarm');

  const loopExecLayoutEnabled = useMemo(() => {
    if (!isLoopExecLayoutBranch) {
      return false;
    }
    return isLoopBranchExecLayoutEnabled(
      scenarioCanvas.nodes,
      scenarioCanvas.edges,
      scenarioBranch as LoopExecLayoutBranch,
    );
  }, [isLoopExecLayoutBranch, scenarioBranch, scenarioCanvas.edges, scenarioCanvas.nodes]);

  const loopExecLayoutCanonical = useMemo(() => {
    if (!isLoopExecLayoutBranch) {
      return false;
    }
    return isLoopBranchExecLayoutCanonical(
      scenarioCanvas.nodes,
      scenarioCanvas.edges,
      scenarioBranch as LoopExecLayoutBranch,
    );
  }, [isLoopExecLayoutBranch, scenarioBranch, scenarioCanvas.edges, scenarioCanvas.nodes]);

  const loopExecLayoutButtonDisabled =
    !loopExecLayoutEnabled || execLayoutPreview !== null || loopExecLayoutCanonical;

  const loopExecLayoutButtonTitle = loopExecLayoutCanonical
    ? 'Exec-цепочка уже упорядочена. Переместите узлы или добавьте новые, чтобы снова применить layout.'
    : 'Упорядочить exec-цепочку от entry ветки (dagre LR)';

  const layoutGhostNodes = useMemo(() => {
    if (execLayoutPreview === null) {
      return [];
    }
    return buildLayoutGhostNodes(scenarioCanvas.nodes, execLayoutPreview);
  }, [execLayoutPreview, scenarioCanvas.nodes]);

  const execLayoutMovedCount = useMemo(() => {
    if (execLayoutPreview === null) {
      return 0;
    }
    let count = 0;
    for (const [nodeId, next] of execLayoutPreview) {
      const node = scenarioCanvas.nodes.find((item) => item.id === nodeId);
      if (node === undefined) {
        continue;
      }
      if (node.position.x !== next.x || node.position.y !== next.y) {
        count += 1;
      }
    }
    return count;
  }, [execLayoutPreview, scenarioCanvas.nodes]);

  const handleRequestBranchExecLayout = useCallback(() => {
    if (!isLoopExecLayoutBranch || isRuntime || !loopExecLayoutEnabled || loopExecLayoutCanonical) {
      return;
    }
    dismissSelectionAction();
    const entryId = resolveLoopBranchExecEntryId(scenarioBranch as LoopExecLayoutBranch);
    const positions = computeExecChainLayoutFromEntry(
      scenarioCanvas.nodes,
      scenarioCanvas.edges,
      entryId,
    );
    setExecLayoutPreview(positions);
  }, [
    dismissSelectionAction,
    isLoopExecLayoutBranch,
    isRuntime,
    loopExecLayoutEnabled,
    loopExecLayoutCanonical,
    scenarioBranch,
    scenarioCanvas.edges,
    scenarioCanvas.nodes,
  ]);

  const handleDismissExecLayoutPreview = useCallback(() => {
    setExecLayoutPreview(null);
  }, []);

  const handleApplyExecLayoutPreview = useCallback(() => {
    if (execLayoutPreview === null) {
      return;
    }
    applyAlignPositions(execLayoutPreview);
    setExecLayoutPreview(null);
  }, [applyAlignPositions, execLayoutPreview]);

  const handleCollapseToFunction = useCallback(() => {
    if (isSignal || isRuntime) {
      return;
    }
    const error = graph.collapseMarqueeToFunction(
      scenarioBranch,
      marqueeSelectionMeta.functionEligibleIds,
    );
    if (error !== null) {
      setImportError(error);
    }
    dismissSelectionAction();
  }, [
    dismissSelectionAction,
    graph,
    isRuntime,
    isSignal,
    marqueeSelectionMeta.functionEligibleIds,
    scenarioBranch,
  ]);

  const handleCollapseToGroup = useCallback(() => {
    if (isRuntime) {
      return;
    }
    const branch: ScenarioCommentGroupBranch = isSignal ? 'signal' : scenarioBranch;
    const result = graph.collapseMarqueeToCommentGroup(
      branch,
      marqueeSelectionMeta.groupEligibleIds,
    );
    if (result.error !== null) {
      setImportError(result.error);
      dismissSelectionAction();
      return;
    }
    closeSelectionActionModal();
    if (result.groupNode !== null) {
      handleSelectionChange({ nodes: [result.groupNode], edges: [] });
    }
  }, [
    closeSelectionActionModal,
    dismissSelectionAction,
    graph,
    handleSelectionChange,
    isRuntime,
    isSignal,
    marqueeSelectionMeta.groupEligibleIds,
    scenarioBranch,
  ]);

  useEffect(() => {
    if (isRuntime && selectionActionOpen) {
      dismissSelectionAction();
    }
  }, [dismissSelectionAction, isRuntime, selectionActionOpen]);

  const canUndoRef = useRef(graph.canUndoLastEdit);
  canUndoRef.current = graph.canUndoLastEdit;
  const undoLastEditRef = useRef(graph.undoLastEdit);
  undoLastEditRef.current = graph.undoLastEdit;
  const copyBoardSelectionRef = useRef(graph.copyBoardSelection);
  copyBoardSelectionRef.current = graph.copyBoardSelection;
  const pasteBoardSelectionRef = useRef(graph.pasteBoardSelection);
  pasteBoardSelectionRef.current = graph.pasteBoardSelection;
  const scenarioCanvasRef = useRef(scenarioCanvas);
  scenarioCanvasRef.current = scenarioCanvas;
  const marqueeSelectedIdsRef = useRef(marqueeSelectedIds);
  marqueeSelectedIdsRef.current = marqueeSelectedIds;
  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;

  const collectForcedSelectionIds = useCallback((): readonly string[] => {
    const canvas = scenarioCanvasRef.current;
    const fromCanvas = canvas.nodes.filter((node) => node.selected).map((node) => node.id);
    return [
      ...new Set([
        ...fromCanvas,
        ...marqueeSelectedIdsRef.current,
        ...(selectedNodeIdRef.current !== null ? [selectedNodeIdRef.current] : []),
      ]),
    ];
  }, []);

  const performBoardCopy = useCallback((): number | null => {
    const forcedIds = collectForcedSelectionIds();
    if (forcedIds.length === 0) {
      return null;
    }
    const canvas = scenarioCanvasRef.current;
    const copiedCount = copyBoardSelectionRef.current({
      forcedSelectedIds: forcedIds,
      branchNodes: canvas.nodes,
      branchEdges: canvas.edges,
    });
    if (copiedCount !== null) {
      flashClipboardHint(copiedCount);
    }
    return copiedCount;
  }, [collectForcedSelectionIds, flashClipboardHint]);

  const performBoardPaste = useCallback((): boolean => {
    const pointer = lastCanvasPointerRef.current;
    const anchor =
      pointer !== null
        ? viewportApiRef.current?.clientToFlowPosition(pointer.clientX, pointer.clientY)
        : viewportApiRef.current?.getCenterFlowPosition();
    const pastedIds = pasteBoardSelectionRef.current(anchor);
    if (pastedIds === null) {
      return false;
    }
    if (pastedIds.length > 0) {
      viewportApiRef.current?.focusNodeIds(pastedIds);
    }
    return true;
  }, []);

  const closeClipboardPaneModal = useCallback(() => {
    setClipboardPaneModal(null);
  }, []);

  const handleClipboardPaneCopy = useCallback(() => {
    if (performBoardCopy() !== null) {
      closeClipboardPaneModal();
    }
  }, [closeClipboardPaneModal, performBoardCopy]);

  const handleClipboardPaneDelete = useCallback(() => {
    const removed = graph.removeNodesFromCurrentBranch(collectForcedSelectionIds());
    if (removed > 0) {
      closeClipboardPaneModal();
      dismissSelectionAction();
    }
  }, [closeClipboardPaneModal, collectForcedSelectionIds, dismissSelectionAction, graph]);

  const handleClipboardPanePaste = useCallback(() => {
    if (performBoardPaste()) {
      closeClipboardPaneModal();
    }
  }, [closeClipboardPaneModal, performBoardPaste]);

  const handleClipboardPaneClear = useCallback(() => {
    graph.clearBoardClipboard();
    setClipboardHint(null);
    closeClipboardPaneModal();
  }, [closeClipboardPaneModal, graph]);

  const clipboardPaneSelectedCount = useMemo(() => {
    const fromCanvas = scenarioCanvas.nodes.filter((node) => node.selected).map((node) => node.id);
    return new Set([
      ...fromCanvas,
      ...marqueeSelectedIds,
      ...(selectedNodeId !== null ? [selectedNodeId] : []),
    ]).size;
  }, [marqueeSelectedIds, scenarioCanvas.nodes, selectedNodeId]);

  const runBoardClipboardHotkey = useCallback((event: KeyboardEvent): boolean => {
    if (!(event.ctrlKey || event.metaKey)) {
      return false;
    }
    const target = event.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
        return false;
      }
    }
    if (event.code === 'KeyC') {
      const copiedCount = performBoardCopy();
      if (copiedCount !== null) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    }
    if (event.code === 'KeyV') {
      if (performBoardPaste()) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    }
    return false;
  }, [performBoardCopy, performBoardPaste]);

  useEffect(() => {
    if (!selectionActionOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSelectionActionModal();
        return;
      }
      if (!isRuntime && !isSignal) {
        runBoardClipboardHotkey(event);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeSelectionActionModal, isRuntime, isSignal, runBoardClipboardHotkey, selectionActionOpen]);

  useEffect(() => {
    if (clipboardPaneModal === null) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeClipboardPaneModal();
        return;
      }
      if (!isRuntime && !isSignal) {
        runBoardClipboardHotkey(event);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clipboardPaneModal, closeClipboardPaneModal, isRuntime, isSignal, runBoardClipboardHotkey]);

  const handleUndoLastEdit = useCallback(() => {
    if (!graph.canUndoLastEdit) {
      return;
    }
    graph.undoLastEdit();
  }, [graph]);

  useEffect(() => {
    if (isRuntime) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
      if (!isUndo || !canUndoRef.current) {
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
      }
      event.preventDefault();
      event.stopPropagation();
      undoLastEditRef.current();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isRuntime]);

  useEffect(() => {
    if (isRuntime || isSignal) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      runBoardClipboardHotkey(event);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isRuntime, isSignal, runBoardClipboardHotkey]);

  const runtimeExecHighlight = useMemo(() => {
    if (!isRuntime || isSignal) {
      return computeRuntimeExecHighlight([], [], null);
    }
    return computeRuntimeExecHighlight(
      scenarioCanvas.nodes,
      scenarioCanvas.edges,
      graph.runtimeState.activeNodeId,
    );
  }, [
    graph.runtimeState.activeNodeId,
    isRuntime,
    isSignal,
    scenarioCanvas.edges,
    scenarioCanvas.nodes,
  ]);

  const canvasLabel = isSignal ? 'Signal' : BRANCH_TAB_LABEL[scenarioBranch];
  const canvasViewportFitKey = isSignal
    ? 'signal'
    : `scenario:${scenarioBranch}:${graph.activeFunctionId}`;

  const scenarioTitle = isSignal ? SIGNAL_LAYER_TITLE : BRANCH_SCENARIO_TITLE[scenarioBranch];

  const canvasBreadcrumbSegments = useMemo(
    () =>
      buildBoardCanvasBreadcrumb({
        layer: isSignal ? 'signal' : 'scenario',
        scenarioBranch,
        functionName:
          !isSignal && scenarioBranch === 'function' ? graph.scenarioFunctionMeta.name : null,
      }),
    [graph.scenarioFunctionMeta.name, isSignal, scenarioBranch],
  );

  const selectedVariable = graph.variables.find((item) => item.id === selectedVariableId);
  const selectedVariableName = selectedVariable?.name ?? '';
  const selectedVariableTypeLabel =
    selectedVariable !== undefined ? referenceTypeLabel(selectedVariable.type) : null;

  const runtimeInspection = useMemo(() => {
    if (!isRuntime || selectedNodeId === null || isSignal) {
      return null;
    }
    return graph.inspectRuntimeNode(
      selectedNodeId,
      scenarioBranch,
      scenarioCanvas.nodes,
      scenarioCanvas.edges,
    );
  }, [
    graph,
    isRuntime,
    isSignal,
    scenarioBranch,
    scenarioCanvas.edges,
    scenarioCanvas.nodes,
    selectedNodeId,
  ]);

  const printLastOutput =
    selectedNodeId !== null && selectedNodeKind === 'print'
      ? graph.runtimeState.printOutputs[selectedNodeId] ?? null
      : null;

  const headerContentOffsetClass = boardHeaderContentOffsetClass(leftSidebarCollapsed);

  return (
    <div className="flex h-full min-h-0 flex-col bg-base-100 [scrollbar-gutter:stable]" data-testid="device-board-shell">
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

        <div className={`flex min-w-0 flex-1 items-center gap-3 ${headerContentOffsetClass}`}>
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
            title={graph.isSessionReadOnly ? 'Сохранение недоступно в режиме просмотра системного UserCase' : undefined}
            onClick={() => void graph.saveScenario()}
          >
            Сохранить
          </button>
          {graph.serverFirstFlags ? (
            <BoardServerFirstBadges
              flags={graph.serverFirstFlags}
              perspective={serverFirstPerspective}
            />
          ) : graph.isSessionReadOnly ? (
            <span className="badge badge-ghost badge-sm shrink-0" title={graph.sessionTitle ?? undefined}>
              Только просмотр
            </span>
          ) : null}
          {graph.isCompetitionMode ? (
            <span
              className="badge badge-warning badge-outline badge-sm shrink-0"
              title="Конкурсный сценарий: структура заблокирована, параметры можно менять"
            >
              Конкурс
            </span>
          ) : null}
          <BoardCanvasBreadcrumb
            segments={canvasBreadcrumbSegments}
            detailTitle={scenarioTitle}
          />
          {isLoopExecLayoutBranch && !isRuntime ? (
            <button
              type="button"
              className="btn btn-outline btn-primary btn-xs h-8 min-h-8 shrink-0 gap-1 px-2"
              disabled={loopExecLayoutButtonDisabled}
              title={loopExecLayoutButtonTitle}
              onClick={handleRequestBranchExecLayout}
            >
              <span className="badge badge-primary badge-outline badge-xs">exec · LR</span>
              Упорядочить цепочку
            </button>
          ) : null}
          {graph.syncConflict ? (
            <div
              className="alert alert-warning flex shrink-0 items-center gap-2 py-1 pl-3 pr-1"
              role="status"
            >
              <span className="text-xs">
                {graph.syncError ?? 'На сервере более новая версия сценария'}
              </span>
              <button
                type="button"
                className="btn btn-xs btn-outline"
                disabled={graph.syncStatus === 'loading'}
                onClick={() => void graph.reloadScenarioFromServer()}
              >
                Загрузить с сервера
              </button>
            </div>
          ) : syncLabel !== null ? (
            <span className="shrink-0 text-xs text-error" title={graph.syncError ?? undefined}>
              {syncLabel}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showRunControls ? (
            <>
              <label className="label cursor-pointer shrink-0 gap-1.5 py-0">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs checkbox-primary"
                  checked={graph.showInfoLogs}
                  onChange={(event) => graph.setShowInfoLogs(event.target.checked)}
                  aria-label="Показывать служебные логи INFO"
                />
                <span className="label-text text-xs font-medium">INFO</span>
              </label>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                disabled={graph.scenarioTraceLineCount === 0}
                onClick={() => void handleCopyScenarioTrace()}
                title="Копировать буфер [device-board] логов в буфер обмена"
                aria-label="Копировать trace логов сценария"
              >
                Copy trace
                {graph.scenarioTraceLineCount > 0 ? ` (${graph.scenarioTraceLineCount})` : ''}
              </button>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                disabled={graph.scenarioTraceLineCount === 0}
                onClick={handleDownloadScenarioTrace}
                title="Скачать trace как .txt"
                aria-label="Скачать trace логов сценария"
              >
                ↓
              </button>
              <PlaybackClusterControl
                  isRunning={graph.runtimeState.isRunning}
                  isPaused={graph.runtimeState.isPaused}
                  canRun={graph.canRun}
                  runDisabledReason={graph.runDisabledReason}
                  onStart={() => graph.startScenario()}
                  onResume={() => graph.resumeScenario()}
                  onPause={() => graph.pauseScenario()}
                  onStop={() => graph.stopScenario('user')}
                />

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
                {traceCopyStatus !== null ? `. ${traceCopyStatus}` : ''}
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
                <button
                  type="button"
                  onClick={() => void graph.exportJson(isSignal ? 'signal' : 'scenario')}
                >
                  {isSignal ? 'Export JSON' : `Export ${BRANCH_TAB_LABEL[scenarioBranch]}`}
                </button>
              </li>
              {!isSignal ? (
                <li>
                  <button type="button" onClick={() => void graph.exportFullUserCaseJson()}>
                    Export full UserCase
                  </button>
                </li>
              ) : null}
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
        <div
          className="absolute inset-0 z-0"
          onPointerMove={(event) => {
            lastCanvasPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
          }}
        >
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
            onNodeDoubleClick={handleNodeDoubleClick}
            onPaneClick={handlePaneClick}
            onPaneContextMenu={
              !isSignal && !isRuntime && !graph.isSessionReadOnly ? handlePaneContextMenu : undefined
            }
            pulseEdges={isRuntime}
            runtimeHighlightNodeIds={runtimeExecHighlight.nodeIds}
            validationErrorNodeIds={validationErrorNodeIds}
            highlightExecEdgeIds={runtimeExecHighlight.edgeIds}
            readOnly={isCanvasReadOnly}
            viewNavigationOnly={scenarioEditFlags.isScenarioViewOnly}
            ariaLabel={`Канвас: ${canvasLabel}`}
            onViewportApiReady={handleViewportApiReady}
            viewportFitKey={canvasViewportFitKey}
            onConnectionDropOnPane={handleConnectionDropOnPane}
            onMarqueeSelection={
              !isSignal &&
              !isRuntime &&
              !graph.isSessionReadOnly &&
              execLayoutPreview === null
                ? handleMarqueeSelection
                : undefined
            }
            layoutGhostNodes={layoutGhostNodes}
          />
        </div>

        {!isRuntime ? (
          <div
            className={`pointer-events-none absolute bottom-3 z-20 ${headerContentOffsetClass}`}
          >
            <div className="pointer-events-auto pl-3">
              <BoardEditUndoControl
                canUndo={graph.canUndoLastEdit}
                lastActionLabel={graph.lastUndoableEditLabel}
                onUndo={handleUndoLastEdit}
                clipboardHint={clipboardHint}
              />
            </div>
          </div>
        ) : null}

        <BoardBranchImportModal
          pending={graph.pendingBranchImport}
          variables={graph.variables}
          onConfirm={(mapping) => {
            const error = graph.confirmBranchImport(mapping);
            if (error !== null) {
              setImportError(error);
            }
          }}
          onDismiss={graph.cancelBranchImport}
        />

        <aside className="absolute bottom-0 left-0 top-0 z-10" aria-label="Палитра и ветки">
          <BoardLeftSidebar
            collapsed={leftSidebarCollapsed}
            onToggleCollapse={() => setLeftSidebarCollapsed((v) => !v)}
            activeBranch={scenarioBranch}
            isScenarioLayer={!isSignal}
            isRuntime={isRuntime}
            runtimeInspection={runtimeInspection}
            onSelectBranch={handleSelectBranch}
            signalAdvanced={signalAdvanced}
            isSignalLayer={isSignal}
            onSelectSignal={handleSelectSignal}
            variables={graph.variables}
            onAddVariable={graph.addVariable}
            onRenameVariable={graph.renameVariable}
            onRemoveVariable={graph.removeVariable}
            onAddVariableNode={addVariableNodeAtViewportCenter}
            scenarioFunctions={graph.scenarioFunctionDrafts}
            activeFunctionId={graph.activeFunctionId}
            activeFunctionDraftIndex={graph.activeFunctionDraftIndex}
            onSelectFunction={handleUserFunctionListClick}
            onCreateFunction={() => {
              clearSelection();
              graph.createUserFunction();
            }}
            onRenameFunction={handleRenameFunction}
            onRemoveFunction={handleRemoveUserFunction}
            constructorCrudDisabled={scenarioEditFlags.constructorCrudDisabled}
          />
        </aside>
        <aside className="absolute bottom-0 right-0 top-0 z-10" aria-label="Инспектор и палитра">
          <BoardRightSidebar
            collapsed={rightSidebarCollapsed}
            onToggleCollapse={() => setRightSidebarCollapsed((v) => !v)}
            selectedNodeId={selectedNodeId}
            selectedNodeLabel={selectedNodeLabel}
            selectedNodeKind={selectedNodeKind}
            selectedMicrophoneId={selectedMicrophoneId}
            selectedCollectorConfig={selectedCollectorConfig}
            selectedRecordingPolicy={selectedRecordingPolicy}
            selectedRecordingPolicyWired={selectedRecordingPolicyWired}
            selectedFftTrendsPolicy={selectedFftTrendsPolicy}
            selectedSequenceConfig={selectedSequenceConfig}
            selectedAsyncJobConfig={selectedAsyncJobConfig}
            selectedVariableName={selectedVariableName}
            selectedVariableId={selectedVariableId}
            selectedVariableType={selectedVariable?.type ?? null}
            selectedVariableValue={selectedVariable?.value ?? null}
            selectedGetterPure={selectedGetterPure}
            selectedGetterPureLocked={selectedGetterPureLocked}
            selectedIsCommentGroup={selectedIsCommentGroup}
            selectedGroupTitle={selectedGroupTitle}
            selectedGroupDescription={selectedGroupDescription}
            selectedGroupFrameColor={selectedGroupFrameColor}
            selectedVariableTypeLabel={selectedVariableTypeLabel}
            selectedFunctionId={selectedFunctionId}
            selectedFunctionName={selectedFunctionName}
            selectedFunctionBlockInstances={selectedFunctionBlockInstances}
            microphoneOptions={microphoneOptions}
            microphoneOptionsLoading={microphoneOptionsLoading}
            canEditScenario={scenarioEditFlags.canEditScenario}
            isFunctionBranch={!isSignal && scenarioBranch === 'function'}
            functionMeta={!isSignal && scenarioBranch === 'function' ? graph.scenarioFunctionMeta : null}
            functionPinEditSide={functionPinEditSide}
            isRuntime={isRuntime}
            runtimeInspection={runtimeInspection}
            printLastOutput={printLastOutput}
            onAddLegacyNode={graph.addScenarioNodeToCurrentBranch}
            onAddPaletteNode={addPaletteNodeAtViewportCenter}
            onMicrophoneIdChange={graph.updatePaletteNodeMicrophoneId}
            onCollectorConfigChange={graph.updateCollectorConfig}
            onRecordingPolicyChange={graph.updateRecordingPolicy}
            onFftTrendsPolicyChange={graph.updateFftTrendsPolicy}
            onSequenceConfigChange={graph.updateSequenceConfig}
            onAsyncJobConfigChange={graph.updateAsyncJobConfig}
            onAssignVariableName={graph.assignNodeVariableName}
            onVariableGetterPureChange={(nodeId, pure) => {
              graph.setVariableGetterPure(nodeId, pure);
              if (nodeId === selectedNodeId) {
                setSelectedGetterPure(pure);
              }
            }}
            onVariableValueChange={graph.updateVariableValue}
            onCommentGroupMetadataChange={(nodeId, patch) => {
              const branch: ScenarioCommentGroupBranch = isSignal ? 'signal' : scenarioBranch;
              graph.updateCommentGroupMetadata(branch, nodeId, patch);
              if (nodeId !== selectedNodeId) {
                return;
              }
              if (patch.title !== undefined) {
                setSelectedGroupTitle(patch.title.trim() || 'Группа');
                setSelectedNodeLabel(patch.title.trim() || 'Группа');
              }
              if (patch.description !== undefined) {
                setSelectedGroupDescription(patch.description);
              }
              if (patch.frameColor !== undefined) {
                setSelectedGroupFrameColor(resolveScenarioCommentGroupFrameColor(patch.frameColor));
              }
            }}
            onUpdateFunctionMeta={graph.updateActiveFunctionMeta}
            onOpenFunctionEditor={handleOpenFunctionEditor}
            onSelectFunctionBlockInstance={selectCanvasNodeById}
            onAddFunctionPin={(side) => {
              const error = graph.addActiveFunctionPin(side, 'data');
              if (error !== null) {
                setImportError(error);
              }
            }}
            onUpdateFunctionPin={(side, pinId, patch) => {
              const error = graph.updateActiveFunctionPin(side, pinId, patch);
              if (error !== null) {
                setImportError(error);
              }
            }}
            onRemoveFunctionPin={(side, pinId) => {
              const error = graph.removeActiveFunctionPin(side, pinId);
              if (error !== null) {
                setImportError(error);
              }
            }}
            onDeleteFunction={() => {
              if (graph.activeFunctionId !== '') {
                setDeleteFunctionTarget({
                  id: graph.activeFunctionId,
                  index: graph.activeFunctionDraftIndex,
                });
              }
            }}
            onClearBoard={handleClearBoard}
          />
        </aside>
      </div>

      <BoardConnectionSuggestModal
        open={connectionSuggestOpen}
        suggestions={connectionSuggestItems}
        onPick={handleConnectionSuggestPick}
        onDismiss={dismissConnectionSuggest}
      />

      <BoardExecLayoutPreviewModal
        open={execLayoutPreview !== null}
        branchLabel={BRANCH_TAB_LABEL[scenarioBranch]}
        movedNodeCount={execLayoutMovedCount}
        onApply={handleApplyExecLayoutPreview}
        onDismiss={handleDismissExecLayoutPreview}
      />

      <BoardFunctionActionModal
        open={functionActionTarget !== null && !isRuntime && !isSignal}
        functionName={functionActionTarget?.functionName ?? ''}
        activeBranch={scenarioBranch}
        insertDisabled={functionInsertDisabled}
        insertDisabledReason={functionActionMessage ?? undefined}
        onEditFunction={handleEditUserFunction}
        onInsertIntoScenario={handleInsertUserFunction}
        onDismiss={dismissFunctionAction}
      />

      <DeleteFunctionModal
        functionName={deleteFunctionTargetName}
        onClose={() => setDeleteFunctionTarget(null)}
        onConfirm={() => {
          if (deleteFunctionTarget !== null) {
            handleRemoveUserFunction(deleteFunctionTarget.id, deleteFunctionTarget.index);
            setDeleteFunctionTarget(null);
          }
        }}
      />

      <BoardSelectionActionModal
        open={selectionActionOpen && !isRuntime}
        selectedCount={marqueeSelectionMeta.count}
        collapseFunctionDisabled={marqueeSelectionMeta.collapseFunctionDisabled}
        collapseGroupDisabled={marqueeSelectionMeta.collapseGroupDisabled}
        collapseFunctionDisabledReason={marqueeSelectionMeta.collapseFunctionDisabledReason}
        collapseGroupDisabledReason={marqueeSelectionMeta.collapseGroupDisabledReason}
        execChainLayoutDisabled={marqueeSelectionMeta.execChainLayoutDisabled}
        onCollapseToFunction={handleCollapseToFunction}
        onCollapseToGroup={handleCollapseToGroup}
        onAlignMode={handleAlignMode}
        onSmartAlign={handleSmartAlign}
        onExecChainLayout={handleExecChainLayout}
        onDismiss={closeSelectionActionModal}
      />

      <BoardClipboardPaneModal
        open={clipboardPaneModal !== null && !isRuntime}
        mode={clipboardPaneModal ?? 'selection'}
        selectedCount={clipboardPaneSelectedCount}
        clipboardCount={graph.boardClipboardNodeCount}
        copyDisabled={graph.isStructureLocked || clipboardPaneSelectedCount < 1}
        pasteDisabled={graph.isStructureLocked || graph.boardClipboardNodeCount === 0}
        deleteDisabled={graph.isStructureLocked || clipboardPaneSelectedCount < 1}
        onCopy={handleClipboardPaneCopy}
        onDelete={handleClipboardPaneDelete}
        onPaste={handleClipboardPanePaste}
        onClearClipboard={handleClipboardPaneClear}
        onDismiss={closeClipboardPaneModal}
      />

      {graph.isCompetitionMode ? (
        <CompetitionRunTimer
          isRunning={isRuntime}
          runStartedAtMs={graph.runtimeState.runStartedAtMs}
          timeoutSec={graph.competitionTimeoutSec}
        />
      ) : null}
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
  loadUserCaseDocument,
  serverFirstState = null,
  serverFirstPerspective = 'field',
}) => {
  const { session } = useDeviceBoardMode();

  return (
  <DeviceBoardGraphProvider
    runtimeHost={runtimeHost}
    persistAdapter={persistAdapter}
    initialHydratedState={initialHydratedState}
    deviceLive={deviceLive}
    loadUserCaseDocument={loadUserCaseDocument}
    boardSession={session}
    serverFirstState={serverFirstState}
  >
    <DeviceBoardShellInner
      onRequestExit={onRequestExit}
      exitLabel={exitLabel}
      showRunControls={showRunControls}
      runtimeHost={runtimeHost}
      serverFirstPerspective={serverFirstPerspective}
    />
  </DeviceBoardGraphProvider>
  );
};
