import type { NodeChange } from '@xyflow/react';

import type { HydratedBoardState } from './hydrate-board-from-document.js';

/** Глубокая копия hydrated state для undo depth=1. */
export function cloneHydratedBoardState(state: HydratedBoardState): HydratedBoardState {
  return structuredClone(state);
}

/** True, если batch NodeChange содержит удаление узлов. */
export function hasNodeRemovalChanges(changes: readonly NodeChange[]): boolean {
  return changes.some((change) => change.type === 'remove');
}
