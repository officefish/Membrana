import React, { Suspense } from 'react';
import { useMembranaStore, useModuleProps } from '../../core/hooks';
import { isRenderableComponentType } from '../../core/isRenderableComponentType';
import type { ModuleProps } from '../../core/types';

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
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-lg">{emptyMessage}</div>
          <div className="text-sm mt-2">Активируйте модуль и выберите его в сайдбаре</div>
        </div>
      </div>
    );
  }
  
  // Проверяем, включен ли модуль
  if (!module.enabled) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-lg">Модуль "{module.name}" отключен</div>
          <div className="text-sm mt-2">Включите модуль в сайдбаре</div>
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
    <div className={className}>
      <Suspense fallback={<ModuleLoadingFallback />}>
        <ModuleView {...props} />
      </Suspense>
    </div>
  );
};