import React, { useEffect, useMemo, useState } from 'react';
import type { ScenarioVariable } from '@membrana/core';

import { referenceTypeLabel } from '../graph/index.js';
import type { ReferenceVariableSlot } from '../graph/export-branch-scenario.js';

export interface BoardReferenceMappingModalProps {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly slots: readonly ReferenceVariableSlot[];
  readonly variables: readonly ScenarioVariable[];
  readonly initialMapping: Readonly<Record<string, string>>;
  readonly confirmLabel?: string;
  readonly onConfirm: (mapping: Readonly<Record<string, string>>) => void;
  readonly onDismiss: () => void;
}

/** Модал сопоставления ссылочных переменных (branch import + UserCase apply). */
export const BoardReferenceMappingModal: React.FC<BoardReferenceMappingModalProps> = ({
  open,
  title,
  description,
  slots,
  variables,
  initialMapping,
  confirmLabel = 'Применить',
  onConfirm,
  onDismiss,
}) => {
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setDraft({});
      return;
    }
    setDraft({ ...initialMapping });
  }, [open, initialMapping]);

  const optionsByType = useMemo(() => {
    const map = new Map<string, ScenarioVariable[]>();
    for (const variable of variables) {
      const list = map.get(variable.type) ?? [];
      list.push(variable);
      map.set(variable.type, list);
    }
    return map;
  }, [variables]);

  if (!open) {
    return null;
  }

  const canConfirm = slots.every((slot) => {
    const localId = draft[slot.exportVariableId];
    return typeof localId === 'string' && localId.length > 0;
  });

  return (
    <dialog className="modal modal-open" open aria-labelledby="board-reference-mapping-title">
      <div className="modal-box max-w-lg">
        <h3 id="board-reference-mapping-title" className="text-sm font-semibold text-base-content">
          {title}
        </h3>
        <p className="mt-1 text-xs text-base-content/60">{description}</p>
        <ul className="mt-4 flex flex-col gap-3">
          {slots.map((slot) => {
            const candidates = optionsByType.get(slot.type) ?? [];
            return (
              <li key={slot.exportVariableId} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-base-content/70">
                  {slot.nameHint}{' '}
                  <span className="font-normal text-base-content/50">
                    ({referenceTypeLabel(slot.type)})
                  </span>
                </span>
                <select
                  className="select select-bordered select-sm w-full font-mono text-xs"
                  value={draft[slot.exportVariableId] ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [slot.exportVariableId]: event.target.value,
                    }))
                  }
                >
                  <option value="">— выберите переменную —</option>
                  {candidates.map((variable) => (
                    <option key={variable.id} value={variable.id}>
                      {variable.name}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
        <div className="modal-action">
          <button type="button" className="btn btn-sm" onClick={onDismiss}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!canConfirm}
            onClick={() => onConfirm(draft)}
          >
            {confirmLabel}
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
