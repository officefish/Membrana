import { useMemo } from 'react';
import { STATE_COLORS, isOnFrontier } from '../graph/adapter.js';
import { useUIContext } from '../state/UIContext.js';
import type { KnowledgeGraph } from '../graph/types.js';

const STATE_BADGE: Record<string, string> = {
  fog:         'badge-ghost',
  available:   'badge-info',
  exploring:   'badge-warning',
  established: 'badge-success',
};

interface DetailPanelProps {
  graph: KnowledgeGraph;
}

export function DetailPanel({ graph }: DetailPanelProps) {
  const { state, dispatch } = useUIContext();
  const nodeMap = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const artByNode = useMemo(() => {
    const m = new Map<string, typeof graph.artifacts>();
    for (const a of graph.artifacts) {
      for (const nid of [a.node, ...(a.also ?? [])]) {
        if (!m.has(nid)) m.set(nid, []);
        m.get(nid)!.push(a);
      }
    }
    return m;
  }, [graph]);

  const node = state.selectedNodeId ? nodeMap.get(state.selectedNodeId) : null;

  if (!node) {
    return (
      <aside className="w-72 shrink-0 bg-base-200 border-l border-base-300 p-4 flex flex-col gap-2">
        <p className="text-base-content/40 text-sm mt-8 text-center">Выберите узел</p>
      </aside>
    );
  }

  const artifacts = artByNode.get(node.id) ?? [];
  const requires = node.requires.map((id) => nodeMap.get(id)).filter(Boolean);
  const frontier = isOnFrontier(node);

  return (
    <aside className="w-72 shrink-0 bg-base-200 border-l border-base-300 p-4 flex flex-col gap-3 overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-base-content text-sm leading-tight">{node.title}</h2>
        <button
          className="btn btn-ghost btn-xs shrink-0"
          onClick={() => dispatch({ type: 'SELECT_NODE', id: null })}
        >✕</button>
      </div>

      <div className="flex flex-wrap gap-1">
        <span className={`badge badge-sm ${STATE_BADGE[node.state]}`}>{node.state}</span>
        {node.epoch && <span className="badge badge-sm badge-outline">{node.epoch}</span>}
        <span className="badge badge-sm badge-outline">{node.type}</span>
        {frontier && <span className="badge badge-sm badge-error animate-pulse">фронтир</span>}
      </div>

      <div className="font-mono text-xs text-base-content/40">{node.id}</div>
      <div className="text-xs text-base-content/50">{graph.branches[node.branch] ?? node.branch}</div>

      {node.gate && (
        <div className="bg-base-300 rounded p-2 text-xs">
          <div className="font-semibold text-base-content/70 mb-1">
            Шлюз {node.gate.status === 'passed' ? '✅' : '🔒'}
          </div>
          <p className="text-base-content/60">{node.gate.criterion}</p>
        </div>
      )}

      {node.evidence && (
        <div className="text-xs text-base-content/60 italic">"{node.evidence}"</div>
      )}

      {node.note && (
        <div className="text-xs text-base-content/50">{node.note}</div>
      )}

      {requires.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-base-content/50 mb-1">Предпосылки</div>
          <div className="flex flex-col gap-1">
            {requires.map((r) => r && (
              <button
                key={r.id}
                className="text-left text-xs px-2 py-1 rounded bg-base-300 hover:bg-base-100 transition-colors"
                style={{ borderLeft: `3px solid ${STATE_COLORS[r.state]}` }}
                onClick={() => dispatch({ type: 'SELECT_NODE', id: r.id })}
              >
                {r.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {artifacts.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-base-content/50 mb-1">Артефакты</div>
          <div className="flex flex-col gap-1">
            {artifacts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <span className={
                  a.status === 'collected' ? 'text-success' :
                  a.status === 'in_progress' ? 'text-warning' : 'text-error'
                }>
                  {a.status === 'collected' ? '✓' : a.status === 'in_progress' ? '◐' : '○'}
                </span>
                <span className="text-base-content/70">{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
