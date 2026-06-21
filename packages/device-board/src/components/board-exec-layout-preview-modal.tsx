import React from 'react';

export interface BoardExecLayoutPreviewModalProps {
  readonly open: boolean;
  readonly branchLabel: string;
  readonly movedNodeCount: number;
  readonly onApply: () => void;
  readonly onDismiss: () => void;
}

/**
 * Preview перед apply branch exec layout (NAA L2, D-LAYOUT-UNDO).
 * Ghost-ноды на канвасе; modal — Apply / Отмена.
 */
export const BoardExecLayoutPreviewModal: React.FC<BoardExecLayoutPreviewModalProps> = ({
  open,
  branchLabel,
  movedNodeCount,
  onApply,
  onDismiss,
}) => {
  if (!open) {
    return null;
  }

  return (
    <dialog
      className="modal modal-open"
      open
      aria-labelledby="board-exec-layout-preview-title"
      aria-modal="true"
    >
      <div className="modal-box w-[min(100%,22rem)] max-w-none p-4">
        <h3 id="board-exec-layout-preview-title" className="text-sm font-semibold text-base-content">
          Preview: exec-цепочка
        </h3>
        <p className="mt-2 text-xs text-base-content/70">
          Ветка <span className="font-medium text-base-content">{branchLabel}</span> · layered layout
          слева направо от entry.
        </p>
        <p className="mt-1 text-xs text-base-content/60">
          Переместится узлов:{' '}
          <span className="font-medium text-base-content">{movedNodeCount}</span>. Пунктир на канвасе —
          целевые позиции.
        </p>

        <div className="modal-action mt-4">
          <button type="button" className="btn btn-ghost btn-sm h-9 min-h-9" onClick={onDismiss}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm h-9 min-h-9"
            disabled={movedNodeCount === 0}
            onClick={onApply}
          >
            Применить
          </button>
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop bg-base-300/50"
        aria-label="Закрыть preview"
        onClick={onDismiss}
      />
    </dialog>
  );
};
