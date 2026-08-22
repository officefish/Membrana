/**
 * Состояние плагинов страницы — тонкая обёртка React над чистым ядром `pagePlugins.ts`.
 *
 * Вся логика (кто включён, кто активен, можно ли свернуть) живёт в ядре и проверена зубами без
 * DOM. Здесь только `useState` и проброс: хук — не место для правил, иначе правила станут
 * непроверяемыми вместе с ним.
 */
import { useCallback, useState } from 'react';

import {
  initialPagePluginsState,
  setActive,
  setEnabled,
  setMainCollapsed,
  type PagePluginsState,
} from './pagePlugins';

export interface UsePagePlugins {
  readonly state: PagePluginsState;
  readonly toggle: (id: string, enabled: boolean) => void;
  readonly activate: (id: string | null) => void;
  readonly collapseMain: (collapsed: boolean) => void;
}

export function usePagePlugins(initial: PagePluginsState = initialPagePluginsState): UsePagePlugins {
  const [state, setState] = useState<PagePluginsState>(initial);

  const toggle = useCallback((id: string, enabled: boolean) => {
    setState((s) => setEnabled(s, id, enabled));
  }, []);

  const activate = useCallback((id: string | null) => {
    setState((s) => setActive(s, id));
  }, []);

  const collapseMain = useCallback((collapsed: boolean) => {
    setState((s) => setMainCollapsed(s, collapsed));
  }, []);

  return { state, toggle, activate, collapseMain };
}
