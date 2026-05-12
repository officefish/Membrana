import React from 'react';
import { useCategory } from '../../core/hooks';

interface CategoryToggleProps {
  categoryId: string;
  showCount?: boolean;
  className?: string;
}

export const CategoryToggle: React.FC<CategoryToggleProps> = ({
  categoryId,
  showCount = true,
  className = ''
}) => {
  const { anyEnabled, toggleAll, modules } = useCategory(categoryId);
  
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <span className="font-medium">{categoryId}</span>
        {showCount && (
          <span className="ml-2 text-sm text-gray-500">
            ({modules.filter(m => m.state?.enabled).length}/{modules.length})
          </span>
        )}
      </div>
      <button
        onClick={toggleAll}
        className={`px-3 py-1 rounded text-sm transition-colors ${
          anyEnabled 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        {anyEnabled ? 'Выкл все' : 'Вкл все'}
      </button>
    </div>
  );
};