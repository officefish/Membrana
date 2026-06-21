import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScenarioCommentGroupBranch } from '@membrana/core';
import type {
  ScenarioNodeKind,
  ScenarioCollectorConfig,
  ScenarioFftTrendsPolicy,
  ScenarioRecordingPolicy,
} from '@membrana/core';
import {
  isPureEligibleScenarioNodeKind,
  resolveScenarioCollectorConfig,
  resolveScenarioFftTrendsPolicy,
  resolveScenarioGraphNodePure,
  resolveScenarioRecordingPolicy,
  resolveScenarioCommentGroupFrameColor,
  DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR,
} from '@membrana/core';
import type { ScenarioCommentGroupFrameColor } from '@membrana/core';
import type { Edge, NodeChange, OnSelectionChangeParams } from '@xyflow/react';

import { useDeviceBoardMode } from '../context/device-board-mode-context.js';
import { DeviceBoardGraphProvider, useDeviceBoardGraph } from '../context/device-board-graph-context.js';
import type { ScenarioMicrophoneOption, ScenarioRuntimeHost } from '../runtime/index.js';
import type { DeviceBoardPersistAdapter } from '../persist/device-board-persist.js';
import type { HydratedBoardState } from '../graph/hydrate-board-from-document.js';
import type { PaletteConnectionSuggestion } from '../graph/connection-suggest.js';
import { suggestPaletteNodesForOutgoingConnection } from '../graph/index.js';
import {
  BRANCH_TAB_LABEL,
  BRANCH_SCENARIO_TITLE,
  BOARD_HEADER_CONTENT_OFFSET_CLASS,
  SIGNAL_LAYER_TITLE,
  isSignalAdvancedEnabled,
  type ScenarioBranchTab,
} from '../types/board-ui.js';
import {
  BoardFlowCanvas,
  type BoardConnectionDropOnPanePayload,
  type BoardFlowViewportApi,
  type BoardMarqueeSelectionPayload,
} from './board-flow-canvas.js';
import { BoardConnectionSuggestModal } from './board-connection-suggest-modal.js';
import { BoardSelectionActionModal } from './board-selection-action-modal.js';
import { BoardBranchImportModal } from './board-branch-import-modal.js';
import { BoardLeftSidebar } from './board-left-sidebar.js';
import { BoardRightSidebar } from './board-right-sidebar.js';
import { BoardRuntimeStatus } from './board-runtime-status.js';
import { BoardValidationBanner } from './board-validation-banner.js';
import { shouldPreserveLockedNodes } from '../graph/clear-branch.js';
import { referenceTypeLabel, isBoardGroupNode } from '../graph/index.js';
import type { BoardGroupNodeData } from '../graph/index.js';
import { computeSmartAlignPositions, computeAlignPositions } from '../graph/align-nodes.js';
import type { BoardAlignMode } from '../graph/align-nodes.js';
import { isSystemNode } from '../graph/event-node.js';

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
  const [selectedCollectorConfig, setSelectedCollectorConfig] = useState<ScenarioCollectorConfig | null>(
    null,
  );
  const [selectedRecordingPolicy, setSelectedRecordingPolicy] = useState<ScenarioRecordingPolicy | null>(
    null,
  );
  const [selectedRecordingPolicyWired, setSelectedRecordingPolicyWired] = useState(false);
  const [selectedFftTrendsPolicy, setSelectedFftTrendsPolicy] =
    useState<ScenarioFftTrendsPolicy | null>(null);
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
  const [traceCopyStatus, setTraceCopyStatus] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const viewportApiRef = useRef<BoardFlowViewportApi | null>(null);
  const [connectionSuggestOpen, setConnectionSuggestOpen] = useState(false);
  const [connectionSuggestItems, setConnectionSuggestItems] = useState<
    readonly PaletteConnectionSuggestion[]
  >([]);
  const pendingConnectionDropRef = useRef<BoardConnectionDropOnPanePayload | null>(null);
  const [selectionActionOpen, setSelectionActionOpen] = useState(false);
  const [marqueeSelectedIds, setMarqueeSelectedIds] = useState<readonly string[]>([]);

  const handleViewportApiReady = useCallback((api: BoardFlowViewportApi) => {
    viewportApiRef.current = api;
  }, []);

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
    setSelectedVariableId(null);
    setSelectedGetterPure(true);
    setSelectedGetterPureLocked(false);
    setSelectedIsCommentGroup(false);
    setSelectedGroupTitle('');
    setSelectedGroupDescription('');
    setSelectedGroupFrameColor(DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR);
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
      setSelectedVariableId(null);
      setSelectedGetterPure(true);
      setSelectedGetterPureLocked(false);
      setSelectedIsCommentGroup(false);
      setSelectedGroupTitle('');
      setSelectedGroupDescription('');
      setSelectedGroupFrameColor(DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR);
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
      setSelectedVariableId(null);
      setSelectedGetterPure(false);
      setSelectedGetterPureLocked(false);
      return;
    }
    const label = typeof node.data?.label === 'string' ? node.data.label : node.id;
    setSelectedNodeLabel(label);
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
  }, [refreshMicrophoneOptions, resolveBranchEdges]);

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
  const isRuntime = graph.runtimeState.isRunning;

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

  const dismissSelectionAction = useCallback(() => {
    setSelectionActionOpen(false);
    setMarqueeSelectedIds([]);
    clearCanvasNodeSelection();
  }, [clearCanvasNodeSelection]);

  const closeSelectionActionModal = useCallback(() => {
    setSelectionActionOpen(false);
    setMarqueeSelectedIds([]);
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
    const hasSystem = selected.some((node) => isSystemNode(node));
    const count = selected.length;
    return {
      count,
      collapseFunctionDisabled: count < 2 || hasSystem,
      collapseGroupDisabled: count < 2 || hasSystem,
    };
  }, [marqueeSelectedIds, scenarioCanvas.nodes]);

  const applyAlignPositions = useCallback(
    (positions: Map<string, { readonly x: number; readonly y: number }>) => {
      if (positions.size === 0) {
        return;
      }
      const changes: NodeChange[] = [...positions.entries()].map(([id, position]) => ({
        type: 'position',
        id,
        position,
      }));
      scenarioCanvas.onNodesChange(changes);
      dismissSelectionAction();
    },
    [dismissSelectionAction, scenarioCanvas],
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

  const handleCollapseToFunction = useCallback(() => {
    if (isSignal || isRuntime) {
      return;
    }
    const error = graph.collapseMarqueeToFunction(scenarioBranch, marqueeSelectedIds);
    if (error !== null) {
      setImportError(error);
    }
    dismissSelectionAction();
  }, [
    dismissSelectionAction,
    graph,
    isRuntime,
    isSignal,
    marqueeSelectedIds,
    scenarioBranch,
  ]);

  const handleCollapseToGroup = useCallback(() => {
    if (isRuntime) {
      return;
    }
    const branch: ScenarioCommentGroupBranch = isSignal ? 'signal' : scenarioBranch;
    const result = graph.collapseMarqueeToCommentGroup(branch, marqueeSelectedIds);
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
    marqueeSelectedIds,
    scenarioBranch,
  ]);

  useEffect(() => {
    if (isRuntime && selectionActionOpen) {
      dismissSelectionAction();
    }
  }, [dismissSelectionAction, isRuntime, selectionActionOpen]);

  useEffect(() => {
    if (!selectionActionOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissSelectionAction();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dismissSelectionAction, selectionActionOpen]);

  const canvasLabel = isSignal ? 'Signal' : BRANCH_TAB_LABEL[scenarioBranch];

  const scenarioTitle = isSignal ? SIGNAL_LAYER_TITLE : BRANCH_SCENARIO_TITLE[scenarioBranch];

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

  return (
    <div className="flex h-full min-h-0 flex-col bg-base-100 [scrollbar-gutter:stable]">
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
            pulseEdges={isRuntime}
            readOnly={isRuntime}
            ariaLabel={`Канвас: ${canvasLabel}`}
            onViewportApiReady={handleViewportApiReady}
            onConnectionDropOnPane={handleConnectionDropOnPane}
            onMarqueeSelection={!isSignal && !isRuntime ? handleMarqueeSelection : undefined}
          />
        </div>

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
            onSelectFunction={graph.selectUserFunction}
            onCreateFunction={graph.createUserFunction}
          />
        </aside>
        <aside className="absolute bottom-0 right-0 top-0 z-10" aria-label="Инспектор и палитра">
          <BoardRightSidebar
            selectedNodeId={selectedNodeId}
            selectedNodeLabel={selectedNodeLabel}
            selectedNodeKind={selectedNodeKind}
            selectedMicrophoneId={selectedMicrophoneId}
            selectedCollectorConfig={selectedCollectorConfig}
            selectedRecordingPolicy={selectedRecordingPolicy}
            selectedRecordingPolicyWired={selectedRecordingPolicyWired}
            selectedFftTrendsPolicy={selectedFftTrendsPolicy}
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
            microphoneOptions={microphoneOptions}
            microphoneOptionsLoading={microphoneOptionsLoading}
            canEditScenario={!isSignal}
            isFunctionBranch={!isSignal && scenarioBranch === 'function'}
            functionMeta={!isSignal && scenarioBranch === 'function' ? graph.scenarioFunctionMeta : null}
            isRuntime={isRuntime}
            runtimeInspection={runtimeInspection}
            printLastOutput={printLastOutput}
            onAddLegacyNode={graph.addScenarioNodeToCurrentBranch}
            onAddPaletteNode={addPaletteNodeAtViewportCenter}
            onMicrophoneIdChange={graph.updatePaletteNodeMicrophoneId}
            onCollectorConfigChange={graph.updateCollectorConfig}
            onRecordingPolicyChange={graph.updateRecordingPolicy}
            onFftTrendsPolicyChange={graph.updateFftTrendsPolicy}
            onAssignVariableName={graph.assignNodeVariableName}
            onVariableGetterPureChange={(nodeId, pure) => {
              graph.setVariableGetterPure(nodeId, pure);
              if (nodeId === selectedNodeId) {
                setSelectedGetterPure(pure);
              }
            }}
            onVariableValueChange={graph.updateVariableValue}
            onCommentGroupMetadataChange={(nodeId, patch) => {
              graph.updateCommentGroupMetadata(nodeId, patch);
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
            onAddFunctionPin={(side, kind) => {
              const error = graph.addActiveFunctionPin(side, kind);
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

      <BoardSelectionActionModal
        open={selectionActionOpen && !isRuntime}
        selectedCount={marqueeSelectionMeta.count}
        collapseFunctionDisabled={marqueeSelectionMeta.collapseFunctionDisabled}
        collapseGroupDisabled={marqueeSelectionMeta.collapseGroupDisabled}
        onCollapseToFunction={handleCollapseToFunction}
        onCollapseToGroup={handleCollapseToGroup}
        onAlignMode={handleAlignMode}
        onSmartAlign={handleSmartAlign}
        onDismiss={dismissSelectionAction}
      />
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
