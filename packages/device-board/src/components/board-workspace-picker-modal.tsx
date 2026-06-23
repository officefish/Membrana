import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useDeviceBoardGraph } from '../context/device-board-graph-context.js';

export const BOARD_WORKSPACE_PICKER_A11Y = {
  titleId: 'board-workspace-picker-title',
  descId: 'board-workspace-picker-desc',
  dirtyTitleId: 'board-workspace-dirty-title',
  dirtyDescId: 'board-workspace-dirty-desc',
} as const;

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function useDialogA11y(
  open: boolean,
  dialogRef: React.RefObject<HTMLDialogElement>,
  onEscape: () => void,
): void {
  useEffect(() => {
    if (!open) {
      return;
    }
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const getFocusables = (): HTMLElement[] =>
      [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
        (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
      );

    const focusTimer = window.setTimeout(() => {
      getFocusables()[0]?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const focusables = getFocusables();
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      dialog.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onEscape, dialogRef]);
}

export interface BoardWorkspacePickerModalProps {
  readonly open: boolean;
  readonly onDismiss: () => void;
  readonly onSwitched?: (workspaceId: string) => void;
}

/** Modal picker user workspace: switch / create / rename / delete (U10 W2). */
export const BoardWorkspacePickerModal: React.FC<BoardWorkspacePickerModalProps> = ({
  open,
  onDismiss,
  onSwitched,
}) => {
  const graph = useDeviceBoardGraph();
  const mainDialogRef = useRef<HTMLDialogElement>(null);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null);
  const [confirmDirtyOpen, setConfirmDirtyOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [newTitleDraft, setNewTitleDraft] = useState('');

  const handleMainEscape = useCallback((): void => {
    if (confirmDirtyOpen) {
      setConfirmDirtyOpen(false);
      setPendingSwitchId(null);
      return;
    }
    onDismiss();
  }, [confirmDirtyOpen, onDismiss]);

  const handleConfirmEscape = useCallback((): void => {
    setConfirmDirtyOpen(false);
    setPendingSwitchId(null);
  }, []);

  useDialogA11y(open && !confirmDirtyOpen, mainDialogRef, handleMainEscape);
  useDialogA11y(confirmDirtyOpen, confirmDialogRef, handleConfirmEscape);

  useEffect(() => {
    if (!open) {
      setPendingSwitchId(null);
      setConfirmDirtyOpen(false);
      setActionError(null);
      setRenameId(null);
      setRenameDraft('');
      setNewTitleDraft('');
      return;
    }
    void graph.refreshWorkspaces();
  }, [graph, open]);

  if (!open || !graph.workspaceEnabled) {
    return null;
  }

  const atQuota = graph.workspaceList.length >= graph.maxUserWorkspaces;

  const runSwitch = async (workspaceId: string): Promise<void> => {
    setActionError(null);
    const error = await graph.switchWorkspace(workspaceId);
    if (error !== null) {
      setActionError(error);
      return;
    }
    setConfirmDirtyOpen(false);
    setPendingSwitchId(null);
    onSwitched?.(workspaceId);
    onDismiss();
  };

  const requestSwitch = (workspaceId: string): void => {
    if (workspaceId === graph.activeWorkspaceId) {
      onDismiss();
      return;
    }
    if (graph.isDirty) {
      setPendingSwitchId(workspaceId);
      setConfirmDirtyOpen(true);
      return;
    }
    void runSwitch(workspaceId);
  };

  const handleCreate = async (): Promise<void> => {
    setActionError(null);
    const error = await graph.createEmptyWorkspace(newTitleDraft);
    if (error !== null) {
      setActionError(error);
      return;
    }
    setNewTitleDraft('');
    onDismiss();
  };

  const handleRename = async (): Promise<void> => {
    if (renameId === null) {
      return;
    }
    setActionError(null);
    const error = await graph.renameWorkspace(renameId, renameDraft);
    if (error !== null) {
      setActionError(error);
      return;
    }
    setRenameId(null);
    setRenameDraft('');
  };

  const handleDelete = async (workspaceId: string): Promise<void> => {
    setActionError(null);
    const error = await graph.deleteWorkspace(workspaceId);
    if (error !== null) {
      setActionError(error);
      return;
    }
    if (graph.workspaceList.length === 0) {
      onDismiss();
    }
  };

  return (
    <>
      <dialog
        ref={mainDialogRef}
        className="modal modal-open"
        open
        aria-labelledby={BOARD_WORKSPACE_PICKER_A11Y.titleId}
        aria-describedby={BOARD_WORKSPACE_PICKER_A11Y.descId}
        aria-modal="true"
      >
        <div className="modal-box max-w-lg">
          <h3
            id={BOARD_WORKSPACE_PICKER_A11Y.titleId}
            className="text-sm font-semibold text-base-content"
          >
            Мои сценарии
          </h3>
          <p id={BOARD_WORKSPACE_PICKER_A11Y.descId} className="mt-1 text-xs text-base-content/60">
            До {graph.maxUserWorkspaces} редактируемых копий на free. Сейчас{' '}
            <span className="font-medium text-base-content">
              {graph.workspaceList.length}/{graph.maxUserWorkspaces}
            </span>
            .
          </p>

          {actionError !== null ? (
            <p className="mt-2 text-xs text-error" role="alert">
              {actionError}
            </p>
          ) : null}

          <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
            {graph.workspaceList.length === 0 ? (
              <li className="rounded-lg border border-dashed border-base-300 px-3 py-4 text-xs text-base-content/55">
                Пока нет сохранённых сценариев. Создайте пустой или клонируйте UserCase (скоро).
              </li>
            ) : (
              graph.workspaceList.map((item) => {
                const isActive = item.workspaceId === graph.activeWorkspaceId;
                const isRenaming = renameId === item.workspaceId;
                return (
                  <li
                    key={item.workspaceId}
                    className={`rounded-lg border px-3 py-2 ${
                      isActive ? 'border-primary bg-primary/5' : 'border-base-300'
                    }`}
                  >
                    {isRenaming ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          className="input input-bordered input-xs w-full"
                          value={renameDraft}
                          onChange={(event) => setRenameDraft(event.target.value)}
                          aria-label="Новое название сценария"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => void handleRename()}
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => {
                              setRenameId(null);
                              setRenameDraft('');
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => requestSwitch(item.workspaceId)}
                        >
                          <span className="block truncate text-sm font-medium text-base-content">
                            {item.title}
                            {isActive ? (
                              <span className="ml-2 badge badge-primary badge-xs">активный</span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-base-content/50">
                            {new Date(item.updatedAt).toLocaleString()}
                          </span>
                        </button>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            aria-label={`Переименовать «${item.title}»`}
                            onClick={() => {
                              setRenameId(item.workspaceId);
                              setRenameDraft(item.title);
                            }}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-error"
                            aria-label={`Удалить «${item.title}»`}
                            onClick={() => void handleDelete(item.workspaceId)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          <div className="mt-4 rounded-lg border border-base-300 bg-base-200/40 p-3">
            <p className="text-xs font-medium text-base-content/70">Создать пустой</p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                className="input input-bordered input-sm min-w-0 flex-1"
                placeholder={`Сценарий ${graph.workspaceList.length + 1}`}
                value={newTitleDraft}
                disabled={atQuota}
                onChange={(event) => setNewTitleDraft(event.target.value)}
                aria-label="Название нового сценария"
              />
              <button
                type="button"
                className="btn btn-primary btn-sm shrink-0"
                disabled={atQuota}
                title={atQuota ? `Лимит ${graph.maxUserWorkspaces} сценария` : undefined}
                onClick={() => void handleCreate()}
              >
                Создать
              </button>
            </div>
            {atQuota ? (
              <p className="mt-2 text-[10px] text-warning">
                Достигнут лимит {graph.maxUserWorkspaces}/{graph.maxUserWorkspaces}. Удалите слот, чтобы
                создать новый.
              </p>
            ) : null}
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-sm" onClick={onDismiss}>
              Закрыть
            </button>
          </div>
        </div>
        <button
          type="button"
          className="modal-backdrop bg-base-300/50"
          aria-label="Закрыть мои сценарии"
          onClick={onDismiss}
        />
      </dialog>

      {confirmDirtyOpen && pendingSwitchId !== null ? (
        <dialog
          ref={confirmDialogRef}
          className="modal modal-open"
          open
          aria-labelledby={BOARD_WORKSPACE_PICKER_A11Y.dirtyTitleId}
          aria-describedby={BOARD_WORKSPACE_PICKER_A11Y.dirtyDescId}
          aria-modal="true"
        >
          <div className="modal-box max-w-md">
            <h3
              id={BOARD_WORKSPACE_PICKER_A11Y.dirtyTitleId}
              className="text-sm font-semibold text-base-content"
            >
              Переключить сценарий?
            </h3>
            <p
              id={BOARD_WORKSPACE_PICKER_A11Y.dirtyDescId}
              className="mt-2 text-xs text-base-content/65 leading-relaxed"
            >
              Несохранённые изменения текущего сценария будут потеряны.
            </p>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setConfirmDirtyOpen(false);
                  setPendingSwitchId(null);
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-error btn-sm"
                onClick={() => void runSwitch(pendingSwitchId)}
              >
                Переключить
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop bg-base-300/50"
            aria-label="Отменить переключение"
            onClick={() => {
              setConfirmDirtyOpen(false);
              setPendingSwitchId(null);
            }}
          />
        </dialog>
      ) : null}
    </>
  );
};
