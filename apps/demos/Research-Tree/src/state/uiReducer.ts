import type { UIState, UIAction, NodeState, Epoch } from './types.js';

export const INITIAL_UI_STATE: UIState = {
  selectedNodeId: null,
  filters: {
    states: [],
    epochs: [],
  },
  highlightFrontier: false,
};

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.id };
    case 'TOGGLE_STATE_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          states: toggleItem<NodeState>(state.filters.states, action.state),
        },
      };
    case 'TOGGLE_EPOCH_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          epochs: toggleItem<Epoch>(state.filters.epochs, action.epoch),
        },
      };
    case 'TOGGLE_FRONTIER':
      return { ...state, highlightFrontier: !state.highlightFrontier };
    case 'RESET_FILTERS':
      return { ...state, filters: { states: [], epochs: [] }, highlightFrontier: false };
    default:
      return state;
  }
}
