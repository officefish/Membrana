import React from 'react';
import { Sidebar } from '../panels/Sidebar';
import { ModuleRenderer } from '../core/ModuleRenderer';
import type { PluginSidebarDetailsArgs } from '../../core/types';

interface DashboardProps {
  showSidebar?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  sidebarClassName?: string;
  contentClassName?: string;
  renderPluginSidebarDetails?: (args: PluginSidebarDetailsArgs) => React.ReactNode;
}

export const Dashboard: React.FC<DashboardProps> = ({
  showSidebar = true,
  header,
  footer,
  className = '',
  sidebarClassName = '',
  contentClassName = '',
  renderPluginSidebarDetails,
}) => {
  return (
    <div className={`flex flex-col h-screen bg-base-100 ${className}`}>
      {header && (
        <div className="border-b border-base-200 bg-base-100 px-6 py-3 shadow-sm">
          {header}
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
          <Sidebar className={sidebarClassName} renderPluginSidebarDetails={renderPluginSidebarDetails} />
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