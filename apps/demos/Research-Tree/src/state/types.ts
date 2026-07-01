export type { NodeState, Epoch } from '../graph/types.js';

export interface UIFilters {
  states: import('../graph/types.js').NodeState[];
  epochs: import('../graph/types.js').Epoch[];
}

export interface UIState {
  selectedNodeId: string | null;
  filters: UIFilters;
  highlightFrontier: boolean;
}

export type UIAction =
  | { type: 'SELECT_NODE'; id: string | null }
  | { type: 'TOGGLE_STATE_FILTER'; state: import('../graph/types.js').NodeState }
  | { type: 'TOGGLE_EPOCH_FILTER'; epoch: import('../graph/types.js').Epoch }
  | { type: 'TOGGLE_FRONTIER' }
  | { type: 'RESET_FILTERS' };
