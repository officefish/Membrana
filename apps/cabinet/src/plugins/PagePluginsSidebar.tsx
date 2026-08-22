/**
 * Правый сайдбар плагинов страницы кабинета. Блок B коворка `cowork-server-plugin-pages`.
 *
 * СПРАВА — ОБОСНОВАНО, НЕ КОСМЕТИКА (Т8 шторма 22.08). У Studio сайдбар слева, потому что у
 * прибора экран компактный и левый край ближе к органам управления. В кабинете справа, потому
 * что это операторская: монитор берут под задачу, основное поле держат по центру-слева, а
 * служебный список — по правому краю, куда уходит взгляд после работы с телом страницы.
 * Сторона следует физике рабочего места, а не вкусу; выравнивать кабинет под Studio нельзя —
 * это разные рабочие места. Текст для канона §3 — в `SIDEBAR_SIDE.md` рядом.
 *
 * НАСТРОЙКИ ТОЛЬКО ЗДЕСЬ. Канон §3: параметры, которые пользователь меняет руками, живут в
 * сайдбаре и НЕ дублируются в теле страницы. Поэтому `renderSettings` вызывается только тут.
 */
import { useState } from 'react';

import {
  isEnabled,
  isSupportedForm,
  type CabinetPagePlugin,
  type PagePluginsState,
} from './pagePlugins';

export interface PagePluginsSidebarProps {
  readonly plugins: readonly CabinetPagePlugin[];
  readonly state: PagePluginsState;
  readonly onToggle: (id: string, enabled: boolean) => void;
  readonly onActivate: (id: string | null) => void;
}

export function PagePluginsSidebar({ plugins, state, onToggle, onActivate }: PagePluginsSidebarProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (plugins.length === 0) {
    return (
      <aside className="w-full lg:w-64 shrink-0" aria-label="Плагины страницы">
        <p className="text-xs text-base-content/45">У этой страницы пока нет жильцов.</p>
      </aside>
    );
  }

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-2" aria-label="Плагины страницы">
      <h2 className="text-sm font-semibold text-base-content/70">Плагины</h2>
      <ul className="space-y-1">
        {plugins.map((plugin) => {
          const enabled = isEnabled(state, plugin.id);
          const active = state.activeId === plugin.id;
          const settingsOpen = openId === plugin.id;
          return (
            <li key={plugin.id} className="rounded border border-base-300/60 p-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={enabled}
                  aria-label={`Включить ${plugin.name}`}
                  onChange={(e) => onToggle(plugin.id, e.target.checked)}
                />
                <button
                  type="button"
                  className={`flex-1 text-left text-sm ${active ? 'font-semibold' : ''} ${enabled ? '' : 'text-base-content/40'}`}
                  disabled={!enabled}
                  aria-pressed={active}
                  onClick={() => onActivate(active ? null : plugin.id)}
                >
                  {plugin.name}
                </button>
              </div>

              {plugin.description ? (
                <p className="mt-1 text-xs text-base-content/50">{plugin.description}</p>
              ) : null}

              {!isSupportedForm(plugin.form) ? (
                // Форма вне списка страницы — не отказ жильцу: он остаётся зарегистрированным,
                // а страница честно говорит, что рисовать его не умеет.
                <p className="mt-1 text-xs text-warning" role="status">
                  форма «{plugin.form}» страницей не поддерживается
                </p>
              ) : null}

              {plugin.renderSettings ? (
                <details
                  className="mt-1"
                  open={settingsOpen}
                  onToggle={(e) => setOpenId(e.currentTarget.open ? plugin.id : null)}
                >
                  <summary className="cursor-pointer text-xs text-base-content/60">Настройки</summary>
                  <div className="mt-1">{plugin.renderSettings()}</div>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
