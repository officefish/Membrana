import React, { useState } from 'react';
import { CategoryAccordion } from '../core/CategoryAccordion';
import { PluginsList } from '../core/PluginsList';
import { useMembranaTheme } from '../../core/provider';

interface SidebarProps {
  className?: string;
  title?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  className = '',
  title = 'Управление'
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'plugins'>('modules');
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');
  const { config } = useMembranaTheme();

  return (
    <aside className={`border-r bg-base-100 flex flex-col ${className} ${config.sidebarWidth}`}>
      <div className="p-4 border-b bg-base-200">
        <h2 className="text-xl font-bold text-base-content">{title}</h2>
        
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setActiveTab('modules')}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'modules' 
                ? 'btn-primary text-primary-content' 
                : 'btn-ghost text-base-content hover:bg-base-300'
            }`}
          >
            📦 Модули
          </button>
          <button
            onClick={() => setActiveTab('plugins')}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'plugins' 
                ? 'btn-primary text-primary-content' 
                : 'btn-ghost text-base-content hover:bg-base-300'
            }`}
          >
            🔌 Плагины
          </button>
        </div>
        
        {/* Переключатель режимов только для вкладки модулей */}
        {activeTab === 'modules' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setViewMode('all')}
              className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'all' 
                  ? 'btn-secondary text-secondary-content' 
                  : 'btn-ghost text-base-content/60'
              }`}
            >
              📋 Все
            </button>
            <button
              onClick={() => setViewMode('favorites')}
              className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'favorites' 
                  ? 'btn-secondary text-secondary-content' 
                  : 'btn-ghost text-base-content/60'
              }`}
            >
              ⭐ Избранные
            </button>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'modules' 
          ? <CategoryAccordion mode={viewMode} />
          : <PluginsList />
        }
      </div>
    </aside>
  );
};