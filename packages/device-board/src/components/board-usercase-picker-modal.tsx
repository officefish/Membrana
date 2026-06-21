import React, { useEffect, useState } from 'react';
import type { ReferenceVariableSlot } from '../graph/export-branch-scenario.js';
import type { UserCasePickerCard } from '../types/user-case-picker.js';
import { BoardReferenceMappingModal } from './board-reference-mapping-modal.js';
import { useDeviceBoardGraph } from '../context/device-board-graph-context.js';

export interface BoardUserCasePickerModalProps {
  readonly open: boolean;
  readonly cards: readonly UserCasePickerCard[];
  readonly onDismiss: () => void;
  readonly onApplied?: (userCaseId: string) => void;
}

function entitlementBadgeLabel(status: UserCasePickerCard['entitlement']): string {
  switch (status) {
    case 'bundled':
      return 'Bundled';
    case 'community':
      return 'Sprint';
    case 'entitled':
      return 'Тариф ✓';
    case 'locked':
      return 'Тариф';
    default:
      return status;
  }
}

function entitlementBadgeClass(status: UserCasePickerCard['entitlement']): string {
  switch (status) {
    case 'bundled':
      return 'badge badge-primary badge-sm';
    case 'community':
      return 'badge badge-secondary badge-sm';
    case 'entitled':
      return 'badge badge-success badge-sm';
    case 'locked':
      return 'badge badge-ghost badge-sm opacity-70';
    default:
      return 'badge badge-ghost badge-sm';
  }
}

/** Modal picker UserCase + dirty confirm + ref-mapping (U9 P1). */
export const BoardUserCasePickerModal: React.FC<BoardUserCasePickerModalProps> = ({
  open,
  cards,
  onDismiss,
  onApplied,
}) => {
  const graph = useDeviceBoardGraph();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDirtyOpen, setConfirmDirtyOpen] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [refMapping, setRefMapping] = useState<{
    readonly userCaseId: string;
    readonly title: string;
    readonly slots: readonly ReferenceVariableSlot[];
    readonly mapping: Record<string, string>;
  } | null>(null);

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
      <dialog className="modal modal-open" open aria-labelledby="board-usercase-picker-title">
        <div className="modal-box max-w-lg">
          <h3 id="board-usercase-picker-title" className="text-sm font-semibold text-base-content">
            Загрузить UserCase
          </h3>
          <p className="mt-1 text-xs text-base-content/60">
            Готовый сценарий device-board. Signal-слой не изменится — заменяются только ветки
            сценария.
          </p>

          <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
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
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium truncate">{card.title}</span>
                      <span className={entitlementBadgeClass(card.entitlement)}>
                        {entitlementBadgeLabel(card.entitlement)}
                      </span>
                    </span>
                    <span className="text-xs text-base-content/55 mt-0.5 block">
                      {card.branchCount} веток · {card.functionCount} функций · {card.deviceKind}
                    </span>
                    {card.description ? (
                      <span className="text-xs text-base-content/50 mt-1 block leading-relaxed">
                        {card.description}
                      </span>
                    ) : null}
                    {card.entitlement === 'locked' ? (
                      <span className="text-xs text-warning mt-1 block">Доступно в тарифе (stub)</span>
                    ) : null}
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
        <form method="dialog" className="modal-backdrop">
          <button type="button" aria-label="Закрыть" onClick={onDismiss}>
            close
          </button>
        </form>
      </dialog>

      {confirmDirtyOpen ? (
        <dialog className="modal modal-open" open aria-labelledby="board-usercase-dirty-title">
          <div className="modal-box max-w-md">
            <h3 id="board-usercase-dirty-title" className="text-sm font-semibold text-base-content">
              Заменить текущий сценарий?
            </h3>
            <p className="mt-2 text-xs text-base-content/65 leading-relaxed">
              Несохранённые изменения будут потеряны. Signal-слой останется без изменений.
            </p>
            <div className="modal-action">
              <button type="button" className="btn btn-sm" onClick={() => setConfirmDirtyOpen(false)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-error btn-sm"
                onClick={() => runApply()}
              >
                Заменить сценарий
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" aria-label="Закрыть" onClick={() => setConfirmDirtyOpen(false)}>
              close
            </button>
          </form>
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
