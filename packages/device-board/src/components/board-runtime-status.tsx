import React from 'react';

import type { ScenarioRuntimeState } from '../runtime/index.js';

export interface BoardRuntimeStatusProps {
  readonly state: ScenarioRuntimeState;
}

/** Статус scenario runtime под шапкой доски. */
export const BoardRuntimeStatus: React.FC<BoardRuntimeStatusProps> = ({ state }) => {
  if (state.phase === 'idle' && !state.isRunning && state.lastError === null) {
    return null;
  }

  const parts = [
    `phase: ${state.phase}`,
    state.activeBranch ? `branch: ${state.activeBranch}` : null,
    state.activeBlockKind ? `block: ${state.activeBlockKind}` : null,
    state.mainLoopIteration > 0 ? `main #${state.mainLoopIteration}` : null,
    state.alarmLoopIteration > 0 ? `alarm #${state.alarmLoopIteration}` : null,
    state.lastStopReason ? `stop: ${state.lastStopReason}` : null,
  ].filter((part): part is string => part !== null);

  return (
    <div
      className={[
        'border-b px-4 py-2 text-xs',
        state.phase === 'error'
          ? 'border-error/30 bg-error/10 text-error'
          : 'border-info/30 bg-info/10 text-base-content/80',
      ].join(' ')}
    >
      <span className="font-semibold">Runtime</span>
      <span className="ml-2">{parts.join(' · ')}</span>
      {state.lastError ? <p className="mt-1 text-error">{state.lastError}</p> : null}
    </div>
  );
};
