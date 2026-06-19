import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ScenarioVariable, ScenarioVariableType } from '@membrana/core';

import { referenceTypeLabel, type VariableNodeKind } from '../graph/index.js';
import { variableTypeIndicatorClass } from '../graph/variable-type-indicator.js';
import { VARIABLE_CONSTRUCTOR_CATEGORIES } from '../types/variable-constructor-palette.js';

const PencilIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
    <path d="m2.695 14.762-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
    <path
      fillRule="evenodd"
      d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 9.24A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-9.24.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
      clipRule="evenodd"
    />
  </svg>
);

interface BoardModalProps {
  readonly open: boolean;
  readonly titleId: string;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}

/** Портал-модалка без DaisyUI `modal-open` — не сдвигает layout при появлении скроллбара. */
const BoardModal: React.FC<BoardModalProps> = ({ open, titleId, onClose, children }) => {
  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-box border border-base-300 bg-base-100 p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};

export interface AddVariableModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onPickType: (type: ScenarioVariableType) => void;
}

/** Модалка выбора типа новой переменной по категориям. */
export const AddVariableModal: React.FC<AddVariableModalProps> = ({ open, onClose, onPickType }) => {
  const titleId = useId();
  return (
    <BoardModal open={open} titleId={titleId} onClose={onClose}>
      <h3 id={titleId} className="text-lg font-bold">
        Новая переменная
      </h3>
      <p className="mt-1 text-sm text-base-content/60">Выберите тип переменной</p>
      <div className="mt-4 flex flex-col gap-4">
        {VARIABLE_CONSTRUCTOR_CATEGORIES.map((category) => (
          <div key={category.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
              {category.title}
            </p>
            <ul className="menu menu-sm rounded-lg border border-base-300 bg-base-100 p-1">
              {category.types.map((type) => (
                <li key={type}>
                  <button
                    type="button"
                    className="flex items-center gap-2"
                    onClick={() => {
                      onPickType(type);
                      onClose();
                    }}
                  >
                    <span
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${variableTypeIndicatorClass(type)}`}
                      aria-hidden
                    />
                    <span>{referenceTypeLabel(type)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Отмена
        </button>
      </div>
    </BoardModal>
  );
};

export interface VariableNodeKindModalProps {
  readonly variable: ScenarioVariable | null;
  readonly disabled: boolean;
  readonly onClose: () => void;
  readonly onPickKind: (kind: VariableNodeKind, variableId: string) => void;
}

/** Модалка выбора getter / setter для переменной. */
export const VariableNodeKindModal: React.FC<VariableNodeKindModalProps> = ({
  variable,
  disabled,
  onClose,
  onPickKind,
}) => {
  const titleId = useId();
  if (variable === null) {
    return null;
  }
  return (
    <BoardModal open titleId={titleId} onClose={onClose}>
      <h3 id={titleId} className="text-lg font-bold">
        {variable.name}
      </h3>
      <p className="mt-1 text-sm text-base-content/60">
        Тип: {referenceTypeLabel(variable.type)} — добавить узел на канвас
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          className="btn btn-outline justify-start"
          disabled={disabled}
          onClick={() => {
            onPickKind('variable-get', variable.id);
            onClose();
          }}
        >
          Getter — чтение переменной
        </button>
        <button
          type="button"
          className="btn btn-outline justify-start"
          disabled={disabled}
          onClick={() => {
            onPickKind('variable-set', variable.id);
            onClose();
          }}
        >
          Setter — запись в переменную
        </button>
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Отмена
        </button>
      </div>
    </BoardModal>
  );
};

export interface RenameVariableModalProps {
  readonly variable: ScenarioVariable | null;
  readonly onClose: () => void;
  readonly onRename: (id: string, name: string) => void;
}

/** Модалка переименования переменной. */
export const RenameVariableModal: React.FC<RenameVariableModalProps> = ({ variable, onClose, onRename }) => {
  const titleId = useId();
  const inputId = useId();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (variable !== null) {
      setDraft(variable.name);
    }
  }, [variable]);

  if (variable === null) {
    return null;
  }

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== '' && trimmed !== variable.name) {
      onRename(variable.id, trimmed);
    }
    onClose();
  };

  return (
    <BoardModal open titleId={titleId} onClose={onClose}>
      <h3 id={titleId} className="text-lg font-bold">
        Переименовать переменную
      </h3>
      <label className="form-control mt-4 w-full" htmlFor={inputId}>
        <span className="label-text text-xs text-base-content/60">Имя</span>
        <input
          id={inputId}
          type="text"
          className="input input-bordered input-sm w-full font-mono"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Отмена
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={commit}>
          Сохранить
        </button>
      </div>
    </BoardModal>
  );
};

export interface DeleteVariableModalProps {
  readonly variable: ScenarioVariable | null;
  readonly onClose: () => void;
  readonly onConfirm: (id: string) => void;
}

/** Модалка подтверждения удаления переменной. */
export const DeleteVariableModal: React.FC<DeleteVariableModalProps> = ({
  variable,
  onClose,
  onConfirm,
}) => {
  const titleId = useId();
  if (variable === null) {
    return null;
  }

  return (
    <BoardModal open titleId={titleId} onClose={onClose}>
      <h3 id={titleId} className="text-lg font-bold">
        Удалить переменную?
      </h3>
      <p className="mt-2 text-sm text-base-content/70">
        Переменная <span className="font-mono font-semibold">{variable.name}</span> и все связанные узлы
        get/set на всех ветках будут удалены. Это действие нельзя отменить.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Отмена
        </button>
        <button
          type="button"
          className="btn btn-error btn-sm"
          onClick={() => {
            onConfirm(variable.id);
            onClose();
          }}
        >
          Удалить
        </button>
      </div>
    </BoardModal>
  );
};

export { PencilIcon, TrashIcon };
