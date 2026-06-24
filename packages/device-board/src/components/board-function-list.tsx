import React from 'react';

import type { ScenarioFunctionDraft } from '../graph/index.js';
import { PencilIcon, TrashIcon } from './board-variable-modals.js';

export interface BoardFunctionListProps {
  readonly functions: readonly ScenarioFunctionDraft[];
  readonly activeFunctionId: string;
  readonly activeFunctionDraftIndex: number;
  readonly crudDisabled: boolean;
  readonly onSelect: (functionId: string, draftIndex: number) => void;
  readonly onCreate: () => void;
  readonly onRename: (functionId: string, draftIndex: number) => void;
  readonly onDelete: (functionId: string, draftIndex: number) => void;
}

const FunctionRow: React.FC<{
  readonly fn: ScenarioFunctionDraft;
  readonly draftIndex: number;
  readonly active: boolean;
  readonly crudDisabled: boolean;
  readonly onSelect: (functionId: string, draftIndex: number) => void;
  readonly onRename: (functionId: string, draftIndex: number) => void;
  readonly onDelete: (functionId: string, draftIndex: number) => void;
}> = ({ fn, draftIndex, active, crudDisabled, onSelect, onRename, onDelete }) => (
  <div
    className={`group flex h-9 min-w-0 items-center gap-1 rounded-md border border-transparent px-1 cursor-pointer hover:border-base-300 hover:bg-base-100/80`}
    role="button"
    tabIndex={0}
    aria-label={`Функция ${fn.name}`}
    aria-current={active ? 'true' : undefined}
    onClick={() => {
      onSelect(fn.id, draftIndex);
    }}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(fn.id, draftIndex);
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
      className="btn btn-ghost btn-xs shrink-0 px-1 opacity-70 group-hover:opacity-100"
      aria-label={`Редактировать имя ${fn.name}`}
      title="Редактировать имя"
      disabled={crudDisabled}
      onClick={(event) => {
        event.stopPropagation();
        onRename(fn.id, draftIndex);
      }}
    >
      <PencilIcon />
    </button>
    <button
      type="button"
      className="btn btn-ghost btn-xs shrink-0 px-1 text-error opacity-70 group-hover:opacity-100"
      aria-label={`Удалить функцию ${fn.name}`}
      title="Удалить функцию"
      disabled={crudDisabled}
      onClick={(event) => {
        event.stopPropagation();
        onDelete(fn.id, draftIndex);
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
  activeFunctionDraftIndex,
  crudDisabled,
  onSelect,
  onCreate,
  onRename,
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
        disabled={crudDisabled}
        onClick={onCreate}
      >
        +
      </button>
    </div>
    {functions.length === 0 ? (
      <p className="px-1 text-[10px] leading-relaxed text-base-content/40">
        {crudDisabled
          ? 'Нет пользовательских функций.'
          : 'Создайте функцию кнопкой «+», затем откройте её для редактирования.'}
      </p>
    ) : (
      <ul className="flex flex-col gap-0.5">
        {functions.map((fn, draftIndex) => (
          <li key={`${fn.id}::${draftIndex}`}>
            <FunctionRow
              fn={fn}
              draftIndex={draftIndex}
              active={fn.id === activeFunctionId && draftIndex === activeFunctionDraftIndex}
              crudDisabled={crudDisabled}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    )}
  </div>
);
