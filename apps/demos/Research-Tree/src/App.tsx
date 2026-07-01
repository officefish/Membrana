import { useMemo } from 'react';
import graph from '../membrana-knowledge-graph.json';
import { GraphCanvas } from './components/GraphCanvas.js';
import { DetailPanel } from './components/DetailPanel.js';
import { FilterBar } from './components/FilterBar.js';
import { UIProvider, useUIContext } from './state/UIContext.js';
import { matchesFilters, computeStatesAt, GENESIS_DATE } from './graph/adapter.js';
import type { KnowledgeGraph } from './graph/types.js';

const typedGraph = graph as unknown as KnowledgeGraph;

function AppInner() {
  const { state, dispatch } = useUIContext();

  const visibleCount = useMemo(() => {
    const stateOverrides =
      state.playhead === 'genesis' ? computeStatesAt(typedGraph, GENESIS_DATE) : null;
    return typedGraph.nodes.filter((n) => {
      const effective = stateOverrides ? { ...n, state: stateOverrides[n.id] ?? n.state } : n;
      return matchesFilters(effective, state.filters.states, state.filters.epochs);
    }).length;
  }, [state.filters, state.playhead]);

  return (
    <div className="h-screen flex flex-col bg-base-100">
      <header className="flex items-center gap-3 px-4 py-2 bg-base-300 border-b border-base-300 shrink-0">
        <h1 className="text-sm font-bold text-base-content">Research-Tree</h1>
        <span className="text-xs text-base-content/40">
          Membrana · v{typedGraph.version} · {typedGraph.updated}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            className={`btn btn-xs ${state.playhead === 'genesis' ? 'btn-warning' : 'btn-ghost opacity-50'}`}
            onClick={() => dispatch({ type: 'SET_PLAYHEAD', playhead: 'genesis' })}
            title="Состояние на 12 мая 2026 — первый коммит"
          >
            12 мая · Генезис
          </button>
          <span className="text-base-content/20 text-xs">→</span>
          <button
            className={`btn btn-xs ${state.playhead === 'now' ? 'btn-success' : 'btn-ghost opacity-50'}`}
            onClick={() => dispatch({ type: 'SET_PLAYHEAD', playhead: 'now' })}
            title="Текущее состояние — 1 июля 2026"
          >
            1 июля · Сейчас
          </button>
        </div>
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
