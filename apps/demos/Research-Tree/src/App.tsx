import graph from '../membrana-knowledge-graph.json';

const nodesByState = graph.nodes.reduce<Record<string, number>>((acc, n) => {
  acc[n.state] = (acc[n.state] ?? 0) + 1;
  return acc;
}, {});

const STATE_COLORS: Record<string, string> = {
  established: 'badge-success',
  exploring:   'badge-warning',
  available:   'badge-info',
  fog:         'badge-ghost',
};

export default function App() {
  return (
    <div className="min-h-screen bg-base-100 p-8">
      <h1 className="text-2xl font-bold text-base-content mb-2">Research-Tree</h1>
      <p className="text-base-content/60 text-sm mb-6">
        Карта знаний Membrana — {graph.nodes.length} узлов, {graph.artifacts.length} артефактов
      </p>

      <div className="flex gap-3 flex-wrap mb-8">
        {Object.entries(nodesByState).map(([state, count]) => (
          <span key={state} className={`badge ${STATE_COLORS[state] ?? 'badge-neutral'} badge-lg gap-1`}>
            {state} <span className="font-bold">{count}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {graph.nodes.map((node) => (
          <div key={node.id} className="card card-compact bg-base-200 shadow-sm">
            <div className="card-body">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs text-base-content/50">{node.id}</span>
                <span className={`badge badge-xs ${STATE_COLORS[node.state] ?? 'badge-neutral'} shrink-0`}>
                  {node.state}
                </span>
              </div>
              <p className="text-sm text-base-content">{node.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
