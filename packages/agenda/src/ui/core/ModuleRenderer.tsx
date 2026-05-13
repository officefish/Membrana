import React, { Suspense } from 'react';
import { useMembranaStore, useModuleProps } from '../../core/hooks';
import { isRenderableComponentType } from '../../core/isRenderableComponentType';
import type { ModuleProps } from '../../core/types';
import { ModuleHeader } from './ModuleHeader';

const ModuleLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-base-content/60">
    <span className="loading loading-spinner loading-lg text-primary" aria-hidden />
    <span className="text-sm">Загрузка модуля…</span>
  </div>
);

interface ModuleRendererProps {
  emptyMessage?: React.ReactNode;
  className?: string;
}

export const ModuleRenderer: React.FC<ModuleRendererProps> = ({
  emptyMessage = 'Выберите модуль из списка слева',
  className = ''
}) => {
  const selectedModuleId = useMembranaStore((state) => state.selectedModuleId);
  const module = useMembranaStore((state) => state.getModule(selectedModuleId || ''));
  const props = useModuleProps(selectedModuleId || '');
  
  if (!selectedModuleId || !module || !props) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center max-w-sm px-4">
          <div className="mx-auto mb-4 h-14 w-14 rounded-box border border-base-300 bg-base-200/80" aria-hidden />
          <p className="text-base text-base-content">{emptyMessage}</p>
          <p className="text-xs text-base-content/55 mt-2 leading-relaxed">
            Активируйте модуль и выберите его в боковой панели.
          </p>
        </div>
      </div>
    );
  }
  
  // Проверяем, включен ли модуль
  if (!module.enabled) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center max-w-sm px-4">
          <div
            className="mx-auto mb-4 h-14 w-14 rounded-box border border-warning/40 bg-warning/10"
            aria-hidden
          />
          <p className="text-base text-base-content">Модуль «{module.name}» отключён</p>
          <p className="text-xs text-base-content/55 mt-2 leading-relaxed">
            Включите модуль в боковой панели.
          </p>
        </div>
      </div>
    );
  }

  if (!isRenderableComponentType(module.Component)) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center text-base-content/60 text-sm">
          Модуль «{module.name}» ещё не готов к отображению (нет компонента).
        </div>
      </div>
    );
  }

  const ModuleView = module.Component as React.ComponentType<ModuleProps>;

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <ModuleHeader title={module.name} description={module.description} />
      <Suspense fallback={<ModuleLoadingFallback />}>
        <ModuleView {...props} />
      </Suspense>
    </div>
  );
};