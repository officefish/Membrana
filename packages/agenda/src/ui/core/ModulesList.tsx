import React, { useState } from 'react';
import { useAllModules, useMembranaStore } from '../../core/hooks';
import { Module } from '../../core/types';

export const ModulesList: React.FC = () => {
  const allModules = useAllModules();
  const selectedModuleId = useMembranaStore((state) => state.selectedModuleId);
  const selectModule = useMembranaStore((state) => state.selectModule);
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');

  const modules =
    viewMode === 'all' ? allModules : allModules.filter((m) => m.enabled);

  if (modules.length === 0) {
    return (
      <div className="text-center text-xs text-base-content/50 py-8 leading-relaxed">
        {viewMode === 'all' ? 'Нет доступных модулей' : 'Нет избранных модулей'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="join join-horizontal w-full">
        <button
          type="button"
          onClick={() => setViewMode('all')}
          className={`btn btn-sm join-item flex-1 min-h-9 border-0 text-xs ${
            viewMode === 'all' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          Все модули
        </button>
        <button
          type="button"
          onClick={() => setViewMode('favorites')}
          className={`btn btn-sm join-item flex-1 min-h-9 border-0 text-xs ${
            viewMode === 'favorites' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          Избранные
        </button>
      </div>

      <div className="space-y-2">
        {modules.map((module) => (
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
  const toggleModule = React.useCallback(() => toggleModuleFn(module.id), [toggleModuleFn, module.id]);
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
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold tabular-nums shadow-sm ${
                isSelected
                  ? 'border-primary bg-primary text-primary-content'
                  : 'border-base-300 bg-base-200/80 text-primary'
              }`}
              aria-hidden
            >
              {(module.name?.trim().charAt(0) || '?').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className={`badge ${module.enabled ? 'badge-success' : 'badge-ghost'} gap-1`}>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${module.enabled ? 'bg-success' : 'bg-base-content/30'}`}
                  />
                </div>
                <h3 className="text-sm font-medium text-base-content">{module.name}</h3>
                <span className="text-[11px] text-base-content/45 tabular-nums">v{module.version}</span>
              </div>

              {module.description && (
                <div className="mt-1 text-xs leading-snug text-base-content/55">{module.description}</div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="badge badge-sm badge-ghost text-[11px]">{module.category}</span>
                {module.activePlugins.length > 0 && (
                  <span className="badge badge-sm badge-ghost text-[11px] tabular-nums">
                    Плагинов: {module.activePlugins.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {showCheckbox && (
            <div onClick={(e) => e.stopPropagation()}>
              <label className="flex flex-col items-end gap-0.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={module.enabled}
                  onChange={toggleModule}
                  className="checkbox checkbox-sm checkbox-primary"
                />
                <span className="text-[10px] text-base-content/50">
                  {module.enabled ? 'Вкл' : 'Выкл'}
                </span>
              </label>
            </div>
          )}
        </div>

        {isSelected && (
          <div className="mt-2 text-[11px] text-primary flex items-center gap-1">
            <span aria-hidden>▶</span> Активный модуль
          </div>
        )}
      </div>
    </div>
  );
};
