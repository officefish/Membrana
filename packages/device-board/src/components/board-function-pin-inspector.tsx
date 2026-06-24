import React, { useEffect, useState } from 'react';
import type { ScenarioFunctionPin, SocketType } from '@membrana/core';
import { MAX_SCENARIO_FUNCTION_PINS_PER_SIDE, SOCKET_TYPES } from '@membrana/core';

import type { ScenarioFunctionCanvasMeta } from '../graph/hydrate-board-from-document.js';
import type { FunctionPinSide } from '../graph/function-pin-ops.js';
import { socketTypeIndicatorClass } from '../graph/socket-type-indicator.js';
import { TrashIcon } from './board-variable-modals.js';

export type FunctionPinEditSide = 'input' | 'output' | null;

export interface BoardFunctionPinInspectorProps {
  readonly meta: ScenarioFunctionCanvasMeta;
  readonly pinEditSide: FunctionPinEditSide;
  readonly disabled: boolean;
  readonly onUpdateMeta: (patch: Partial<Pick<ScenarioFunctionCanvasMeta, 'name' | 'description'>>) => void;
  readonly onAddPin: (side: FunctionPinSide) => void;
  readonly onUpdatePin: (
    side: FunctionPinSide,
    pinId: string,
    patch: { readonly name?: string; readonly kind?: 'exec' | 'data'; readonly socketType?: SocketType },
  ) => void;
  readonly onRemovePin: (side: FunctionPinSide, pinId: string) => void;
  readonly onDeleteFunction: () => void;
}

const PinTable: React.FC<{
  readonly title: string;
  readonly side: FunctionPinSide;
  readonly pins: readonly ScenarioFunctionPin[];
  readonly disabled: boolean;
  readonly onAddPin: (side: FunctionPinSide) => void;
  readonly onUpdatePin: BoardFunctionPinInspectorProps['onUpdatePin'];
  readonly onRemovePin: BoardFunctionPinInspectorProps['onRemovePin'];
}> = ({ title, side, pins, disabled, onAddPin, onUpdatePin, onRemovePin }) => {
  const atLimit = pins.length >= MAX_SCENARIO_FUNCTION_PINS_PER_SIDE;

  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
          {title} ({pins.length}/{MAX_SCENARIO_FUNCTION_PINS_PER_SIDE})
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-xs px-1.5"
          disabled={disabled || atLimit}
          title={atLimit ? 'Лимит pins' : 'Добавить data pin'}
          onClick={() => onAddPin(side)}
        >
          + data
        </button>
      </div>
      <progress
        className={`progress h-1.5 w-full ${atLimit ? 'progress-warning' : 'progress-primary'}`}
        value={pins.length}
        max={MAX_SCENARIO_FUNCTION_PINS_PER_SIDE}
        aria-label={`${title}: ${pins.length} из ${MAX_SCENARIO_FUNCTION_PINS_PER_SIDE}`}
      />
      <ul className="flex flex-col gap-1.5">
        {pins.map((pin) => (
          <PinRow
            key={pin.id}
            pin={pin}
            side={side}
            disabled={disabled}
            onUpdatePin={onUpdatePin}
            onRemovePin={onRemovePin}
          />
        ))}
      </ul>
    </section>
  );
};

const PinRow: React.FC<{
  readonly pin: ScenarioFunctionPin;
  readonly side: FunctionPinSide;
  readonly disabled: boolean;
  readonly onUpdatePin: BoardFunctionPinInspectorProps['onUpdatePin'];
  readonly onRemovePin: BoardFunctionPinInspectorProps['onRemovePin'];
}> = ({ pin, side, disabled, onUpdatePin, onRemovePin }) => {
  const [nameDraft, setNameDraft] = useState(pin.name);
  const isExecPin = pin.kind === 'exec';
  const socketType = pin.socketType ?? 'DeviceRef';
  const typeIndicatorClass = socketTypeIndicatorClass(pin.kind, isExecPin ? undefined : socketType);
  const typeLabel = isExecPin ? 'exec' : socketType;

  useEffect(() => {
    setNameDraft(pin.name);
  }, [pin.id, pin.name]);

  return (
    <li className="rounded-md border border-base-300 bg-base-200/30 p-2">
      <div className="flex items-start gap-1.5">
        <span
          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${typeIndicatorClass}`}
          title={typeLabel}
          aria-hidden
        />
        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          <input
            type="text"
            className="input input-bordered input-xs w-full font-mono"
            value={nameDraft}
            disabled={disabled}
            aria-label={`Имя pin ${pin.id}`}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => {
              if (nameDraft.trim() !== pin.name) {
                onUpdatePin(side, pin.id, { name: nameDraft });
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
          {isExecPin ? (
            <span className="badge badge-xs badge-outline w-fit font-mono">exec</span>
          ) : (
            <select
              className="select select-bordered select-xs min-h-0 w-full font-mono"
              value={socketType}
              disabled={disabled}
              aria-label={`SocketType ${pin.name}`}
              onChange={(event) =>
                onUpdatePin(side, pin.id, { socketType: event.target.value as SocketType })
              }
            >
              {SOCKET_TYPES.map((optionSocketType) => (
                <option key={optionSocketType} value={optionSocketType}>
                  {optionSocketType}
                </option>
              ))}
            </select>
          )}
        </div>
        {!isExecPin ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs shrink-0 px-1 text-error"
            disabled={disabled}
            aria-label={`Удалить pin ${pin.name}`}
            title="Удалить pin"
            onClick={() => onRemovePin(side, pin.id)}
          >
            <TrashIcon />
          </button>
        ) : null}
      </div>
    </li>
  );
};

/** Инспектор активной функции: имя, описание, CRUD data pins (CGF F1). */
export const BoardFunctionPinInspector: React.FC<BoardFunctionPinInspectorProps> = ({
  meta,
  pinEditSide,
  disabled,
  onUpdateMeta,
  onAddPin,
  onUpdatePin,
  onRemovePin,
  onDeleteFunction,
}) => {
  const [nameDraft, setNameDraft] = useState(meta.name);
  const [descriptionDraft, setDescriptionDraft] = useState(meta.description ?? '');

  useEffect(() => {
    setNameDraft(meta.name);
    setDescriptionDraft(meta.description ?? '');
  }, [meta.description, meta.id, meta.name]);

  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <div className="border-b border-base-200 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
          Пользовательская функция
        </p>
        <h2 className="text-sm font-semibold text-base-content">{meta.name}</h2>
      </div>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-base-content/70">Имя функции</span>
        <input
          type="text"
          className="input input-bordered input-sm w-full"
          value={nameDraft}
          disabled={disabled}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={() => {
            const trimmed = nameDraft.trim();
            if (trimmed.length > 0 && trimmed !== meta.name) {
              onUpdateMeta({ name: trimmed });
            }
          }}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-base-content/70">Описание</span>
        <textarea
          className="textarea textarea-bordered textarea-sm min-h-[4rem] w-full resize-y leading-snug"
          value={descriptionDraft}
          maxLength={500}
          placeholder="Необязательно"
          disabled={disabled}
          onChange={(event) => setDescriptionDraft(event.target.value)}
          onBlur={() => {
            if (descriptionDraft.trim() !== (meta.description ?? '')) {
              onUpdateMeta({ description: descriptionDraft.trim() });
            }
          }}
        />
      </label>

      {pinEditSide === 'input' ? (
        <PinTable
          title="Входные параметры"
          side="input"
          pins={meta.inputPins}
          disabled={disabled}
          onAddPin={onAddPin}
          onUpdatePin={onUpdatePin}
          onRemovePin={onRemovePin}
        />
      ) : null}

      {pinEditSide === 'output' ? (
        <PinTable
          title="Выходные параметры"
          side="output"
          pins={meta.outputPins}
          disabled={disabled}
          onAddPin={onAddPin}
          onUpdatePin={onUpdatePin}
          onRemovePin={onRemovePin}
        />
      ) : null}

      {pinEditSide === null ? (
        <p className="text-xs leading-relaxed text-base-content/55">
          Выберите узел Input или Output на канвасе, чтобы редактировать входные и выходные
          параметры. Exec-in и exec-out задаются по умолчанию; добавлять можно только data pins.
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-base-content/55">
          До {MAX_SCENARIO_FUNCTION_PINS_PER_SIDE} pins на сторону. Изменения синхронизируются с
          узлами Input/Output и subgraph-блоками на ветках.
        </p>
      )}

      <div className="border-t border-base-200 pt-3">
        <button
          type="button"
          className="btn btn-outline btn-error btn-sm w-full"
          disabled={disabled}
          onClick={onDeleteFunction}
        >
          Удалить функцию
        </button>
      </div>
    </div>
  );
};
