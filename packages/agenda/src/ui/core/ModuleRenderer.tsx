import React from 'react';
import { useMembranaStore, useModuleProps } from '../../core/hooks';

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
  
  return (
    <div className={className}>
      <module.Component {...props} />
    </div>
  );
};