import React from 'react';

export type BoardClipboardPaneModalMode = 'selection' | 'paste';

export interface BoardClipboardPaneModalProps {
  readonly open: boolean;
  readonly mode: BoardClipboardPaneModalMode;
  readonly selectedCount: number;
  readonly clipboardCount: number;
  readonly copyDisabled?: boolean;
  readonly pasteDisabled?: boolean;
  readonly deleteDisabled?: boolean;
  readonly onCopy: () => void;
  readonly onDelete: () => void;
  readonly onPaste: () => void;
  readonly onClearClipboard?: () => void;
  readonly onDismiss: () => void;
}

/**
 * Действия copy / delete / paste по ПКМ на пустое поле канваса (W0-H2).
 * Backdrop / «Отмена» — только закрытие, выделение на канвасе сохраняется.
 */
export const BoardClipboardPaneModal: React.FC<BoardClipboardPaneModalProps> = ({
  open,
  mode,
  selectedCount,
  clipboardCount,
  copyDisabled = false,
  pasteDisabled = false,
  deleteDisabled = false,
  onCopy,
  onDelete,
  onPaste,
  onClearClipboard,
  onDismiss,
}) => {
  if (!open) {
    return null;
  }

  const title =
    mode === 'selection' ? 'Выделение на канвасе' : 'Буфер обмена доски';
  const subtitle =
    mode === 'selection'
      ? clipboardCount > 0
        ? `Выбрано узлов: ${selectedCount} · в буфере: ${clipboardCount}`
        : `Выбрано узлов: ${selectedCount}`
      : `В буфере: ${clipboardCount} узлов`;

  const showPasteInSelection = mode === 'selection' && clipboardCount > 0;
  const showClearClipboard = clipboardCount > 0 && onClearClipboard !== undefined;

  const clearClipboardButton = showClearClipboard ? (
    <button
      type="button"
      className="btn btn-ghost btn-sm h-9 min-h-9 w-full justify-start text-base-content/70"
      onClick={onClearClipboard}
    >
      Очистить буфер
    </button>
  ) : null;

  return (
    <dialog
      className="modal modal-open"
      open
      aria-labelledby="board-clipboard-pane-title"
      aria-modal="true"
    >
      <div className="modal-box w-[min(100%,20rem)] max-w-none p-4">
        <h3 id="board-clipboard-pane-title" className="text-sm font-semibold text-base-content">
          {title}
        </h3>
        <p className="mt-1 text-xs text-base-content/60">{subtitle}</p>

        <div className="mt-3 flex flex-col gap-2">
          {mode === 'selection' ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm h-9 min-h-9 w-full justify-start"
                disabled={copyDisabled}
                onClick={onCopy}
              >
                Скопировать узлы (Ctrl+C)
              </button>
              {showPasteInSelection ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm h-9 min-h-9 w-full justify-start"
                  disabled={pasteDisabled}
                  onClick={onPaste}
                >
                  Вставить узлы (Ctrl+V)
                </button>
              ) : null}
              {clearClipboardButton}
              <button
                type="button"
                className="btn btn-error btn-outline btn-sm h-9 min-h-9 w-full justify-start"
                disabled={deleteDisabled}
                onClick={onDelete}
              >
                Удалить узлы
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm h-9 min-h-9 w-full justify-start"
                disabled={pasteDisabled}
                onClick={onPaste}
              >
                Вставить узлы (Ctrl+V)
              </button>
              {clearClipboardButton}
            </>
          )}
        </div>

        <div className="modal-action mt-3">
          <button type="button" className="btn btn-ghost btn-sm h-9 min-h-9" onClick={onDismiss}>
            Отмена
          </button>
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop bg-base-300/40"
        aria-label="Закрыть"
        onClick={onDismiss}
      />
    </dialog>
  );
};
