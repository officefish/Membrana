import React from 'react';
import { useCategories, useModulesByCategory, useModuleToggle, useModulePlugins, useMembranaStore } from '../../core/hooks';
import { Module } from '../../core/types';

interface CategoryAccordionProps {
  mode: 'all' | 'favorites';
}

export const CategoryAccordion: React.FC<CategoryAccordionProps> = ({ mode }) => {
  const categories = useCategories();

  return (
    <div className="space-y-2">
      {categories.map(category => (
        <CategoryItem key={category} category={category} mode={mode} />
      ))}
    </div>
  );
};

// Компонент категории с дази-аккордеоном
const CategoryItem: React.FC<{
  category: string;
  mode: 'all' | 'favorites';
}> = ({ category, mode }) => {
  const modules = useModulesByCategory(category);

  const favoriteModules = modules.filter((module) => {
    return module.enabled || module.activePlugins.length > 0;
  });

  const displayModules = mode === 'all' ? modules : favoriteModules;

  if (displayModules.length === 0 && mode === 'favorites') return null;

  return (
    <div className="collapse collapse-arrow bg-base-200 rounded-box">
      <input type="checkbox" className="peer" defaultChecked={true} />

      <div className="collapse-title flex items-center gap-2 min-w-0 p-3 min-h-0">
        <span className="text-sm font-medium text-base-content truncate">{category}</span>
        <span className="text-[11px] text-base-content/45 tabular-nums shrink-0">({displayModules.length})</span>
      </div>

      <div className="collapse-content p-0">
        <div className="divide-y divide-base-300">
          {displayModules.map((module) => (
            <ModuleItem key={module.id} module={module} mode={mode} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Компонент модуля
const ModuleItem: React.FC<{
  module: Module;
  mode: 'all' | 'favorites';
}> = ({ module, mode }) => {
  const { isEnabled, toggle } = useModuleToggle(module.id);
  const { plugins, activeIds, toggle: togglePlugin } = useModulePlugins(module.id);
  const [showPlugins, setShowPlugins] = React.useState(false);
  const selectedModuleId = useMembranaStore((state) => state.selectedModuleId);
  const selectModule = useMembranaStore((state) => state.selectModule);
  
  const hasActivePlugins = activeIds.length > 0;
  const isSelected = selectedModuleId === module.id;
  
  if (mode === 'favorites' && !isEnabled && !hasActivePlugins) return null;
  
  const handleModuleClick = () => {
    selectModule(module.id);
  };
  
  const handleToggle = (e: React.ChangeEvent) => {
    e.stopPropagation();
    toggle();
  };
  
  return (
    <div 
      className={`p-3 hover:bg-base-300/50 cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''
      }`}
      onClick={handleModuleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {mode === 'all' && (
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={handleToggle}
                onClick={(e) => e.stopPropagation()}
                className="checkbox checkbox-sm checkbox-primary"
              />
            )}
            
            <span className={`font-medium text-xs sm:text-sm ${isSelected ? 'text-primary' : 'text-base-content'}`}>
              {module.name}
            </span>
            
            {plugins.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlugins(!showPlugins);
                }}
                className="btn btn-xs btn-ghost gap-1"
              >
                <span className="text-xs">{showPlugins ? '▼' : '▶'}</span>
                <span className="text-xs">плагины ({activeIds.length}/{plugins.length})</span>
              </button>
            )}
            
            <span className="badge badge-sm badge-ghost text-xs">{module.version}</span>
          </div>
          
          {module.description && (
            <div className="text-[11px] text-base-content/55 mt-1 ml-7 leading-snug">{module.description}</div>
          )}
        </div>
        
        {mode === 'favorites' && isEnabled && (
          <span className="badge badge-xs badge-success badge-outline whitespace-nowrap">Вкл</span>
        )}
      </div>
      
      {/* Плагины модуля */}
      {showPlugins && plugins.length > 0 && (
        <div className="ml-8 mt-2 space-y-1">
          {plugins.map(plugin => (
            <div 
              key={plugin.id} 
              className="flex items-center justify-between py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                {mode === 'all' && (
                  <input
                    type="checkbox"
                    checked={activeIds.includes(plugin.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      togglePlugin(plugin.id);
                    }}
                    className="checkbox checkbox-xs checkbox-secondary"
                  />
                )}
                <span className="text-xs text-base-content/70">{plugin.name}</span>
                {plugin.description && (
                  <span className="text-xs text-base-content/40">- {plugin.description}</span>
                )}
              </div>
              
              {mode === 'all' && (
                <div className={`badge badge-xs ${activeIds.includes(plugin.id) ? 'badge-secondary' : 'badge-ghost'}`}>
                  {activeIds.includes(plugin.id) ? 'Вкл' : 'Выкл'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};