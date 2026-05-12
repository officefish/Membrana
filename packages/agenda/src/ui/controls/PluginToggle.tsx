import React from 'react';
import { useModulePlugins } from '../../core/hooks';

interface PluginToggleProps {
  moduleId: string;
  pluginId: string;
  showLabel?: boolean;
  className?: string;
}

export const PluginToggle: React.FC<PluginToggleProps> = ({
  moduleId,
  pluginId,
  showLabel = true,
  className = ''
}) => {
  const { activeIds, toggle } = useModulePlugins(moduleId);
  const isOn = activeIds.includes(pluginId);

  return (
    <button
      onClick={() => toggle(pluginId)}
      className={`px-2 py-1 rounded text-xs transition-colors ${
        isOn
          ? 'bg-purple-500 text-white hover:bg-purple-600'
          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
      } ${className}`}
    >
      {showLabel && (isOn ? '✓' : '✗')}
    </button>
  );
};

export const PluginList: React.FC<{ moduleId: string }> = ({ moduleId }) => {
  const { plugins, activeIds, toggle } = useModulePlugins(moduleId);
  
  if (plugins.length === 0) return null;
  
  return (
    <div className="flex gap-2 flex-wrap">
      {plugins.map(plugin => (
        <button
          key={plugin.id}
          onClick={() => toggle(plugin.id)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            activeIds.includes(plugin.id)
              ? 'bg-purple-100 text-purple-700 border-purple-300'
              : 'bg-gray-100 text-gray-600 border-gray-200'
          } border`}
        >
          {plugin.name}
          {plugin.version && <span className="ml-1 text-xs opacity-75">v{plugin.version}</span>}
        </button>
      ))}
    </div>
  );
};