import React, { useCallback, useMemo } from 'react';
import {
  Background,
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
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={handleValidConnection}
      nodeTypes={NODE_TYPES}
      fitView
      proOptions={{ hideAttribution: true }}
      onSelectionChange={handleSelectionChange}
      className="bg-base-200"
      style={{ width: '100%', height: '100%' }}
      aria-label={ariaLabel}
    >
      <Background gap={16} size={1} color="oklch(var(--bc) / 0.08)" />
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
