import React from 'react';
import { useModuleToggle } from '../../core/hooks';

interface ModuleToggleProps {
  moduleId: string;
  showLabel?: boolean;
  className?: string;
  onToggle?: (isEnabled: boolean) => void;
}

export const ModuleToggle: React.FC<ModuleToggleProps> = ({
  moduleId,
  showLabel = true,
  className = '',
  onToggle
}) => {
  const { isEnabled, toggle } = useModuleToggle(moduleId);
  
  const handleToggle = () => {
    toggle();
    onToggle?.(!isEnabled);
  };
  
  return (
    <button
      onClick={handleToggle}
      className={`relative inline-flex items-center px-3 py-2 rounded transition-all ${
        isEnabled 
          ? 'bg-green-500 text-white hover:bg-green-600' 
          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
      } ${className}`}
    >
      {showLabel && (isEnabled ? 'Вкл' : 'Выкл')}
    </button>
  );
};

// Switch-версия переключателя
export const ModuleSwitch: React.FC<ModuleToggleProps> = ({
  moduleId,
  className = '',
  onToggle
}) => {
  const { isEnabled, toggle } = useModuleToggle(moduleId);
  
  const handleToggle = () => {
    toggle();
    onToggle?.(!isEnabled);
  };
  
  return (
    <button
      onClick={handleToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isEnabled ? 'bg-green-500' : 'bg-gray-300'
      } ${className}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isEnabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};