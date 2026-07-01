import { useMemo } from 'react';
import graph from '../membrana-knowledge-graph.json';
import { GraphCanvas } from './components/GraphCanvas.js';
import { DetailPanel } from './components/DetailPanel.js';
import { FilterBar } from './components/FilterBar.js';
import { UIProvider, useUIContext } from './state/UIContext.js';
import { matchesFilters } from './graph/adapter.js';
import type { KnowledgeGraph } from './graph/types.js';

const typedGraph = graph as unknown as KnowledgeGraph;

function AppInner() {
  const { state } = useUIContext();

  const visibleCount = useMemo(
    () =>
      typedGraph.nodes.filter((n) =>
        matchesFilters(n, state.filters.states, state.filters.epochs),
      ).length,
    [state.filters],
  );

  return (
    <div className="h-screen flex flex-col bg-base-100">
      <header className="flex items-center gap-3 px-4 py-2 bg-base-300 border-b border-base-300 shrink-0">
        <h1 className="text-sm font-bold text-base-content">Research-Tree</h1>
        <span className="text-xs text-base-content/40">
          Membrana · v{typedGraph.version} · {typedGraph.updated}
        </span>
      </header>

      <FilterBar totalNodes={typedGraph.nodes.length} visibleNodes={visibleCount} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden">
          <GraphCanvas graph={typedGraph} />
        </main>
        <DetailPanel graph={typedGraph} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <UIProvider>
      <AppInner />
    </UIProvider>
  );
}
