import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { decorateBoardEdges } from '../graph/board-edge-style.js';
import { BoardFlowNode } from './board-flow-node.js';

const NODE_TYPES: NodeTypes = { board: BoardFlowNode };

/** API координат канваса (viewport → flow space). */
export interface BoardFlowViewportApi {
  readonly getCenterFlowPosition: () => { readonly x: number; readonly y: number };
  readonly clientToFlowPosition: (
    clientX: number,
    clientY: number,
  ) => { readonly x: number; readonly y: number };
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
  readonly ariaLabel?: string;
  /** Пульсация exec-рёбер только при запущенном сценарии. */
  readonly pulseEdges?: boolean;
  /** Запрет редактирования графа (drag, connect, delete) при runtime. */
  readonly readOnly?: boolean;
  readonly onViewportApiReady?: (api: BoardFlowViewportApi) => void;
  /** Отпускание ребра над пустым полем (не на handle узла). */
  readonly onConnectionDropOnPane?: (payload: BoardConnectionDropOnPanePayload) => void;
}

const BoardFlowCanvasInner: React.FC<BoardFlowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  isValidConnection,
  onSelectionChange,
  ariaLabel,
  pulseEdges = false,
  readOnly = false,
  onViewportApiReady,
  onConnectionDropOnPane,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow();

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
    }),
    [reactFlow],
  );

  useEffect(() => {
    onViewportApiReady?.(viewportApi);
  }, [onViewportApiReady, viewportApi]);

  const decoratedEdges = useMemo(
    () => decorateBoardEdges(edges, nodes, { pulseWhenRunning: pulseEdges }),
    [edges, nodes, pulseEdges],
  );

  const handleSelectionChange = useCallback(
    (selection: OnSelectionChangeParams) => {
      onSelectionChange?.(selection);
    },
    [onSelectionChange],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (readOnly) {
        const selectionOnly = changes.every((change) => change.type === 'select');
        if (!selectionOnly) {
          return;
        }
      }
      onNodesChange(changes);
    },
    [onNodesChange, readOnly],
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

  return (
    <div ref={wrapperRef} className="h-full w-full min-h-0">
      <ReactFlow
        nodes={nodes}
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
        deleteKeyCode={readOnly ? null : 'Backspace'}
        fitView
        proOptions={{ hideAttribution: true }}
        onSelectionChange={handleSelectionChange}
        className="board-flow-canvas"
        style={{ width: '100%', height: '100%' }}
        aria-label={ariaLabel}
      >
        <Controls className="!border-base-300 !bg-base-100 !shadow-sm [&_button]:!border-base-300 [&_button]:!bg-base-100" />
        <MiniMap
          className="!border-base-300 !bg-base-100"
          nodeColor={(node) => (node.data?.layer === 'scenario' ? 'oklch(var(--s))' : 'oklch(var(--p))')}
          maskColor="oklch(var(--b1) / 0.65)"
        />
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