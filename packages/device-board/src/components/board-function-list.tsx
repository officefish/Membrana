import React from 'react';

import type { ScenarioFunctionDraft } from '../graph/index.js';

export interface BoardFunctionListProps {
  readonly functions: readonly ScenarioFunctionDraft[];
  readonly activeFunctionId: string;
  readonly disabled: boolean;
  readonly onSelect: (functionId: string) => void;
  readonly onCreate: () => void;
}

/** Список пользовательских функций + кнопка «+» (CGF F1). */
export const BoardFunctionList: React.FC<BoardFunctionListProps> = ({
  functions,
  activeFunctionId,
  disabled,
  onSelect,
  onCreate,
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
    <ul className="flex flex-col gap-1">
      {functions.map((fn) => {
        const active = fn.id === activeFunctionId;
        return (
          <li key={fn.id}>
            <button
              type="button"
              className={`btn btn-sm h-8 min-h-0 w-full justify-start truncate font-normal ${
                active ? 'btn-primary' : 'btn-ghost'
              }`}
              disabled={disabled}
              onClick={() => onSelect(fn.id)}
            >
              {fn.name}
            </button>
          </li>
        );
      })}
    </ul>
  </div>
);
