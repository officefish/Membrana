import type { NodeChange } from '@xyflow/react';

/** Пропускаем в structure read-only: выделение и измерение DOM (нужно MiniMap и hitbox). */
export function isStructureReadOnlyPreservingNodeChange(change: NodeChange): boolean {
  return change.type === 'select' || change.type === 'dimensions';
}

export function filterStructureReadOnlyNodeChanges(changes: readonly NodeChange[]): NodeChange[] {
  return changes.filter(isStructureReadOnlyPreservingNodeChange);
}
