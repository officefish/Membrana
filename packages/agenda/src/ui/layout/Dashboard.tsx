import React from 'react';
import { Sidebar } from '../panels/Sidebar';
import { ModuleRenderer } from '../core/ModuleRenderer';
import { ThemeSelector } from '../controls/ThemeSelector';
import { useTheme } from '../../core/provider';

interface DashboardProps {
  showSidebar?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  sidebarClassName?: string;
  contentClassName?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  showSidebar = true,
  header,
  footer,
  className = '',
  sidebarClassName = '',
  contentClassName = ''
}) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`flex flex-col h-screen bg-base-100 ${className}`}>
      {header && (
        <div className="border-b border-base-200 bg-base-100 px-6 py-4 shadow-sm">
          {header}
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
          <Sidebar className={sidebarClassName} />
        )}
        
        <main className={`flex-1 overflow-y-auto p-6 bg-base-200 ${contentClassName}`}>
          <div className="max-w-7xl mx-auto">
            <ModuleRenderer />
          </div>
        </main>
      </div>
      
      {footer && (
        <div className="border-t border-base-200 bg-base-100 px-6 py-3">
          {footer}
        </div>
      )}
    </div>
  );
};