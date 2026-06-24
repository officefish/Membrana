import { describe, expect, it, vi } from 'vitest';
import type { NodeChange } from '@xyflow/react';

import {
  boardEditActionLabel,
  logBoardClipboardStep,
  logBoardEditStep,
  planNodeRemovalUndo,
  resolveBranchNavigationUndoClearReason,
} from './edit-step-log.js';
import { createEventBoardNode } from './event-node.js';

describe('edit-step-log', () => {
  it('boardEditActionLabel returns Russian labels', () => {
    expect(boardEditActionLabel('remove-nodes')).toBe('Удаление узлов');
  });

  it('planNodeRemovalUndo skips locked event removals', () => {
    const event = createEventBoardNode({
      id: 'event-initial',
      label: 'Event',
      position: { x: 0, y: 0 },
    });
    const changes: NodeChange[] = [{ type: 'remove', id: event.id }];
    const plan = planNodeRemovalUndo(changes, [event], true);
    expect(plan.shouldCapture).toBe(false);
    expect(plan.nodeIds).toEqual([]);
  });

  it('resolveBranchNavigationUndoClearReason maps handler and function transitions', () => {
    expect(resolveBranchNavigationUndoClearReason('main', 'main')).toBeNull();
    expect(resolveBranchNavigationUndoClearReason('main', 'alarm')).toBe('switch-handler-branch');
    expect(resolveBranchNavigationUndoClearReason('initial', 'onConnect')).toBe('switch-handler-branch');
    expect(resolveBranchNavigationUndoClearReason('function', 'main')).toBe('leave-function-body');
    expect(resolveBranchNavigationUndoClearReason('main', 'function')).toBe('enter-function-body');
  });

  it('logBoardEditStep writes to console when enabled', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logBoardEditStep(false, 'capture', 'remove-nodes', { nodeIds: ['n1'] });
    expect(spy).not.toHaveBeenCalled();

    logBoardEditStep(true, 'capture', 'remove-nodes', { nodeIds: ['n1'] });
    expect(spy).toHaveBeenCalledWith(
      '[INFO] device-board edit: capture',
      expect.objectContaining({
        action: 'remove-nodes',
        label: 'Удаление узлов',
        nodeIds: ['n1'],
      }),
    );

    logBoardEditStep(true, 'undo', 'undo', { restored: true });
    expect(spy).toHaveBeenLastCalledWith(
      '[INFO] device-board edit: undo',
      expect.objectContaining({ action: 'undo', label: 'Отмена шага' }),
    );

    logBoardEditStep(true, 'clear', 'undo', { reason: 'switch-function' });
    expect(spy).toHaveBeenLastCalledWith(
      '[INFO] device-board edit: clear',
      expect.objectContaining({ label: 'Сброс шага отмены', reason: 'switch-function' }),
    );

    spy.mockRestore();
  });

  it('logBoardClipboardStep writes clipboard events when enabled', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logBoardClipboardStep(false, 'copy-ok', { nodeCount: 2 });
    expect(spy).not.toHaveBeenCalled();

    logBoardClipboardStep(true, 'copy-ok', { nodeCount: 2 });
    expect(spy).toHaveBeenCalledWith(
      '[INFO] device-board clipboard: copy-ok',
      expect.objectContaining({ nodeCount: 2 }),
    );

    spy.mockRestore();
  });
});
