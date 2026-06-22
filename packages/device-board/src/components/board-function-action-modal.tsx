import React from 'react';

import { BRANCH_TAB_LABEL, type ScenarioBranchTab } from '../types/board-ui.js';

export interface BoardFunctionActionModalProps {
  readonly open: boolean;
  readonly functionName: string;
  readonly activeBranch: ScenarioBranchTab;
  readonly insertDisabled: boolean;
  readonly insertDisabledReason?: string;
  readonly onEditFunction: () => void;
  readonly onInsertIntoScenario: () => void;
  readonly onDismiss: () => void;
}

/**
 * Клик по функции в левом сайдбаре на ветке сценария: редактировать или вставить subgraph-блок.
 */
export const BoardFunctionActionModal: React.FC<BoardFunctionActionModalProps> = ({
  open,
  functionName,
  activeBranch,
  insertDisabled,
  insertDisabledReason,
  onEditFunction,
  onInsertIntoScenario,
  onDismiss,
}) => {
  if (!open) {
    return null;
  }

  const branchLabel = BRANCH_TAB_LABEL[activeBranch];

  return (
    <dialog
      className="modal modal-open"
      open
      aria-labelledby="board-function-action-title"
      aria-modal="true"
    >
      <div className="modal-box w-[min(100%,24rem)] max-w-none p-4">
        <h3 id="board-function-action-title" className="text-sm font-semibold text-base-content">
          Функция «{functionName}»
        </h3>
        <p className="mt-1 text-xs text-base-content/60">
          Активная ветка: <span className="font-medium text-base-content">{branchLabel}</span>
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm h-10 min-h-10 w-full justify-start"
            onClick={onEditFunction}
          >
            Редактировать функцию
            <span className="ml-auto text-[10px] font-normal opacity-70">открыть тело функции</span>
          </button>
          <button
            type="button"
            className="btn btn-sm h-10 min-h-10 w-full justify-start"
            disabled={insertDisabled}
            title={insertDisabled ? insertDisabledReason : 'Добавить subgraph-блок на текущую ветку'}
            onClick={onInsertIntoScenario}
          >
            Вставить в сценарий
            <span className="ml-auto text-[10px] font-normal opacity-70">subgraph на ветке</span>
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-base-content/55">
          Exec-связи после вставки проводите вручную. Повторная вставка той же функции на ветку
          запрещена.
        </p>

        <div className="modal-action mt-2">
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
