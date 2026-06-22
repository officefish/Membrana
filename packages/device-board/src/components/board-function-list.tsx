import React from 'react';

import type { ScenarioFunctionDraft } from '../graph/index.js';
import { TrashIcon } from './board-variable-modals.js';

export interface BoardFunctionListProps {
  readonly functions: readonly ScenarioFunctionDraft[];
  readonly activeFunctionId: string;
  readonly disabled: boolean;
  readonly onSelect: (functionId: string) => void;
  readonly onCreate: () => void;
  readonly onDelete: (functionId: string) => void;
}

const FunctionRow: React.FC<{
  readonly fn: ScenarioFunctionDraft;
  readonly active: boolean;
  readonly disabled: boolean;
  readonly onSelect: (functionId: string) => void;
  readonly onDelete: (functionId: string) => void;
}> = ({ fn, active, disabled, onSelect, onDelete }) => (
  <div
    className={`group flex h-9 min-w-0 items-center gap-1 rounded-md border border-transparent px-1 ${
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-base-300 hover:bg-base-100/80'
    }`}
    role="button"
    tabIndex={disabled ? -1 : 0}
    aria-label={`Функция ${fn.name}`}
    aria-current={active ? 'true' : undefined}
    aria-disabled={disabled}
    onClick={() => {
      if (!disabled) {
        onSelect(fn.id);
      }
    }}
    onKeyDown={(event) => {
      if (disabled) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(fn.id);
      }
    }}
  >
    <span
      className={`min-w-0 flex-1 truncate text-sm ${active ? 'font-semibold text-primary' : 'font-normal'}`}
    >
      {fn.name}
    </span>
    <button
      type="button"
      className="btn btn-ghost btn-xs shrink-0 px-1 text-error opacity-70 group-hover:opacity-100"
      aria-label={`Удалить функцию ${fn.name}`}
      title="Удалить функцию"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onDelete(fn.id);
      }}
    >
      <TrashIcon />
    </button>
  </div>
);

/** Список пользовательских функций + кнопка «+» (CGF F1). */
export const BoardFunctionList: React.FC<BoardFunctionListProps> = ({
  functions,
  activeFunctionId,
  disabled,
  onSelect,
  onCreate,
  onDelete,
}) => (
  <div className="mt-3 border-t border-base-300 pt-3">
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
        Пользовательские функции
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-xs px-2"
        aria-label="Новая функция"
        title="Новая функция"
        disabled={disabled}
        onClick={onCreate}
      >
        +
      </button>
    </div>
    {functions.length === 0 ? (
      <p className="px-1 text-[10px] leading-relaxed text-base-content/40">
        Создайте функцию кнопкой «+», затем откройте её для редактирования.
      </p>
    ) : (
      <ul className="flex flex-col gap-0.5">
        {functions.map((fn) => (
          <li key={fn.id}>
            <FunctionRow
              fn={fn}
              active={fn.id === activeFunctionId}
              disabled={disabled}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    )}
  </div>
);
