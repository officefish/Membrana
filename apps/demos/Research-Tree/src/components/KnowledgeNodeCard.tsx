import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NODE_W, NODE_H, STATE_COLORS, isOnFrontier, type KnowledgeFlowNode } from '../graph/adapter.js';

const STATE_BADGE: Record<string, string> = {
  fog:         'badge-ghost',
  available:   'badge-info',
  exploring:   'badge-warning',
  established: 'badge-success',
};

const TYPE_ICON: Record<string, string> = {
  knowledge:  '📐',
  capability: '⚙️',
  service:    '🔬',
  process:    '📋',
};

export const KnowledgeNodeCard = memo(function KnowledgeNodeCard({
  data,
  selected,
}: NodeProps<KnowledgeFlowNode>) {
  const { node, artifactCounts } = data;
  const frontier = isOnFrontier(node);
  const borderColor = STATE_COLORS[node.state];

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: borderColor, width: 8, height: 8 }} />
      <div
        style={{
          width: NODE_W,
          minHeight: NODE_H,
          borderLeft: `4px solid ${borderColor}`,
          outline: selected ? `2px solid ${borderColor}` : undefined,
          outlineOffset: selected ? 2 : undefined,
        }}
        className="bg-base-200 rounded-lg shadow-sm px-3 py-2 flex flex-col justify-between cursor-pointer transition-shadow hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-1">
          <span className="text-xs font-mono text-base-content/40 truncate flex-1">{node.id}</span>
          <div className="flex items-center gap-1 shrink-0">
            {frontier && <span className="badge badge-xs badge-error animate-pulse">▶</span>}
            {node.gate?.status === 'open' && !frontier && <span className="badge badge-xs badge-ghost">🔒</span>}
            <span className={`badge badge-xs ${STATE_BADGE[node.state]}`}>{node.state}</span>
          </div>
        </div>
        <div className="flex items-end justify-between mt-1 gap-1">
          <p className="text-sm font-medium text-base-content leading-tight line-clamp-2 flex-1">
            {TYPE_ICON[node.type]} {node.title}
          </p>
          {artifactCounts.total > 0 && (
            <span className="text-xs text-base-content/40 shrink-0">
              {artifactCounts.collected}/{artifactCounts.total}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: borderColor, width: 8, height: 8 }} />
    </>
  );
});
