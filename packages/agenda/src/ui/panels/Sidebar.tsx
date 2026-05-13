import React, { useState } from 'react';
import { CategoryAccordion } from '../core/CategoryAccordion';
import { PluginsList } from '../core/PluginsList';
import { useMembranaTheme } from '../../core/provider';
import type { PluginSidebarDetailsArgs } from '../../core/types';

function CogIconSmall({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'w-3 h-3 shrink-0 opacity-80'}
      aria-hidden
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

interface SidebarProps {
  className?: string;
  /** Если не задан — заголовок не показывается (компактная шапка). */
  title?: string;
  /** Кастомные панели настроек плагинов во вкладке «Плагины». */
  renderPluginSidebarDetails?: (args: PluginSidebarDetailsArgs) => React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', title, renderPluginSidebarDetails }) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'plugins'>('modules');
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');
  const { config } = useMembranaTheme();

  return (
    <aside className={`border-r border-base-300 bg-base-100 flex flex-col ${className} ${config.sidebarWidth}`}>
      <div className="px-3 py-3 border-b border-base-300 bg-base-200/60">
        {title ? (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/55 mb-2">
            {title}
          </p>
        ) : null}

        <div className="join join-horizontal w-full">
          <button
            type="button"
            className={`btn btn-sm join-item flex-1 min-h-9 border-0 ${
              activeTab === 'modules' ? 'btn-primary' : 'btn-ghost'
            }`}
            onClick={() => setActiveTab('modules')}
          >
            Модули
          </button>
          <button
            type="button"
            className={`btn btn-sm join-item flex-1 min-h-9 border-0 ${
              activeTab === 'plugins' ? 'btn-primary' : 'btn-ghost'
            }`}
            onClick={() => setActiveTab('plugins')}
          >
            Плагины
          </button>
        </div>

        {activeTab === 'modules' && (
          <div className="join join-horizontal w-full mt-2">
            <button
              type="button"
              className={`btn btn-xs join-item flex-1 min-h-8 h-8 px-2 border-0 text-[11px] leading-none ${
                viewMode === 'favorites' ? 'btn-primary' : 'btn-ghost'
              }`}
              onClick={() => setViewMode('favorites')}
            >
              Избранные
            </button>
            <button
              type="button"
              className={`btn btn-xs join-item flex-1 min-h-8 h-8 px-2 border-0 text-[11px] leading-none ${
                viewMode === 'all' ? 'btn-primary' : 'btn-ghost'
              }`}
              onClick={() => setViewMode('all')}
              aria-label="Все модули — режим настройки списка"
              title="Все модули (настройка списка)"
            >
              <span className="inline-flex items-center justify-center gap-1">
                Все
                <CogIconSmall />
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {activeTab === 'modules' ? (
          <CategoryAccordion mode={viewMode} />
        ) : (
          <PluginsList renderPluginDetails={renderPluginSidebarDetails} />
        )}
      </div>
    </aside>
  );
};
