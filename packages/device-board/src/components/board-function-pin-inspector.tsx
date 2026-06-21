import React, { useEffect, useState } from 'react';
import type { ScenarioFunctionPin, SocketType } from '@membrana/core';
import { MAX_SCENARIO_FUNCTION_PINS_PER_SIDE, SOCKET_TYPES } from '@membrana/core';

import type { ScenarioFunctionCanvasMeta } from '../graph/hydrate-board-from-document.js';
import type { FunctionPinSide } from '../graph/function-pin-ops.js';
import { TrashIcon } from './board-variable-modals.js';

export interface BoardFunctionPinInspectorProps {
  readonly meta: ScenarioFunctionCanvasMeta;
  readonly disabled: boolean;
  readonly onUpdateMeta: (patch: Partial<Pick<ScenarioFunctionCanvasMeta, 'name' | 'description'>>) => void;
  readonly onAddPin: (side: FunctionPinSide, kind: 'exec' | 'data') => void;
  readonly onUpdatePin: (
    side: FunctionPinSide,
    pinId: string,
    patch: { readonly name?: string; readonly kind?: 'exec' | 'data'; readonly socketType?: SocketType },
  ) => void;
  readonly onRemovePin: (side: FunctionPinSide, pinId: string) => void;
}

const PinTable: React.FC<{
  readonly title: string;
  readonly side: FunctionPinSide;
  readonly pins: readonly ScenarioFunctionPin[];
  readonly disabled: boolean;
  readonly onAddPin: (side: FunctionPinSide, kind: 'exec' | 'data') => void;
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
        <div className="flex gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-xs px-1.5"
            disabled={disabled || atLimit}
            title={atLimit ? 'Лимит pins' : 'Добавить exec pin'}
            onClick={() => onAddPin(side, 'exec')}
          >
            + exec
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs px-1.5"
            disabled={disabled || atLimit}
            title={atLimit ? 'Лимит pins' : 'Добавить data pin'}
            onClick={() => onAddPin(side, 'data')}
          >
            + data
          </button>
        </div>
      </div>
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

  useEffect(() => {
    setNameDraft(pin.name);
  }, [pin.id, pin.name]);

  return (
    <li className="rounded-md border border-base-300 bg-base-200/30 p-2">
      <div className="flex items-start gap-1">
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
          <div className="flex gap-1">
            <select
              className="select select-bordered select-xs min-h-0 flex-1 font-mono"
              value={pin.kind}
              disabled={disabled}
              aria-label={`Тип pin ${pin.name}`}
              onChange={(event) =>
                onUpdatePin(side, pin.id, { kind: event.target.value as 'exec' | 'data' })
              }
            >
              <option value="exec">exec</option>
              <option value="data">data</option>
            </select>
            {pin.kind === 'data' ? (
              <select
                className="select select-bordered select-xs min-h-0 flex-[2] font-mono"
                value={pin.socketType ?? 'DeviceRef'}
                disabled={disabled}
                aria-label={`SocketType ${pin.name}`}
                onChange={(event) =>
                  onUpdatePin(side, pin.id, { socketType: event.target.value as SocketType })
                }
              >
                {SOCKET_TYPES.map((socketType) => (
                  <option key={socketType} value={socketType}>
                    {socketType}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
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
      </div>
    </li>
  );
};

/** Инспектор активной функции: имя, описание, CRUD pins (CGF F1). */
export const BoardFunctionPinInspector: React.FC<BoardFunctionPinInspectorProps> = ({
  meta,
  disabled,
  onUpdateMeta,
  onAddPin,
  onUpdatePin,
  onRemovePin,
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

      <PinTable
        title="Input pins"
        side="input"
        pins={meta.inputPins}
        disabled={disabled}
        onAddPin={onAddPin}
        onUpdatePin={onUpdatePin}
        onRemovePin={onRemovePin}
      />
      <PinTable
        title="Output pins"
        side="output"
        pins={meta.outputPins}
        disabled={disabled}
        onAddPin={onAddPin}
        onUpdatePin={onUpdatePin}
        onRemovePin={onRemovePin}
      />

      <p className="text-xs leading-relaxed text-base-content/55">
        До {MAX_SCENARIO_FUNCTION_PINS_PER_SIDE} pins на Input и Output (exec + data). Изменения синхронизируются с
        узлами Input/Output и subgraph-блоками на ветках.
      </p>
    </div>
  );
};
