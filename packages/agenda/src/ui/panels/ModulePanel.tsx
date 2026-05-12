import React from 'react';
import { useModule, useModulePlugins } from '../../core/hooks';
import { PluginList } from '../controls/PluginToggle';

interface ModulePanelProps {
  moduleId: string;
  showPlugins?: boolean;
  showConfig?: boolean;
  className?: string;
}

export const ModulePanel: React.FC<ModulePanelProps> = ({
  moduleId,
  showPlugins = true,
  showConfig = true,
  className = ''
}) => {
  const { module, enabled, toggle, 
    //updateConfig, 
    state } = useModule(moduleId);
  const { plugins } = useModulePlugins(moduleId);
  
  if (!module) return null;
  
  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{module.name}</h3>
          {module.description && (
            <p className="text-sm text-gray-600">{module.description}</p>
          )}
        </div>
        <button
          onClick={toggle}
          className={`px-3 py-1 rounded ${
            enabled ? 'bg-green-500 text-white' : 'bg-gray-300'
          }`}
        >
          {enabled ? 'Активен' : 'Неактивен'}
        </button>
      </div>
      
      {showPlugins && plugins.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Плагины</h4>
          <PluginList moduleId={moduleId} />
        </div>
      )}
      
      {showConfig && state?.config && (
        <div className="text-sm text-gray-500">
          <details>
            <summary className="cursor-pointer">Конфигурация</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(state.config, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};