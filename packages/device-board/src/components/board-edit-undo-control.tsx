import React from 'react';

const UndoIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-5 w-5"
    aria-hidden
  >
    <path
      fillRule="evenodd"
      d="M7.793 2.232a.75.75 0 0 1-.128 1.287L5.39 4.5h8.61a5.5 5.5 0 0 1 0 11h-6a.75.75 0 0 1 0-1.5h6a4 4 0 0 0 0-8H5.39l2.275 1.98a.75.75 0 1 1-.992 1.124l-4-3.464a.75.75 0 0 1 0-1.124l4-3.464a.75.75 0 0 1 1.128.07Z"
      clipRule="evenodd"
    />
  </svg>
);

export interface BoardEditUndoControlProps {
  readonly canUndo: boolean;
  readonly lastActionLabel: string | null;
  readonly onUndo: () => void;
  /** Жёлтая подсказка рядом с undo (например «в буфере N узлов»). */
  readonly clipboardHint?: string | null;
}

/**
 * Кнопка отката последнего шага редактирования (depth=1).
 * Размещается в видимой зоне канваса (левый нижний угол после сайдбара).
 */
export const BoardEditUndoControl: React.FC<BoardEditUndoControlProps> = ({
  canUndo,
  lastActionLabel,
  onUndo,
  clipboardHint = null,
}) => {
  const title = canUndo
    ? lastActionLabel !== null
      ? `Отменить: ${lastActionLabel} (Ctrl+Z)`
      : 'Отменить последний шаг (Ctrl+Z)'
    : 'Нет шага для отмены';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`btn btn-sm btn-square border-base-300 bg-base-100 shadow-md ${
          canUndo ? 'btn-ghost hover:btn-primary' : 'btn-disabled opacity-40'
        }`}
        disabled={!canUndo}
        onClick={onUndo}
        title={title}
        aria-label={title}
      >
        <UndoIcon />
      </button>
      {clipboardHint !== null ? (
        <span className="text-[10px] font-medium leading-tight text-warning">{clipboardHint}</span>
      ) : null}
    </div>
  );
};
