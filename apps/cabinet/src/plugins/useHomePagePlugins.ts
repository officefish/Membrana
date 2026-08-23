/**
 * Жильцы страницы, взятые У ДОМА. Адаптер И-6 интеграции коворка `cowork-server-plugin-pages`.
 *
 * ВЛАДЕЛЕЦ ВКЛЮЧЁННОСТИ — ДОМ, и это несущее. Ядро `pagePlugins.ts` умеет держать включённость
 * само, и в изоляции блока B иначе было нельзя; но у дома она тоже есть, и дом по ней РЕШАЕТ —
 * выключенного он не зовёт и на запрос по нему бросает. Две включённости означали бы «выключил в
 * сайдбаре, а дом всё ещё зовёт плагина». Поэтому здесь состояние страницы — ОТРАЖЕНИЕ ответа
 * дома: переключение уходит на сервер, и местное состояние правится тем, что дом подтвердил.
 *
 * Правила ядра при этом сохраняются целиком: выключение активного гасит виджет и сворачивание —
 * ядро не переписано, оно применяется к отражённому состоянию.
 */
import { useCallback, useEffect, useState } from 'react';

import { fetchJournalPlugins, setJournalPluginEnabled } from '@/api/journal';

import {
  enabledIdsFromHome,
  toPagePlugins,
  type CabinetRendererRegistry,
  type HomePluginState,
} from './adapters/manifestToPagePlugin';
import {
  initialPagePluginsState,
  setEnabled,
  setMainCollapsed,
  type CabinetPagePlugin,
  type PagePluginsState,
} from './pagePlugins';

export interface UseHomePagePlugins {
  readonly plugins: readonly CabinetPagePlugin[];
  readonly state: PagePluginsState;
  readonly loading: boolean;
  readonly error: string | null;
  readonly toggle: (id: string, enabled: boolean) => void;
  readonly collapseMain: (collapsed: boolean) => void;
}

export function useHomePagePlugins(renderers: CabinetRendererRegistry): UseHomePagePlugins {
  const [states, setStates] = useState<readonly HomePluginState[]>([]);
  const [state, setState] = useState<PagePluginsState>(initialPagePluginsState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const fetched = (await fetchJournalPlugins()) as readonly HomePluginState[];
        if (!alive) return;
        setStates(fetched);
        // Положение галочек берётся у дома, а не сохраняется между заходами на страницу.
        setState((s) => ({ ...s, enabled: enabledIdsFromHome(fetched) }));
        setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Не удалось спросить дом о плагинах');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toggle = useCallback((id: string, enabled: boolean) => {
    void (async () => {
      try {
        await setJournalPluginEnabled(id, enabled);
        // Правим отражение только после подтверждения дома: иначе галочка соврёт о доме.
        setState((s) => setEnabled(s, id, enabled));
        setStates((prev) =>
          prev.map((p) => (p.manifest.id === id ? { manifest: p.manifest, enabled } : p)),
        );
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Дом не принял переключение');
      }
    })();
  }, []);

  const collapseMain = useCallback(
    (collapsed: boolean) => setState((s) => setMainCollapsed(s, collapsed)),
    [],
  );

  return {
    plugins: toPagePlugins(states, renderers),
    state,
    loading,
    error,
    toggle,
    collapseMain,
  };
}
