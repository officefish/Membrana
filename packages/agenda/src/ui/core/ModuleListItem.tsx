// components/ModuleListItem.tsx
import React, { useState } from 'react';
import { useModuleToggle, useModulePlugins } from '../../core/hooks';
import { Module } from '../../core/types';

interface ModuleListItemProps {
  module: Module;
  showCheckbox?: boolean;
  onToggle?: (moduleId: string, enabled: boolean) => void;
}

export const ModuleListItem: React.FC<ModuleListItemProps> = ({ 
  module, 
  showCheckbox = true,
  onToggle 
}) => {
  const { isEnabled, toggle } = useModuleToggle(module.id);
  const { plugins, activeIds, toggle: togglePlugin } = useModulePlugins(module.id);
  const [showPlugins, setShowPlugins] = useState(false);
  
  const handleToggle = () => {
    toggle();
    onToggle?.(module.id, !isEnabled);
  };
  
  return (
    <div className="border rounded-lg p-3 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {showCheckbox && (
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={handleToggle}
                className="w-4 h-4 rounded border-gray-300"
              />
            )}
            <span className="font-medium">{module.name}</span>
            <span className="text-xs text-gray-400">v{module.version}</span>
            {plugins.length > 0 && (
              <button
                onClick={() => setShowPlugins(!showPlugins)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                {showPlugins ? '▼' : '▶'} плагины ({activeIds.length}/{plugins.length})
              </button>
            )}
          </div>
          {module.description && (
            <p className="text-sm text-gray-500 mt-1">{module.description}</p>
          )}
        </div>
        
        {!showCheckbox && (
          <span className={`text-xs px-2 py-1 rounded ${
            isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {isEnabled ? 'Активен' : 'Неактивен'}
          </span>
        )}
      </div>
      
      {/* Плагины */}
      {showPlugins && plugins.length > 0 && (
        <div className="ml-6 mt-3 space-y-2">
          <div className="text-xs font-medium text-gray-500 mb-1">Плагины:</div>
          {plugins.map(plugin => (
            <div key={plugin.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={activeIds.includes(plugin.id)}
                  onChange={() => togglePlugin(plugin.id)}
                  className="w-3 h-3 rounded border-gray-300"
                />
                <span className="text-sm">{plugin.name}</span>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                activeIds.includes(plugin.id) 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {activeIds.includes(plugin.id) ? 'Активен' : 'Неактивен'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};