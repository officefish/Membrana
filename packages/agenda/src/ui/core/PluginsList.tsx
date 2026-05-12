import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMembranaStore } from '../../core/hooks';

export const PluginsList: React.FC = () => {
  // Подписываемся на изменения store
  const selectedModuleId = useMembranaStore((state) => state.selectedModuleId);

  // useShallow гарантирует, что новая ссылка на массив возвращается ТОЛЬКО
  // если содержимое реально изменилось — иначе бесконечный re-render.
  const plugins = useMembranaStore(
    useShallow((state) => {
      if (!selectedModuleId) return [];

      const pluginsList: Array<{
        id: string;
        name: string;
        description?: string;
        active: boolean;
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
              active: plugin.active,
            });
          });
        }
      }

      return pluginsList;
    }),
  );

  const module = useMembranaStore((state) =>
    selectedModuleId ? state.getModule(selectedModuleId) : undefined,
  );

  // Функции из стора стабильны — извлекаем без лямбды.
  const togglePlugin = useMembranaStore((state) => state.togglePlugin);
  
  if (!selectedModuleId) {
    return (
      <div className="text-center text-gray-500 py-8">
        Выберите модуль, чтобы увидеть его плагины
      </div>
    );
  }
  
  if (plugins.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        У выбранного модуля нет плагинов
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Информация о выбранном модуле */}
      <div className="p-2 bg-blue-50 rounded-lg">
        <span className="text-sm text-gray-600">Модуль:</span>
        <span className="font-medium text-sm ml-1">
          {module?.name || selectedModuleId}
        </span>
      </div>
      
      {/* Заголовок списка плагинов */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">
          Плагины ({plugins.length})
        </h3>
        <span className="text-xs text-gray-400">
          Включите/выключите плагины
        </span>
      </div>
      
      {/* Список плагинов */}
      <div className="space-y-2">
        {plugins.map(plugin => (
          <PluginItem 
            key={plugin.id} 
            plugin={plugin} 
            moduleId={selectedModuleId}
            onToggle={() => togglePlugin(selectedModuleId, plugin.id)}
          />
        ))}
      </div>
    </div>
  );
};

// Компонент плагина
const PluginItem: React.FC<{
  plugin: { id: string; name: string; description?: string; active: boolean };
  moduleId: string;
  onToggle: () => void;
}> = ({ plugin, onToggle }) => {
  return (
    <div className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${plugin.active ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="font-medium text-sm">{plugin.name}</span>
        </div>
        {plugin.description && (
          <div className="text-xs text-gray-500 mt-1">{plugin.description}</div>
        )}
      </div>
      
      <label className="flex items-center gap-2 cursor-pointer ml-4">
        <input
          type="checkbox"
          checked={plugin.active}
          onChange={onToggle}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className={`text-xs ${plugin.active ? 'text-green-600' : 'text-gray-500'}`}>
          {plugin.active ? 'Активен' : 'Неактивен'}
        </span>
      </label>
    </div>
  );
};