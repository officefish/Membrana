import { useCallback, useRef, useState, type MutableRefObject, type RefObject } from 'react';

import type { HydratedBoardState } from './hydrate-board-from-document.js';
import { cloneHydratedBoardState } from './edit-undo-snapshot.js';
import {
  boardEditActionLabel,
  logBoardEditStep,
  type BoardEditStepAction,
} from './edit-step-log.js';

/** Mutable store для undo depth=1 (тестируется без React). */
export class EditUndoControllerCore {
  private snapshot: HydratedBoardState | null = null;
  private lastAction: BoardEditStepAction | null = null;

  hasPending(): boolean {
    return this.snapshot !== null;
  }

  getLastAction(): BoardEditStepAction | null {
    return this.lastAction;
  }

  clear(): void {
    this.snapshot = null;
    this.lastAction = null;
  }

  capture(state: HydratedBoardState, action: BoardEditStepAction): void {
    this.snapshot = state;
    this.lastAction = action;
  }

  takeForRestore(): { snapshot: HydratedBoardState; action: BoardEditStepAction | null } | null {
    if (this.snapshot === null) {
      return null;
    }
    const result = {
      snapshot: this.snapshot,
      action: this.lastAction,
    };
    this.clear();
    return result;
  }
}

export interface UseEditUndoControllerOptions {
  readonly isRuntimeRunning: boolean;
  readonly showInfoLogsRef: RefObject<boolean>;
  readonly buildHydratedSnapshotRef: RefObject<(() => HydratedBoardState) | null>;
  readonly applyHydratedStateRef: MutableRefObject<(state: HydratedBoardState) => void>;
  readonly runValidationRef: MutableRefObject<() => void>;
  readonly recalcDirtyAfterSkip: () => void;
  readonly skipDirtyRef: MutableRefObject<boolean>;
}

export interface EditUndoControllerApi {
  readonly canUndoLastEdit: boolean;
  readonly lastUndoableEditLabel: string | null;
  readonly clearEditUndoSnapshot: () => void;
  readonly captureEditUndoSnapshot: (
    action: BoardEditStepAction,
    meta?: Record<string, unknown>,
  ) => void;
  readonly undoLastEdit: () => boolean;
  readonly forgetPendingEditUndo: (reason: string) => void;
}

/** Undo depth=1: snapshot capture / restore / forget для device-board graph. */
export function useEditUndoController(options: UseEditUndoControllerOptions): EditUndoControllerApi {
  const coreRef = useRef(new EditUndoControllerCore());
  const [canUndoLastEdit, setCanUndoLastEdit] = useState(false);
  const [lastUndoableEditLabel, setLastUndoableEditLabel] = useState<string | null>(null);

  const syncUiFromCore = useCallback(() => {
    const core = coreRef.current;
    setCanUndoLastEdit(core.hasPending());
    const action = core.getLastAction();
    setLastUndoableEditLabel(action !== null ? boardEditActionLabel(action) : null);
  }, []);

  const clearEditUndoSnapshot = useCallback(() => {
    coreRef.current.clear();
    setCanUndoLastEdit(false);
    setLastUndoableEditLabel(null);
  }, []);

  const captureEditUndoSnapshot = useCallback(
    (action: BoardEditStepAction, meta?: Record<string, unknown>) => {
      if (options.isRuntimeRunning) {
        return;
      }
      const build = options.buildHydratedSnapshotRef.current;
      if (build === null) {
        return;
      }
      coreRef.current.capture(cloneHydratedBoardState(build()), action);
      syncUiFromCore();
      logBoardEditStep(options.showInfoLogsRef.current ?? false, 'capture', action, meta);
    },
    [options.buildHydratedSnapshotRef, options.isRuntimeRunning, options.showInfoLogsRef, syncUiFromCore],
  );

  const undoLastEdit = useCallback((): boolean => {
    const taken = coreRef.current.takeForRestore();
    if (taken === null) {
      return false;
    }
    setCanUndoLastEdit(false);
    setLastUndoableEditLabel(null);
    options.skipDirtyRef.current = true;
    options.applyHydratedStateRef.current(cloneHydratedBoardState(taken.snapshot));
    options.runValidationRef.current();
    logBoardEditStep(options.showInfoLogsRef.current ?? false, 'undo', 'undo', {
      restoredAction: taken.action,
      restoredLabel: taken.action !== null ? boardEditActionLabel(taken.action) : null,
    });
    options.recalcDirtyAfterSkip();
    return true;
  }, [
    options.applyHydratedStateRef,
    options.recalcDirtyAfterSkip,
    options.runValidationRef,
    options.showInfoLogsRef,
    options.skipDirtyRef,
  ]);

  const forgetPendingEditUndo = useCallback(
    (reason: string) => {
      if (!coreRef.current.hasPending()) {
        return;
      }
      clearEditUndoSnapshot();
      logBoardEditStep(options.showInfoLogsRef.current ?? false, 'clear', 'undo', { reason });
    },
    [clearEditUndoSnapshot, options.showInfoLogsRef],
  );

  return {
    canUndoLastEdit,
    lastUndoableEditLabel,
    clearEditUndoSnapshot,
    captureEditUndoSnapshot,
    undoLastEdit,
    forgetPendingEditUndo,
  };
}
