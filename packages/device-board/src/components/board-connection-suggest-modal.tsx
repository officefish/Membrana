import React from 'react';

import type { PaletteConnectionSuggestion } from '../graph/connection-suggest.js';

export interface BoardConnectionSuggestModalProps {
  readonly open: boolean;
  readonly suggestions: readonly PaletteConnectionSuggestion[];
  readonly onPick: (suggestion: PaletteConnectionSuggestion) => void;
  readonly onDismiss: () => void;
}

/**
 * Модал выбора узла палитры при отпускании ребра над рабочим полем.
 */
export const BoardConnectionSuggestModal: React.FC<BoardConnectionSuggestModalProps> = ({
  open,
  suggestions,
  onPick,
  onDismiss,
}) => {
  if (!open) {
    return null;
  }

  return (
    <dialog className="modal modal-open" open aria-labelledby="board-connection-suggest-title">
      <div className="modal-box max-w-sm">
        <h3 id="board-connection-suggest-title" className="text-sm font-semibold text-base-content">
          Добавить узел
        </h3>
        <p className="mt-1 text-xs text-base-content/60">
          Совместимые узлы по схеме портов источника:
        </p>
        {suggestions.length === 0 ? (
          <p className="mt-3 text-xs text-base-content/50">Нет совместимых узлов для этого порта.</p>
        ) : (
          <ul className="menu menu-sm mt-3 rounded-md border border-base-300 bg-base-200/40 p-1">
            {suggestions.map((item) => (
              <li key={`${item.nodeKind}-${item.targetHandle}`}>
                <button
                  type="button"
                  className="justify-start font-mono text-xs"
                  onClick={() => onPick(item)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="modal-action">
          <button type="button" className="btn btn-sm" onClick={onDismiss}>
            Отмена
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" aria-label="Закрыть" onClick={onDismiss}>
          close
        </button>
      </form>
    </dialog>
  );
};
