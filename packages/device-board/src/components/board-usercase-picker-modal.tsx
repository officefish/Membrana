import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReferenceVariableSlot } from '../graph/export-branch-scenario.js';
import type { UserCasePickerCard } from '../types/user-case-picker.js';
import { BoardReferenceMappingModal } from './board-reference-mapping-modal.js';
import { UserCaseCardView } from './user-case-card-view.js';
import { useDeviceBoardGraph } from '../context/device-board-graph-context.js';

/** Stable ids for aria-labelledby / aria-describedby (NB3 a11y). */
export const BOARD_USERCASE_PICKER_A11Y = {
  titleId: 'board-usercase-picker-title',
  descId: 'board-usercase-picker-desc',
  dirtyTitleId: 'board-usercase-dirty-title',
  dirtyDescId: 'board-usercase-dirty-desc',
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

export interface BoardUserCasePickerModalProps {
  readonly open: boolean;
  readonly cards: readonly UserCasePickerCard[];
  readonly onDismiss: () => void;
  readonly onApplied?: (userCaseId: string) => void;
}

/** Modal picker UserCase + dirty confirm + ref-mapping (U9 P1). */
export const BoardUserCasePickerModal: React.FC<BoardUserCasePickerModalProps> = ({
  open,
  cards,
  onDismiss,
  onApplied,
}) => {
  const graph = useDeviceBoardGraph();
  const mainDialogRef = useRef<HTMLDialogElement>(null);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDirtyOpen, setConfirmDirtyOpen] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [refMapping, setRefMapping] = useState<{
    readonly userCaseId: string;
    readonly title: string;
    readonly slots: readonly ReferenceVariableSlot[];
    readonly mapping: Record<string, string>;
  } | null>(null);

  const handleMainEscape = useCallback((): void => {
    if (confirmDirtyOpen) {
      setConfirmDirtyOpen(false);
      return;
    }
    onDismiss();
  }, [confirmDirtyOpen, onDismiss]);

  const handleConfirmEscape = useCallback((): void => {
    setConfirmDirtyOpen(false);
  }, []);

  useDialogA11y(open && !confirmDirtyOpen, mainDialogRef, handleMainEscape);
  useDialogA11y(confirmDirtyOpen, confirmDialogRef, handleConfirmEscape);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setConfirmDirtyOpen(false);
      setApplyError(null);
      setRefMapping(null);
      return;
    }
    const firstApplicable = cards.find((card) => card.canApply);
    setSelectedId(firstApplicable?.id ?? cards[0]?.id ?? null);
  }, [open, cards]);

  if (!open) {
    return null;
  }

  const selected = cards.find((card) => card.id === selectedId) ?? null;

  const runApply = (mapping?: Readonly<Record<string, string>>): void => {
    if (selectedId === null) {
      return;
    }
    setApplyError(null);
    const error = graph.applyUserCase(selectedId, mapping);
    if (error === null) {
      setRefMapping(null);
      setConfirmDirtyOpen(false);
      onApplied?.(selectedId);
      onDismiss();
      return;
    }
    if (typeof error === 'object' && error !== null && error.kind === 'needs-mapping') {
      setRefMapping({
        userCaseId: selectedId,
        title: selected?.title ?? error.title,
        slots: error.slots,
        mapping: { ...error.mapping },
      });
      return;
    }
    setApplyError(typeof error === 'string' ? error : 'Не удалось применить UserCase');
  };

  const handleApplyClick = (): void => {
    if (selectedId === null || selected === null || !selected.canApply) {
      return;
    }
    if (graph.isDirty) {
      setConfirmDirtyOpen(true);
      return;
    }
    runApply();
  };

  return (
    <>
      <dialog
        ref={mainDialogRef}
        className="modal modal-open"
        open
        aria-labelledby={BOARD_USERCASE_PICKER_A11Y.titleId}
        aria-describedby={BOARD_USERCASE_PICKER_A11Y.descId}
        aria-modal="true"
      >
        <div className="modal-box max-w-lg">
          <h3
            id={BOARD_USERCASE_PICKER_A11Y.titleId}
            className="text-sm font-semibold text-base-content"
          >
            Загрузить UserCase
          </h3>
          <p id={BOARD_USERCASE_PICKER_A11Y.descId} className="mt-1 text-xs text-base-content/60">
            Готовый сценарий device-board. Signal-слой не изменится — заменяются только ветки
            сценария.
          </p>

          <ul
            className="mt-4 max-h-64 space-y-2 overflow-y-auto"
            role="radiogroup"
            aria-label="Доступные UserCase"
          >
            {cards.map((card) => (
              <li key={card.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 ${
                    card.canApply
                      ? 'border-base-300 bg-base-100 hover:border-primary/40'
                      : 'border-base-300/60 bg-base-200/40 opacity-60 cursor-not-allowed'
                  } ${selectedId === card.id ? 'ring-2 ring-primary/30' : ''}`}
                >
                  <input
                    type="radio"
                    name="usercase-picker"
                    className="radio radio-primary radio-sm mt-1"
                    checked={selectedId === card.id}
                    disabled={!card.canApply}
                    onChange={() => setSelectedId(card.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <UserCaseCardView card={card} />
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {applyError !== null ? (
            <p className="mt-3 text-xs text-error" role="alert">
              {applyError}
            </p>
          ) : null}

          <div className="modal-action">
            <button type="button" className="btn btn-sm" onClick={onDismiss}>
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-error btn-sm"
              disabled={selected === null || !selected.canApply}
              onClick={handleApplyClick}
            >
              Применить сценарий
            </button>
          </div>
        </div>
        <button
          type="button"
          className="modal-backdrop bg-base-300/50"
          aria-label="Закрыть выбор UserCase"
          onClick={onDismiss}
        />
      </dialog>

      {confirmDirtyOpen ? (
        <dialog
          ref={confirmDialogRef}
          className="modal modal-open"
          open
          aria-labelledby={BOARD_USERCASE_PICKER_A11Y.dirtyTitleId}
          aria-describedby={BOARD_USERCASE_PICKER_A11Y.dirtyDescId}
          aria-modal="true"
        >
          <div className="modal-box max-w-md">
            <h3
              id={BOARD_USERCASE_PICKER_A11Y.dirtyTitleId}
              className="text-sm font-semibold text-base-content"
            >
              Заменить текущий сценарий?
            </h3>
            <p
              id={BOARD_USERCASE_PICKER_A11Y.dirtyDescId}
              className="mt-2 text-xs text-base-content/65 leading-relaxed"
            >
              Несохранённые изменения будут потеряны. Signal-слой останется без изменений.
            </p>
            <div className="modal-action">
              <button type="button" className="btn btn-sm" onClick={() => setConfirmDirtyOpen(false)}>
                Отмена
              </button>
              <button type="button" className="btn btn-error btn-sm" onClick={() => runApply()}>
                Заменить сценарий
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop bg-base-300/50"
            aria-label="Отменить замену сценария"
            onClick={() => setConfirmDirtyOpen(false)}
          />
        </dialog>
      ) : null}

      <BoardReferenceMappingModal
        open={refMapping !== null}
        title={`UserCase «${refMapping?.title ?? ''}»`}
        description="Сопоставьте ссылочные переменные UserCase с переменными вашего сценария."
        slots={refMapping?.slots ?? []}
        variables={graph.variables}
        initialMapping={refMapping?.mapping ?? {}}
        confirmLabel="Применить UserCase"
        onDismiss={() => setRefMapping(null)}
        onConfirm={(mapping) => runApply(mapping)}
      />
    </>
  );
};
