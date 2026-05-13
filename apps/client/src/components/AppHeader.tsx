import React from 'react';
import { ThemeSelector, useSelectedModule } from '@membrana/agenda';
import { SpatialIntelLogo } from './SpatialIntelLogo';
import { StorageRuntimeIndicator } from './StorageRuntimeIndicator';

export const AppHeader: React.FC = () => {
  const { module, selectedModuleId } = useSelectedModule();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
        <SpatialIntelLogo />
        <div className="min-w-0 border-l border-base-300 pl-3 md:pl-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/55 leading-tight">
            программа пространственной разведки
          </p>
        </div>

        <div className="hidden min-w-0 flex-1 border-l border-base-300 pl-3 md:block md:pl-4 lg:max-w-xl">
          <p className="text-[10px] uppercase tracking-wide text-base-content/45">модуль</p>
          {module && selectedModuleId ? (
            <>
              <h2 className="truncate text-sm font-semibold text-base-content leading-tight">{module.name}</h2>
              {module.description ? (
                <p className="mt-0.5 line-clamp-2 text-[11px] text-base-content/55 leading-snug">
                  {module.description}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-base-content/50">Выберите модуль в списке слева</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-end justify-end gap-3 md:gap-4">
        <StorageRuntimeIndicator />
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-base-content/45">тема</span>
          <ThemeSelector showLabel={false} showIcons={false} className="[&_.btn]:btn-xs [&_.btn]:min-h-8" />
        </div>
      </div>

      {/* На узких экранах блок модуля под основной строкой */}
      <div className="w-full border-t border-base-200 pt-2 md:hidden">
        <p className="text-[10px] uppercase tracking-wide text-base-content/45">модуль</p>
        {module && selectedModuleId ? (
          <>
            <h2 className="text-sm font-semibold text-base-content">{module.name}</h2>
            {module.description ? (
              <p className="mt-0.5 text-[11px] text-base-content/55 leading-snug">{module.description}</p>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-base-content/50">Выберите модуль в списке слева</p>
        )}
      </div>
    </div>
  );
};
