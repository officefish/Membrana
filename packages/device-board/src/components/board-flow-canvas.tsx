import React, { useCallback, useMemo } from 'react';
import {
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeTypes,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './board-flow-canvas.css';

import type { BoardLayerTab } from '../types/board-ui.js';
import { decorateBoardEdges } from '../graph/board-edge-style.js';
import { BoardFlowNode } from './board-flow-node.js';

const NODE_TYPES: NodeTypes = { board: BoardFlowNode };

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
}) => {
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
    <ReactFlow
      nodes={nodes}
      edges={decoratedEdges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
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
  );
};

/**
 * XYFlow-канвас для слоя Signal или Scenario.
 * Родитель overlay-слоя задаёт `absolute inset-0`; обёртка `h-full w-full` + inline height
 * на ReactFlow — обязательное условие измеримого viewport (DBH0 hotfix).
 */
export const BoardFlowCanvas: React.FC<BoardFlowCanvasProps> = (props) => (
  <ReactFlowProvider>
    <div className="h-full w-full min-h-0" data-board-layer={props.layer}>
      <BoardFlowCanvasInner {...props} />
    </div>
  </ReactFlowProvider>
);
