import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { uiReducer, INITIAL_UI_STATE } from './uiReducer.js';
import type { UIState, UIAction } from './types.js';

interface UIContextValue {
  state: UIState;
  dispatch: React.Dispatch<UIAction>;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, INITIAL_UI_STATE);
  return <UIContext.Provider value={{ state, dispatch }}>{children}</UIContext.Provider>;
}

export function useUIContext(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUIContext must be used inside UIProvider');
  return ctx;
}
