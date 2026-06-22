import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type FinalConnectionState,
  type Node,
  type NodeChange,
  type NodeTypes,
  type OnConnectEnd,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './board-flow-canvas.css';

import type { BoardLayerTab } from '../types/board-ui.js';
import {
  BOARD_VIEWPORT_FIT_DURATION_MS,
  BOARD_VIEWPORT_FIT_MAX_ZOOM,
  BOARD_VIEWPORT_FIT_PADDING,
  isBoardLayoutGhostNodeId,
} from '../graph/board-viewport-fit.js';
import { decorateBoardEdges } from '../graph/board-edge-style.js';
import type { FlowGuideLine } from '../graph/layout-snap-guides.js';
import { snapBoardNodePositionChange } from '../graph/layout-snap-guides.js';
import {
  nodesInFlowRect,
  normalizeFlowRect,
  normalizeScreenRect,
  type FlowRect,
  type ScreenRect,
} from '../graph/marquee-selection.js';
import { BoardSnapGuidesOverlay } from './board-snap-guides-overlay.js';
import { BoardFlowNode } from './board-flow-node.js';
import { BoardGroupNode } from './board-group-node.js';
import { BoardLayoutGhostNode } from './board-layout-ghost-node.js';
import { BoardMarqueeOverlay } from './board-marquee-overlay.js';

const NODE_TYPES: NodeTypes = {
  board: BoardFlowNode,
  boardGroup: BoardGroupNode,
  boardLayoutGhost: BoardLayoutGhostNode,
};

/** API координат канваса (viewport → flow space). */
export interface BoardFlowViewportApi {
  readonly getCenterFlowPosition: () => { readonly x: number; readonly y: number };
  readonly clientToFlowPosition: (
    clientX: number,
    clientY: number,
  ) => { readonly x: number; readonly y: number };
  /** Подгоняет viewport так, чтобы был виден хотя бы один узел графа. */
  readonly ensureGraphVisible: () => void;
}

export interface BoardMarqueeSelectionPayload {
  readonly nodeIds: readonly string[];
  readonly flowRect: FlowRect;
  readonly screenRect: ScreenRect;
}

interface MarqueePointerState {
  readonly pointerId: number;
  readonly originClient: { readonly x: number; readonly y: number };
  readonly originRelative: { readonly x: number; readonly y: number };
}

export interface BoardConnectionDropOnPanePayload {
  readonly sourceNodeId: string;
  readonly sourceHandle: string;
  readonly sourceNode: Node;
  readonly clientX: number;
  readonly clientY: number;
}

function normalizeHandleId(handle: unknown): string | null {
  if (handle === null || handle === undefined) {
    return null;
  }
  if (typeof handle === 'string') {
    return handle;
  }
  if (typeof handle === 'object' && handle !== null && 'id' in handle) {
    const id = (handle as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

export interface BoardFlowCanvasProps {
  readonly layer: BoardLayerTab;
  readonly nodes: Node[];
  readonly edges: Edge[];
  readonly onNodesChange: (changes: NodeChange[]) => void;
  readonly onEdgesChange: (changes: EdgeChange[]) => void;
  readonly onConnect: (connection: Connection) => void;
  readonly isValidConnection: (connection: Connection) => boolean;
  readonly onSelectionChange?: (selection: OnSelectionChangeParams) => void;
  /** Клик по пустому полю канваса (снятие выделения). */
  readonly onPaneClick?: () => void;
  readonly ariaLabel?: string;
  /** Пульсация exec-рёбер только при запущенном сценарии. */
  readonly pulseEdges?: boolean;
  /** Подсветка exec-цепочки к активному runtime-узлу (F5). */
  readonly runtimeHighlightNodeIds?: ReadonlySet<string>;
  readonly highlightExecEdgeIds?: ReadonlySet<string>;
  /** Запрет редактирования графа (drag, connect, delete) при runtime. */
  readonly readOnly?: boolean;
  readonly onViewportApiReady?: (api: BoardFlowViewportApi) => void;
  /** Отпускание ребра над пустым полем (не на handle узла). */
  readonly onConnectionDropOnPane?: (payload: BoardConnectionDropOnPanePayload) => void;
  /** Marquee multi-select на пустом поле (CGF R0). */
  readonly onMarqueeSelection?: (payload: BoardMarqueeSelectionPayload) => void;
  /** Ghost-ноды preview exec layout (NAA L2) — не persist, только render. */
  readonly layoutGhostNodes?: readonly Node[];
  /**
   * Меняется при смене ветки / функции / слоя — триггер fit viewport.
   * Формат задаёт shell (`scenario:main`, `scenario:function:fn-1`, `signal`).
   */
  readonly viewportFitKey?: string;
}

const BoardFlowCanvasInner: React.FC<BoardFlowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  isValidConnection,
  onSelectionChange,
  onPaneClick,
  ariaLabel,
  pulseEdges = false,
  runtimeHighlightNodeIds,
  highlightExecEdgeIds,
  readOnly = false,
  onViewportApiReady,
  onConnectionDropOnPane,
  onMarqueeSelection,
  layoutGhostNodes = [],
  viewportFitKey,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow();
  const marqueeDragRef = useRef<MarqueePointerState | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<ScreenRect | null>(null);
  const [snapGuides, setSnapGuides] = useState<readonly FlowGuideLine[]>([]);
  const marqueeEnabled = !readOnly && onMarqueeSelection !== undefined;

  const displayNodes = useMemo(() => {
    const base = layoutGhostNodes.length === 0 ? nodes : [...nodes, ...layoutGhostNodes];
    if (runtimeHighlightNodeIds === undefined || runtimeHighlightNodeIds.size === 0) {
      return base;
    }
    return base.map((node) => {
      if (!runtimeHighlightNodeIds.has(node.id)) {
        return node;
      }
      return {
        ...node,
        className: [node.className, 'board-node--runtime-exec-active'].filter(Boolean).join(' '),
      };
    });
  }, [layoutGhostNodes, nodes, runtimeHighlightNodeIds]);

  const ensureGraphVisible = useCallback(() => {
    const visibleNodes = reactFlow
      .getNodes()
      .filter((node) => !isBoardLayoutGhostNodeId(node.id));
    if (visibleNodes.length === 0) {
      return;
    }
    void reactFlow.fitView({
      nodes: visibleNodes.map((node) => ({ id: node.id })),
      padding: BOARD_VIEWPORT_FIT_PADDING,
      duration: BOARD_VIEWPORT_FIT_DURATION_MS,
      maxZoom: BOARD_VIEWPORT_FIT_MAX_ZOOM,
    });
  }, [reactFlow]);

  const ensureGraphVisible = useCallback(() => {
    const visibleNodes = reactFlow
      .getNodes()
      .filter((node) => !isBoardLayoutGhostNodeId(node.id));
    if (visibleNodes.length === 0) {
      return;
    }
    void reactFlow.fitView({
      nodes: visibleNodes.map((node) => ({ id: node.id })),
      padding: BOARD_VIEWPORT_FIT_PADDING,
      duration: BOARD_VIEWPORT_FIT_DURATION_MS,
      maxZoom: BOARD_VIEWPORT_FIT_MAX_ZOOM,
    });
  }, [reactFlow]);

  const viewportApi = useMemo<BoardFlowViewportApi>(
    () => ({
      getCenterFlowPosition: () => {
        const bounds = wrapperRef.current?.getBoundingClientRect();
        if (bounds === undefined) {
          return { x: 0, y: 0 };
        }
        return reactFlow.screenToFlowPosition({
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        });
      },
      clientToFlowPosition: (clientX, clientY) =>
        reactFlow.screenToFlowPosition({ x: clientX, y: clientY }),
      ensureGraphVisible,
    }),
    [ensureGraphVisible, reactFlow],
  );

  useEffect(() => {
    if (viewportFitKey === undefined) {
      return;
    }
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          ensureGraphVisible();
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [ensureGraphVisible, viewportFitKey]);

  useEffect(() => {
    onViewportApiReady?.(viewportApi);
  }, [onViewportApiReady, viewportApi]);

  const decoratedEdges = useMemo(
    () => decorateBoardEdges(edges, nodes, { pulseWhenRunning: pulseEdges, highlightExecEdgeIds }),
    [edges, highlightExecEdgeIds, nodes, pulseEdges],
  );

  const handleSelectionChange = useCallback(
    (selection: OnSelectionChangeParams) => {
      onSelectionChange?.(selection);
    },
    [onSelectionChange],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filtered = changes.filter(
        (change) => !('id' in change && change.id.startsWith('layout-ghost-')),
      );
      if (filtered.length === 0) {
        return;
      }
      if (readOnly) {
        const selectionOnly = filtered.every((change) => change.type === 'select');
        if (!selectionOnly) {
          return;
        }
      }

      let nextGuides: readonly FlowGuideLine[] = [];
      const mapped = filtered.map((change) => {
        if (
          readOnly ||
          change.type !== 'position' ||
          change.dragging !== true ||
          change.position === undefined
        ) {
          return change;
        }
        const snapped = snapBoardNodePositionChange(nodes, change);
        if (snapped === null) {
          return change;
        }
        nextGuides = snapped.guides;
        return {
          ...change,
          position: { x: snapped.x, y: snapped.y },
        };
      });

      const dragEnded = filtered.some(
        (change) => change.type === 'position' && change.dragging === false,
      );
      if (dragEnded) {
        setSnapGuides([]);
      } else if (nextGuides.length > 0) {
        setSnapGuides(nextGuides);
      } else if (
        filtered.some((change) => change.type === 'position' && change.dragging === true)
      ) {
        setSnapGuides([]);
      }

      onNodesChange(mapped);
    },
    [nodes, onNodesChange, readOnly],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) {
        return;
      }
      onEdgesChange(changes);
    },
    [onEdgesChange, readOnly],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) {
        return;
      }
      onConnect(connection);
    },
    [onConnect, readOnly],
  );

  const handleConnectEnd = useCallback<OnConnectEnd>(
    (event, connectionState: FinalConnectionState) => {
      if (readOnly || onConnectionDropOnPane === undefined) {
        return;
      }
      if (connectionState.fromNode === null) {
        return;
      }
      const sourceHandle = normalizeHandleId(connectionState.fromHandle);
      if (sourceHandle === null) {
        return;
      }
      if (connectionState.toNode !== null) {
        return;
      }
      const pointer = 'changedTouches' in event ? event.changedTouches[0] : event;
      if (pointer === undefined) {
        return;
      }
      onConnectionDropOnPane({
        sourceNodeId: connectionState.fromNode.id,
        sourceHandle,
        sourceNode: connectionState.fromNode,
        clientX: pointer.clientX,
        clientY: pointer.clientY,
      });
    },
    [onConnectionDropOnPane, readOnly],
  );

  const handleValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const normalized: Connection = {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      };
      return isValidConnection(normalized);
    },
    [isValidConnection],
  );

  const clearCanvasSelection = useCallback(() => {
    onNodesChange(
      nodes.map((node) => ({
        type: 'select' as const,
        id: node.id,
        selected: false,
      })),
    );
    onPaneClick?.();
  }, [nodes, onNodesChange, onPaneClick]);

  const finishMarquee = useCallback(
    (clientX: number, clientY: number) => {
      const drag = marqueeDragRef.current;
      marqueeDragRef.current = null;
      setMarqueeRect(null);
      if (drag === null || onMarqueeSelection === undefined) {
        return;
      }

      const flowA = reactFlow.screenToFlowPosition(drag.originClient);
      const flowB = reactFlow.screenToFlowPosition({ x: clientX, y: clientY });
      const flowRect = normalizeFlowRect(flowA, flowB);

      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (bounds === undefined) {
        return;
      }
      const relative = { x: clientX - bounds.left, y: clientY - bounds.top };
      const screenRect = normalizeScreenRect(drag.originRelative, relative);

      const picked = nodesInFlowRect(nodes, flowRect);
      if (picked.length === 0) {
        clearCanvasSelection();
        return;
      }

      const nodeIds = picked.map((node) => node.id);
      const idSet = new Set(nodeIds);
      onNodesChange(
        nodes.map((node) => ({
          type: 'select' as const,
          id: node.id,
          selected: idSet.has(node.id),
        })),
      );
      onMarqueeSelection({ nodeIds, flowRect, screenRect });
    },
    [clearCanvasSelection, nodes, onMarqueeSelection, onNodesChange, reactFlow],
  );

  const isMarqueePointerTarget = useCallback((target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    if (target.closest('.react-flow__node') !== null) {
      return false;
    }
    if (target.closest('.react-flow__controls') !== null) {
      return false;
    }
    if (target.closest('.react-flow__minimap') !== null) {
      return false;
    }
    if (target.closest('.react-flow__handle') !== null) {
      return false;
    }
    return (
      target.closest('.react-flow__pane') !== null ||
      target.classList.contains('react-flow__pane')
    );
  }, []);

  const handleWrapperPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!marqueeEnabled || event.button !== 0) {
        return;
      }
      if (!isMarqueePointerTarget(event.target)) {
        return;
      }
      event.preventDefault();
      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (bounds === undefined) {
        return;
      }
      const originRelative = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      marqueeDragRef.current = {
        pointerId: event.pointerId,
        originClient: { x: event.clientX, y: event.clientY },
        originRelative,
      };
      setMarqueeRect({ left: originRelative.x, top: originRelative.y, width: 0, height: 0 });
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [isMarqueePointerTarget, marqueeEnabled],
  );

  const handleWrapperPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = marqueeDragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (bounds === undefined) {
      return;
    }
    const relative = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    setMarqueeRect(normalizeScreenRect(drag.originRelative, relative));
  }, []);

  const handleWrapperPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = marqueeDragRef.current;
      if (drag === null || drag.pointerId !== event.pointerId) {
        return;
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      finishMarquee(event.clientX, event.clientY);
    },
    [finishMarquee],
  );

  const handleWrapperPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = marqueeDragRef.current;
      if (drag === null || drag.pointerId !== event.pointerId) {
        return;
      }
      marqueeDragRef.current = null;
      setMarqueeRect(null);
    },
    [],
  );

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full min-h-0"
      onPointerDown={handleWrapperPointerDown}
      onPointerMove={handleWrapperPointerMove}
      onPointerUp={handleWrapperPointerUp}
      onPointerCancel={handleWrapperPointerCancel}
    >
      <BoardMarqueeOverlay rect={marqueeRect} />
      <ReactFlow
        nodes={displayNodes}
        edges={decoratedEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        isValidConnection={handleValidConnection}
        nodeTypes={NODE_TYPES}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        edgesReconnectable={!readOnly}
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        panOnDrag={marqueeEnabled ? [1, 2] : true}
        proOptions={{ hideAttribution: true }}
        onSelectionChange={handleSelectionChange}
        onPaneClick={clearCanvasSelection}
        className="board-flow-canvas"
        style={{ width: '100%', height: '100%' }}
        aria-label={ariaLabel}
      >
        <Controls className="!border-base-300 !bg-base-100 !shadow-sm [&_button]:!border-base-300 [&_button]:!bg-base-100" />
        <MiniMap
          className="board-flow-minimap !border-base-300 !bg-base-100"
          nodeColor={(node) => (node.data?.layer === 'scenario' ? 'oklch(var(--s))' : 'oklch(var(--p))')}
          maskColor="oklch(var(--b1) / 0.65)"
        />
        <BoardSnapGuidesOverlay guides={snapGuides} />
      </ReactFlow>
    </div>
  );
};

/**
 * XYFlow-канвас для слоя Signal или Scenario.
 */
export const BoardFlowCanvas: React.FC<BoardFlowCanvasProps> = (props) => (
  <ReactFlowProvider>
    <div className="h-full w-full min-h-0" data-board-layer={props.layer}>
      <BoardFlowCanvasInner {...props} />
    </div>
  </ReactFlowProvider>
);