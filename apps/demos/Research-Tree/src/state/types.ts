export type NodeState = 'fog' | 'available' | 'exploring' | 'established';

export type Epoch = 'E0' | 'E1' | 'E2' | 'E3' | 'E4';

export interface UIFilters {
  states: NodeState[];
  epochs: Epoch[];
}

export interface UIState {
  selectedNodeId: string | null;
  filters: UIFilters;
  highlightFrontier: boolean;
}

export type UIAction =
  | { type: 'SELECT_NODE'; id: string | null }
  | { type: 'TOGGLE_STATE_FILTER'; state: NodeState }
  | { type: 'TOGGLE_EPOCH_FILTER'; epoch: Epoch }
  | { type: 'TOGGLE_FRONTIER' }
  | { type: 'RESET_FILTERS' };
