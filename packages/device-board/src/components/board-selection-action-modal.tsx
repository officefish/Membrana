import React from 'react';

import type { BoardAlignMode } from '../graph/align-nodes.js';
import {
  BOARD_ALIGN_MODE_LABELS,
  BOARD_ALIGN_MODES_BASIC,
  BOARD_ALIGN_MODES_DISTRIBUTE,
  isBoardAlignModeEnabled,
} from '../graph/align-nodes.js';

export interface BoardSelectionActionModalProps {
  readonly open: boolean;
  readonly selectedCount: number;
  readonly collapseFunctionDisabled: boolean;
  readonly collapseGroupDisabled: boolean;
  readonly collapseFunctionDisabledReason?: string;
  readonly collapseGroupDisabledReason?: string;
  readonly execChainLayoutDisabled: boolean;
  readonly onCollapseToFunction: () => void;
  readonly onCollapseToGroup: () => void;
  readonly onAlignMode: (mode: BoardAlignMode) => void;
  readonly onSmartAlign: () => void;
  readonly onExecChainLayout: () => void;
  readonly onDismiss: () => void;
}

/**
 * Действия над marquee-выделением (CGF R0 / A0 / NAA L1): function / group / align tiers / cancel.
 */
export const BoardSelectionActionModal: React.FC<BoardSelectionActionModalProps> = ({
  open,
  selectedCount,
  collapseFunctionDisabled,
  collapseGroupDisabled,
  collapseFunctionDisabledReason,
  collapseGroupDisabledReason,
  execChainLayoutDisabled,
  onCollapseToFunction,
  onCollapseToGroup,
  onAlignMode,
  onSmartAlign,
  onExecChainLayout,
  onDismiss,
}) => {
  if (!open) {
    return null;
  }

  const alignDisabled = selectedCount < 2;

  return (
    <dialog
      className="modal modal-open"
      open
      aria-labelledby="board-selection-action-title"
      aria-modal="true"
    >
      <div className="modal-box w-[min(100%,22rem)] max-w-none overflow-visible p-4">
        <h3 id="board-selection-action-title" className="text-sm font-semibold text-base-content">
          Выделение на канвасе
        </h3>
        <p className="mt-1 text-xs text-base-content/60">
          Выбрано узлов: <span className="font-medium text-base-content">{selectedCount}</span>
        </p>

        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm h-9 min-h-9 w-full justify-start"
            disabled={collapseFunctionDisabled}
            title={collapseFunctionDisabledReason ?? (collapseFunctionDisabled ? 'Нужно ≥2 узлов без системных' : undefined)}
            onClick={onCollapseToFunction}
          >
            Объединить в функцию
          </button>
          <button
            type="button"
            className="btn btn-sm h-9 min-h-9 w-full justify-start"
            disabled={collapseGroupDisabled}
            title={collapseGroupDisabledReason ?? (collapseGroupDisabled ? 'Нужно ≥2 узлов без системных' : undefined)}
            onClick={onCollapseToGroup}
          >
            Объединить в группу
          </button>

          <div
            className={`rounded-lg border border-base-300 p-2 ${alignDisabled ? 'opacity-50' : ''}`}
            aria-label="Выровнять"
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
              Выровнять
            </p>
            <div className="grid grid-cols-2 gap-1">
              {BOARD_ALIGN_MODES_BASIC.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className="btn btn-ghost btn-xs h-8 min-h-8 justify-start px-2 font-normal"
                  disabled={!isBoardAlignModeEnabled(mode, selectedCount)}
                  title={BOARD_ALIGN_MODE_LABELS[mode]}
                  onClick={() => onAlignMode(mode)}
                >
                  {BOARD_ALIGN_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {BOARD_ALIGN_MODES_DISTRIBUTE.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className="btn btn-ghost btn-xs h-8 min-h-8 justify-start px-2 font-normal"
                  disabled={!isBoardAlignModeEnabled(mode, selectedCount)}
                  title={
                    selectedCount < 3
                      ? `${BOARD_ALIGN_MODE_LABELS[mode]} (нужно ≥3 узла)`
                      : BOARD_ALIGN_MODE_LABELS[mode]
                  }
                  onClick={() => onAlignMode(mode)}
                >
                  {BOARD_ALIGN_MODE_LABELS[mode]}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-2 border-t border-base-300/80 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
                Быстрое (selection)
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-xs h-8 min-h-8 w-full justify-start gap-2 px-2 font-normal"
                disabled={alignDisabled}
                title="Автовыравнивание по композиции selection bbox · сетка 8 px"
                onClick={onSmartAlign}
              >
                <span className="badge badge-ghost badge-xs shrink-0">bbox</span>
                Авто · сетка 8 px
              </button>

              <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
                Exec-цепочка (Blueprint)
              </p>
              <button
                type="button"
                className="btn btn-outline btn-primary btn-xs h-9 min-h-9 w-full justify-start gap-2 px-2"
                disabled={execChainLayoutDisabled}
                title={
                  execChainLayoutDisabled
                    ? 'Нужно ≥2 узлов, связанных exec-рёбрами в selection'
                    : 'Layered layout слева направо по exec-рёбрам (dagre LR)'
                }
                onClick={onExecChainLayout}
              >
                <span className="badge badge-primary badge-outline badge-xs shrink-0">exec · LR</span>
                Упорядочить exec-цепочку
              </button>
            </div>
          </div>
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
