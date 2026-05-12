import React, { useState } from 'react';
import { useAllModules, useMembranaStore } from '../../core/hooks';
import { Module } from '../../core/types';
export const ModulesList: React.FC = () => {
  const allModules = useAllModules();
  const selectedModuleId = useMembranaStore((state) => state.selectedModuleId);
  const selectModule = useMembranaStore((state) => state.selectModule);
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');
  
  const modules = viewMode === 'all' 
    ? allModules 
    : allModules.filter(m => m.enabled);
  
  if (modules.length === 0) {
    return (
      <div className="text-center text-base-content/60 py-8">
        {viewMode === 'all' ? 'Нет доступных модулей' : 'Нет избранных модулей'}
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setViewMode('all')}
          className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
            viewMode === 'all' 
              ? 'btn-primary text-primary-content' 
              : 'btn-ghost text-base-content hover:bg-base-200'
          }`}
        >
          Все модули
        </button>
        <button
          onClick={() => setViewMode('favorites')}
          className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
            viewMode === 'favorites' 
              ? 'btn-primary text-primary-content' 
              : 'btn-ghost text-base-content hover:bg-base-200'
          }`}
        >
          ⭐ Избранные
        </button>
      </div>
      
      <div className="space-y-2">
        {modules.map(module => (
          <ModuleCard
            key={module.id}
            module={module}
            isSelected={selectedModuleId === module.id}
            onSelect={() => selectModule(module.id)}
            showCheckbox={viewMode === 'all'}
          />
        ))}
      </div>
    </div>
  );
};

const ModuleCard: React.FC<{
  module: Module;
  isSelected: boolean;
  onSelect: () => void;
  showCheckbox: boolean;
}> = ({ module, isSelected, onSelect, showCheckbox }) => {
  const toggleModuleFn = useMembranaStore((state) => state.toggleModule);
  const toggleModule = React.useCallback(
    () => toggleModuleFn(module.id),
    [toggleModuleFn, module.id],
  );
  return (
    <div
      className={`card cursor-pointer transition-all ${
        isSelected 
          ? 'border-2 border-primary bg-primary/10 shadow-md' 
          : 'border border-base-200 hover:border-base-300 hover:bg-base-200'
      }`}
      onClick={onSelect}
    >
      <div className="card-body p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className={`badge ${module.enabled ? 'badge-success' : 'badge-ghost'} gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${module.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
              </div>
              <h3 className="font-medium text-base-content">{module.name}</h3>
              <span className="text-xs text-base-content/40">v{module.version}</span>
            </div>
            
            {module.description && (
              <div className="text-sm text-base-content/60 mt-1">{module.description}</div>
            )}
            
            <div className="flex items-center gap-2 mt-2">
              <span className="badge badge-sm badge-ghost">{module.category}</span>
              {module.activePlugins.length > 0 && (
                <span className="badge badge-sm badge-purple gap-1">
                  🔌 {module.activePlugins.length} плагинов
                </span>
              )}
            </div>
          </div>
          
          {showCheckbox && (
            <div onClick={(e) => e.stopPropagation()}>
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={module.enabled}
                  onChange={toggleModule}
                  className="checkbox checkbox-sm checkbox-primary"
                />
                <span className="text-xs text-base-content/60">
                  {module.enabled ? 'Активен' : 'Выкл'}
                </span>
              </label>
            </div>
          )}
          
          {!showCheckbox && module.enabled && (
            <div className="text-warning text-lg">⭐</div>
          )}
        </div>
        
        {isSelected && (
          <div className="mt-2 text-xs text-primary flex items-center gap-1">
            <span>▶</span> Активный модуль
          </div>
        )}
      </div>
    </div>
  );
};