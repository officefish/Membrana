import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMembranaStore } from '../../core/hooks';
import type { PluginSidebarDetailsArgs } from '../../core/types';

function ChevronIcon(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block h-3 w-3 max-h-3 max-w-3 shrink-0 transition-transform group-open:rotate-180 ${props.className ?? ''}`}
      width={12}
      height={12}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function DefaultPluginConfigSummary({ config }: { config: unknown }) {
  if (config === undefined || config === null) {
    return <p className="text-[11px] text-base-content/50 m-0">Параметры не заданы.</p>;
  }
  if (typeof config === 'object' && !Array.isArray(config) && Object.keys(config as object).length === 0) {
    return <p className="text-[11px] text-base-content/50 m-0">Параметры не заданы.</p>;
  }
  return (
    <pre className="text-[10px] leading-snug text-base-content/70 whitespace-pre-wrap break-words m-0 max-h-40 overflow-y-auto rounded-md bg-base-200/80 p-2 border border-base-300">
      {JSON.stringify(config, null, 2)}
    </pre>
  );
}

export interface PluginsListProps {
  /** Кастомный блок настроек внутри раскрывающегося списка; если не вернул узел — показывается JSON конфига. */
  renderPluginDetails?: (args: PluginSidebarDetailsArgs) => React.ReactNode;
}

export const PluginsList: React.FC<PluginsListProps> = ({ renderPluginDetails }) => {
  const selectedModuleId = useMembranaStore((state) => state.selectedModuleId);

  const plugins = useMembranaStore(
    useShallow((state) => {
      if (!selectedModuleId) return [];

      const pluginsList: Array<{
        id: string;
        name: string;
        description?: string;
        config: unknown;
      }> = [];

      const pluginsMap = state.plugins;
      if (pluginsMap instanceof Map) {
        const modulePluginsMap = pluginsMap.get(selectedModuleId);
        if (modulePluginsMap instanceof Map) {
          modulePluginsMap.forEach((plugin, pluginId) => {
            pluginsList.push({
              id: pluginId,
              name: plugin.name,
              description: plugin.description,
              config: plugin.config,
            });
          });
        }
      }

      return pluginsList;
    }),
  );

  const activeIds = useMembranaStore(
    useShallow((state) =>
      selectedModuleId ? (state.getModule(selectedModuleId)?.activePlugins ?? []) : [],
    ),
  );

  const module = useMembranaStore((state) =>
    selectedModuleId ? state.getModule(selectedModuleId) : undefined,
  );

  const togglePlugin = useMembranaStore((state) => state.togglePlugin);

  if (!selectedModuleId) {
    return (
      <p className="text-center text-xs text-base-content/50 py-6 leading-relaxed">
        Выберите модуль слева, чтобы увидеть его плагины.
      </p>
    );
  }

  if (plugins.length === 0) {
    return (
      <p className="text-center text-xs text-base-content/50 py-6 leading-relaxed">
        У этого модуля нет зарегистрированных плагинов.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-base-300 bg-base-200/50 px-2 py-1.5">
        <p className="text-xs font-medium text-base-content truncate">{module?.name ?? selectedModuleId}</p>
        <p className="text-[11px] text-base-content/50 leading-snug">Плагины · {plugins.length}</p>
      </div>

      <ul className="space-y-1.5 list-none p-0 m-0">
        {plugins.map((plugin) => (
          <li key={plugin.id}>
            <PluginItem
              moduleId={selectedModuleId}
              plugin={plugin}
              isActive={activeIds.includes(plugin.id)}
              onToggle={() => togglePlugin(selectedModuleId, plugin.id)}
              renderPluginDetails={renderPluginDetails}
            />
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-base-content/45 leading-snug px-0.5">
        Включение и выключение — переключатель справа. Настройки — в раскрывающемся блоке ниже названия.
      </p>
    </div>
  );
};

const PluginItem: React.FC<{
  moduleId: string;
  plugin: { id: string; name: string; description?: string; config: unknown };
  isActive: boolean;
  onToggle: () => void;
  renderPluginDetails?: (args: PluginSidebarDetailsArgs) => React.ReactNode;
}> = ({ moduleId, plugin, isActive, onToggle, renderPluginDetails }) => {
  const args: PluginSidebarDetailsArgs = useMemo(
    () => ({
      moduleId,
      pluginId: plugin.id,
      pluginName: plugin.name,
      config: plugin.config,
    }),
    [moduleId, plugin.id, plugin.name, plugin.config],
  );

  const customDetails = renderPluginDetails?.(args);
  const settingsBody =
    customDetails != null ? customDetails : <DefaultPluginConfigSummary config={plugin.config} />;

  return (
    <div className="rounded-box border border-base-300 bg-base-100 overflow-hidden hover:bg-base-200/40 transition-colors">
      <div className="flex items-start justify-between gap-2 px-2 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                isActive ? 'bg-success' : 'bg-base-content/25'
              }`}
              aria-hidden
            />
            <span className="text-xs font-medium text-base-content leading-tight">{plugin.name}</span>
          </div>
          {plugin.description ? (
            <p className="text-[11px] text-base-content/50 mt-0.5 leading-snug pl-3.5">{plugin.description}</p>
          ) : null}
        </div>

        <label className="flex flex-col items-end gap-0.5 cursor-pointer shrink-0">
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={isActive}
            onChange={onToggle}
            aria-label={isActive ? `Выключить «${plugin.name}»` : `Включить «${plugin.name}»`}
          />
          <span className="text-[10px] text-base-content/45 tabular-nums">{isActive ? 'Вкл' : 'Выкл'}</span>
        </label>
      </div>

      <details className="group border-t border-base-300 bg-base-200/30">
        <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] font-medium text-base-content/70 hover:bg-base-300/40 [&::-webkit-details-marker]:hidden">
          <span>Настройки</span>
          <ChevronIcon className="text-base-content/50" />
        </summary>
        <div className="px-2 pb-2 pt-0 space-y-1">{settingsBody}</div>
      </details>
    </div>
  );
};
