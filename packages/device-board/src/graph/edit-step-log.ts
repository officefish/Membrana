import type { Node, NodeChange } from '@xyflow/react';

import type { ScenarioBranchTab } from '../types/board-ui.js';
import { hasNodeRemovalChanges } from './edit-undo-snapshot.js';
import { rejectSystemNodeRemovals } from './event-node.js';

/** Типы mutating-операций, для которых сохраняется undo depth=1. */
export type BoardEditStepAction =
  | 'remove-nodes'
  | 'remove-function'
  | 'add-function-pin'
  | 'remove-function-pin'
  | 'collapse-to-function'
  | 'collapse-to-group'
  | 'clear-branch'
  | 'align-layout'
  | 'paste-nodes';

const EDIT_ACTION_LABELS: Record<BoardEditStepAction, string> = {
  'remove-nodes': 'Удаление узлов',
  'remove-function': 'Удаление функции',
  'add-function-pin': 'Добавление pin',
  'remove-function-pin': 'Удаление pin',
  'collapse-to-function': 'Свёртка в функцию',
  'collapse-to-group': 'Свёртка в группу',
  'clear-branch': 'Очистка ветки',
  'align-layout': 'Выравнивание / layout',
  'paste-nodes': 'Вставка узлов',
};

/** Человекочитаемая подпись для tooltip кнопки undo. */
export function boardEditActionLabel(action: BoardEditStepAction): string {
  return EDIT_ACTION_LABELS[action];
}

/**
 * Reason для сброса undo при смене ветки сценария.
 * `null` — ветка не меняется (например повторный select той же function).
 */
export function resolveBranchNavigationUndoClearReason(
  from: ScenarioBranchTab,
  to: ScenarioBranchTab,
): string | null {
  if (from === to) {
    return null;
  }
  if (from === 'function' && to !== 'function') {
    return 'leave-function-body';
  }
  if (to === 'function' && from !== 'function') {
    return 'enter-function-body';
  }
  return 'switch-handler-branch';
}

/** Планирует undo перед удалением узлов (с учётом locked/system). */
export function planNodeRemovalUndo(
  changes: readonly NodeChange[],
  nodes: readonly Node[],
  rejectSystem: boolean,
): { shouldCapture: boolean; nodeIds: readonly string[] } {
  const filtered: NodeChange[] = rejectSystem
    ? rejectSystemNodeRemovals([...changes], [...nodes])
    : [...changes];
  if (!hasNodeRemovalChanges(filtered)) {
    return { shouldCapture: false, nodeIds: [] };
  }
  const nodeIds = filtered
    .filter((change): change is NodeChange & { type: 'remove'; id: string } => change.type === 'remove')
    .map((change) => change.id);
  return { shouldCapture: true, nodeIds };
}

/**
 * INFO-лог шага редактирования (для агентов / `logs/apps/client/console-logs.txt`).
 * Пишет только в edit mode при включённой галочке INFO.
 */
export function logBoardEditStep(
  enabled: boolean,
  kind: 'capture' | 'undo' | 'clear',
  action: BoardEditStepAction | 'undo',
  meta?: Record<string, unknown>,
): void {
  if (!enabled) {
    return;
  }
  const label =
    kind === 'capture'
      ? boardEditActionLabel(action as BoardEditStepAction)
      : kind === 'undo'
        ? 'Отмена шага'
        : 'Сброс шага отмены';
  // eslint-disable-next-line no-console
  console.log(`[INFO] device-board edit: ${kind}`, {
    action,
    label,
    at: new Date().toISOString(),
    ...meta,
  });
}
