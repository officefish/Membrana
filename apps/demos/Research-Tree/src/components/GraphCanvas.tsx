import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type NodeTypes,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { KnowledgeNodeCard } from './KnowledgeNodeCard.js';
import { buildFlowGraph, matchesFilters, STATE_COLORS, GENESIS_DATE } from '../graph/adapter.js';
import { useUIContext } from '../state/UIContext.js';
import type { KnowledgeGraph } from '../graph/types.js';

const NODE_TYPES: NodeTypes = {
  knowledgeNode: KnowledgeNodeCard as NodeTypes[string],
};

interface GraphCanvasProps {
  graph: KnowledgeGraph;
}

function FlowInner({ graph }: GraphCanvasProps) {
  const { state, dispatch } = useUIContext();

  const playheadDate = state.playhead === 'genesis' ? GENESIS_DATE : undefined;

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => buildFlowGraph(graph, playheadDate),
    [graph, playheadDate],
  );

  const visibleNodeIds = useMemo(() => {
    return new Set(
      layoutNodes
        .filter((n) => matchesFilters(n.data.node, state.filters.states, state.filters.epochs))
        .map((n) => n.id),
    );
  }, [layoutNodes, state.filters]);

  const nodes = useMemo(
    () =>
      layoutNodes.map((n) => ({
        ...n,
        hidden: !visibleNodeIds.has(n.id),
        selected: n.id === state.selectedNodeId,
      })),
    [layoutNodes, visibleNodeIds, state.selectedNodeId],
  );

  const edges = useMemo(
    () =>
      layoutEdges.map((e) => ({
        ...e,
        hidden: !visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target),
      })),
    [layoutEdges, visibleNodeIds],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      dispatch({ type: 'SELECT_NODE', id: node.id === state.selectedNodeId ? null : node.id });
    },
    [dispatch, state.selectedNodeId],
  );

  const onPaneClick = useCallback(() => {
    dispatch({ type: 'SELECT_NODE', id: null });
  }, [dispatch]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      minZoom={0.15}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Controls className="!bg-base-200 !border-base-300 !shadow-sm" />
      <MiniMap
        nodeColor={(n) => {
          const nodeState = (n.data as { node?: { state?: string } })?.node?.state ?? 'fog';
          return STATE_COLORS[nodeState as keyof typeof STATE_COLORS] ?? '#6b7280';
        }}
        className="!bg-base-200 !border !border-base-300 !rounded-lg"
        maskColor="rgba(0,0,0,0.3)"
      />
      <Background variant={BackgroundVariant.Dots} color="#374151" gap={20} size={1} />
    </ReactFlow>
  );
}

export function GraphCanvas({ graph }: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowInner graph={graph} />
    </ReactFlowProvider>
  );
}
