import React from 'react';
import { useCategories, useCategory } from '../../core/hooks';

interface CategoryListProps {
  renderCategory?: (category: string, anyEnabled: boolean, toggleAll: () => void, modulesCount: number) => React.ReactNode;
  showModuleCount?: boolean;
  className?: string;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  renderCategory,
  showModuleCount = true,
  className = ''
}) => {
  const categories = useCategories();
  
  const defaultRender = (
    category: string, 
    anyEnabled: boolean, 
    toggleAll: () => void, 
    modulesCount: number
  ) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <span className="font-medium">{category}</span>
        {showModuleCount && (
          <span className="ml-2 text-sm text-gray-500">({modulesCount})</span>
        )}
      </div>
      <button
        onClick={toggleAll}
        className={`px-3 py-1 rounded text-sm transition-colors ${
          anyEnabled 
            ? 'bg-orange-500 text-white hover:bg-orange-600' 
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        {anyEnabled ? 'Выключить все' : 'Включить все'}
      </button>
    </div>
  );
  
  return (
    <div className={`space-y-2 ${className}`}>
      {categories.map(category => (
        <CategoryListItem 
          key={category}
          category={category}
          renderCategory={renderCategory}
          defaultRender={defaultRender}
          showModuleCount={showModuleCount}
        />
      ))}
    </div>
  );
};

// Отдельный компонент для каждой категории
const CategoryListItem: React.FC<{
  category: string;
  renderCategory?: (category: string, anyEnabled: boolean, toggleAll: () => void, modulesCount: number) => React.ReactNode;
  defaultRender: (category: string, anyEnabled: boolean, toggleAll: () => void, modulesCount: number) => React.ReactNode;
  showModuleCount: boolean;
}> = ({ category, renderCategory, defaultRender, showModuleCount }) => {
  const { anyEnabled, toggleAll, modules } = useCategory(category);
  
  return renderCategory
    ? <>{renderCategory(category, anyEnabled, toggleAll, modules.length)}</>
    : <>{defaultRender(category, anyEnabled, toggleAll, modules.length)}</>;
};