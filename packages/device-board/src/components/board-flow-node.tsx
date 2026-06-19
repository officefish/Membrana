import React, { useCallback, useMemo } from 'react';
import { Handle, Position, useStore, type NodeProps } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from '../graph/board-node-data.js';
import { isBoardFlowNodeData } from '../graph/board-node-data.js';
import { findPassthroughPortLanes, handleOffsetPercent } from '../graph/node-passthrough-port.js';
import {
  resolveContextValuePin,
  resolveContextValuePortLabel,
} from '../graph/resolve-context-port-label.js';
import { formatSocketPortLabel } from '../graph/socket-port-label.js';
import { socketHandleClass } from '../graph/socket-type-palette.js';

const LAYER_BORDER: Record<BoardFlowNodeData['layer'], string> = {
  signal: 'border-primary/40',
  scenario: 'border-secondary/40',
};

/** Бейджи только для осмысленных статусов; `active` в UI не показываем. */
const STATUS_BADGE: Partial<Record<NonNullable<BoardFlowNodeData['status']>, string>> = {
  inactive: 'badge-ghost',
  missing: 'badge-warning',
  invalid: 'badge-error',
};

const PIN_ROW_PX = 22;

function variableDisplayName(data: BoardFlowNodeData): string {
  const label = data.label;
  if (data.nodeKind === 'variable-get' && label.toLowerCase().startsWith('get ')) {
    return label.slice(4);
  }
  if (data.nodeKind === 'variable-set' && label.toLowerCase().startsWith('set ')) {
    return label.slice(4);
  }
  return label;
}

function renderNodeTitle(data: BoardFlowNodeData): React.ReactNode {
  if (data.nodeKind === 'loop-repeat') {
    return (
      <span className="text-lg leading-none" aria-label="Новый цикл лупа">
        ∞
      </span>
    );
  }
  if (data.nodeKind === 'variable-get') {
    return (
      <>
        Get <em className="font-normal italic">{variableDisplayName(data)}</em>
      </>
    );
  }
  if (data.nodeKind === 'variable-set') {
    return (
      <>
        Set <em className="font-normal italic">{variableDisplayName(data)}</em>
      </>
    );
  }
  return data.label;
}

function renderHandles(
  pins: readonly BoardSocketPin[],
  type: 'source' | 'target',
  position: Position,
  resolvePin: (pin: BoardSocketPin) => BoardSocketPin,
  resolveLabel: (pin: BoardSocketPin) => string,
  passthroughHandles: ReadonlySet<string>,
): React.ReactNode {
  const isLeft = position === Position.Left;
  return pins.map((pin, index) => {
    const resolvedPin = resolvePin(pin);
    const label = resolveLabel(resolvedPin);
    const top = `${handleOffsetPercent(index, pins.length)}%`;
    const showCornerLabel = !passthroughHandles.has(pin.name);
    return (
      <React.Fragment key={pin.name}>
        <Handle
          id={pin.name}
          type={type}
          position={position}
          style={{ top }}
          className={socketHandleClass(resolvedPin)}
          title={label}
        />
        {showCornerLabel ? (
          <span
            className={[
              'pointer-events-none absolute -translate-y-1/2 whitespace-nowrap font-mono text-[9px] leading-none text-base-content/70',
              isLeft ? 'left-4 text-left' : 'right-4 text-right',
            ].join(' ')}
            style={{ top }}
          >
            {label}
          </span>
        ) : null}
      </React.Fragment>
    );
  });
}

/** Нода доски с типизированными handles (signal + scenario). */
export const BoardFlowNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const edges = useStore((state) => state.edges);
  const nodes = useStore((state) => state.nodes);

  const resolvePin = useCallback(
    (pin: BoardSocketPin) => {
      if (!isBoardFlowNodeData(data)) {
        return pin;
      }
      if (data.nodeKind === 'is-valid' || data.nodeKind === 'print' || data.nodeKind === 'variable-set') {
        return resolveContextValuePin(id, pin, edges, nodes);
      }
      return pin;
    },
    [data, edges, id, nodes],
  );

  const resolveLabel = useCallback(
    (pin: BoardSocketPin) => {
      if (!isBoardFlowNodeData(data)) {
        return formatSocketPortLabel(pin);
      }
      if (data.nodeKind === 'is-valid' || data.nodeKind === 'print' || data.nodeKind === 'variable-set') {
        return resolveContextValuePortLabel(id, pin, edges, nodes);
      }
      return formatSocketPortLabel(pin);
    },
    [data, edges, id, nodes],
  );

  if (!isBoardFlowNodeData(data)) {
    return null;
  }

  const status = data.status ?? 'active';
  const inputs = data.inputs ?? [];
  const outputs = data.outputs ?? [];
  const isSystem = data.system === true;
  const statusBadgeClass = status !== 'active' ? STATUS_BADGE[status] : undefined;
  const pinRows = Math.max(inputs.length, outputs.length, data.nodeKind === 'loop-repeat' ? 1 : 0, 1);
  const bodyHeightPx = data.nodeKind === 'loop-repeat' ? 48 : pinRows * PIN_ROW_PX + 8;

  const passthroughLanes = useMemo(
    () => findPassthroughPortLanes(inputs, outputs, resolveLabel),
    [inputs, outputs, resolveLabel],
  );
  const passthroughHandles = useMemo(() => {
    const handles = new Set<string>();
    for (const lane of passthroughLanes) {
      handles.add(lane.inputHandle);
      handles.add(lane.outputHandle);
    }
    return handles;
  }, [passthroughLanes]);

  return (
    <div
      className={[
        'relative min-w-[220px] overflow-hidden rounded-lg border bg-base-100 shadow-sm',
        isSystem ? 'border-accent/60 ring-1 ring-accent/20' : LAYER_BORDER[data.layer],
        selected ? 'ring-2 ring-primary/50' : '',
      ].join(' ')}
      data-system={isSystem ? 'true' : undefined}
      aria-label={isSystem ? `Системный узел: ${data.label}` : undefined}
    >
      <div
        className={[
          'flex items-center justify-between gap-2 border-b border-base-200/70 px-2 py-1',
          isSystem ? 'bg-accent/5' : 'bg-base-200/30',
        ].join(' ')}
      >
        <span className="flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-base-content">
          {isSystem ? (
            <span className="shrink-0 text-accent" title="Системный узел (нельзя удалить)" aria-hidden="true">
              🔒
            </span>
          ) : null}
          <span className="truncate">{renderNodeTitle(data)}</span>
        </span>
        {isSystem ? (
          <span className="badge badge-xs shrink-0 badge-accent">system</span>
        ) : statusBadgeClass !== undefined ? (
          <span className={`badge badge-xs shrink-0 ${statusBadgeClass}`}>{status}</span>
        ) : null}
      </div>
      <div className="relative" style={{ minHeight: bodyHeightPx }}>
        {data.nodeKind === 'loop-repeat' ? (
          <div className="flex h-full items-center justify-center py-2 text-3xl text-accent/80" aria-hidden="true">
            ∞
          </div>
        ) : null}
        {passthroughLanes.map((lane) => (
          <span
            key={`${lane.inputHandle}:${lane.outputHandle}`}
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[9px] leading-none text-base-content/80"
            style={{ top: `${lane.centerTopPercent}%` }}
          >
            {lane.centerText}
          </span>
        ))}
        {renderHandles(inputs, 'target', Position.Left, resolvePin, resolveLabel, passthroughHandles)}
        {renderHandles(outputs, 'source', Position.Right, resolvePin, resolveLabel, passthroughHandles)}
      </div>
    </div>
  );
};
