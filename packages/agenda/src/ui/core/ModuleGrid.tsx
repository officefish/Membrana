import React from 'react';
import { useModuleToggle, useEnabledModulesList } from '../../core/hooks';
import { Module } from '../../core/types';

interface ModuleGridProps {
  category?: string;
  renderCard?: (module: Module, isEnabled: boolean, toggle: () => void) => React.ReactNode;
  columns?: number;
  className?: string;
  emptyMessage?: React.ReactNode;
}

export const ModuleGrid: React.FC<ModuleGridProps> = ({
  category,
  renderCard,
  columns = 3,
  className = '',
  emptyMessage = 'Нет активных модулей'
}) => {
  const modulesList = useEnabledModulesList(category);
  
  if (modulesList.length === 0) {
    return <div className="text-gray-500 p-8 text-center">{emptyMessage}</div>;
  }
  
  const defaultCard = (module: Module, isEnabled: boolean, toggle: () => void) => (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg text-gray-900">{module.name}</h3>
        <span className={`text-xs px-2 py-1 rounded ${
          isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {module.version}
        </span>
      </div>
      {module.description && (
        <p className="text-sm text-gray-600 mb-3">{module.description}</p>
      )}
      <div className="text-xs text-gray-400 mb-3">Категория: {module.category}</div>
      <button
        onClick={toggle}
        className={`w-full py-2 rounded-md text-sm font-medium transition-colors ${
          isEnabled 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isEnabled ? 'Деактивировать' : 'Активировать'}
      </button>
    </div>
  );
  
  const gridCols: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-6',
  };
  
  return (
    <div className={`grid ${gridCols[columns] || gridCols[3]} gap-4 ${className}`}>
      {modulesList.map((module: Module) => (
        <ModuleGridItem 
          key={module.id}
          module={module}
          renderCard={renderCard}
          defaultCard={defaultCard}
        />
      ))}
    </div>
  );
};

// Отдельный компонент для карточки
const ModuleGridItem: React.FC<{
  module: Module;
  renderCard?: (module: Module, isEnabled: boolean, toggle: () => void) => React.ReactNode;
  defaultCard: (module: Module, isEnabled: boolean, toggle: () => void) => React.ReactNode;
}> = ({ module, renderCard, defaultCard }) => {
  const { isEnabled, toggle } = useModuleToggle(module.id);
  
  return renderCard 
    ? <>{renderCard(module, isEnabled, toggle)}</>
    : <>{defaultCard(module, isEnabled, toggle)}</>;
};