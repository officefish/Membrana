import React from 'react';

import {
  BRANCH_SIDEBAR_SECTIONS,
  BRANCH_TAB_LABEL,
  type ScenarioBranchTab,
} from '../types/board-ui.js';

export interface BoardLeftSidebarProps {
  readonly activeBranch: ScenarioBranchTab;
  readonly isScenarioLayer: boolean;
  readonly onSelectBranch: (branch: ScenarioBranchTab) => void;
  readonly signalAdvanced: boolean;
  readonly isSignalLayer: boolean;
  readonly onSelectSignal: () => void;
}

/** Левый сайдбар доски (MP7b RT6): секции вкладок веток + advanced Signal. */
export const BoardLeftSidebar: React.FC<BoardLeftSidebarProps> = ({
  activeBranch,
  isScenarioLayer,
  onSelectBranch,
  signalAdvanced,
  isSignalLayer,
  onSelectSignal,
}) => (
  <nav
    className="flex h-full w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-base-300 bg-base-200 p-3"
    aria-label="Вкладки доски"
  >
    {BRANCH_SIDEBAR_SECTIONS.map((section) => (
      <div key={section.title} className="flex flex-col gap-1">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
          {section.title}
        </p>
        {section.tabs.map((branch) => {
          const active = isScenarioLayer && activeBranch === branch;
          return (
            <button
              key={branch}
              type="button"
              aria-current={active ? 'page' : undefined}
              className={`btn btn-sm justify-start ${active ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onSelectBranch(branch)}
            >
              {BRANCH_TAB_LABEL[branch]}
            </button>
          );
        })}
      </div>
    ))}

    {signalAdvanced ? (
      <div className="mt-auto flex flex-col gap-1 border-t border-base-300 pt-3">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
          Advanced
        </p>
        <button
          type="button"
          aria-current={isSignalLayer ? 'page' : undefined}
          className={`btn btn-sm justify-start ${isSignalLayer ? 'btn-secondary' : 'btn-ghost'}`}
          onClick={onSelectSignal}
        >
          Signal
        </button>
      </div>
    ) : null}
  </nav>
);
