import { useUIContext } from '../state/UIContext.js';
import type { NodeState, Epoch } from '../graph/types.js';
import { STATE_COLORS } from '../graph/adapter.js';

const ALL_STATES: NodeState[] = ['fog', 'available', 'exploring', 'established'];
const ALL_EPOCHS: Epoch[] = ['E0', 'E1', 'E2', 'E3', 'E4'];

const STATE_LABELS: Record<NodeState, string> = {
  fog:         'Туман',
  available:   'Доступно',
  exploring:   'Исследуется',
  established: 'Закреплено',
};

interface FilterBarProps {
  totalNodes: number;
  visibleNodes: number;
}

export function FilterBar({ totalNodes, visibleNodes }: FilterBarProps) {
  const { state, dispatch } = useUIContext();
  const { filters, highlightFrontier } = state;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-base-200 border-b border-base-300 flex-wrap">
      <span className="text-xs text-base-content/40 shrink-0">
        {visibleNodes}/{totalNodes} узлов
      </span>

      <div className="flex items-center gap-1 flex-wrap">
        {ALL_STATES.map((s) => {
          const active = filters.states.includes(s);
          return (
            <button
              key={s}
              onClick={() => dispatch({ type: 'TOGGLE_STATE_FILTER', state: s })}
              className={`badge badge-sm cursor-pointer transition-opacity select-none ${active ? 'opacity-100' : 'opacity-40'}`}
              style={{ backgroundColor: STATE_COLORS[s], color: '#fff', border: 'none' }}
            >
              {STATE_LABELS[s]}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        {ALL_EPOCHS.map((e) => {
          const active = filters.epochs.includes(e);
          return (
            <button
              key={e}
              onClick={() => dispatch({ type: 'TOGGLE_EPOCH_FILTER', epoch: e })}
              className={`badge badge-sm badge-outline cursor-pointer transition-opacity select-none ${active ? 'opacity-100' : 'opacity-40'}`}
            >
              {e}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => dispatch({ type: 'TOGGLE_FRONTIER' })}
        className={`badge badge-sm cursor-pointer select-none transition-colors ${highlightFrontier ? 'badge-error animate-pulse' : 'badge-ghost opacity-50'}`}
      >
        ▶ Фронтир
      </button>

      {(filters.states.length > 0 || filters.epochs.length > 0 || highlightFrontier) && (
        <button
          onClick={() => dispatch({ type: 'RESET_FILTERS' })}
          className="btn btn-ghost btn-xs"
        >
          сбросить
        </button>
      )}
    </div>
  );
}
