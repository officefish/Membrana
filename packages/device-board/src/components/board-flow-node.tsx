import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from '../graph/board-node-data.js';
import { isBoardFlowNodeData } from '../graph/board-node-data.js';
import { formatSocketPortLabel } from '../graph/socket-port-label.js';
import { socketHandleClass } from '../graph/socket-type-palette.js';

const LAYER_BORDER: Record<BoardFlowNodeData['layer'], string> = {
  signal: 'border-primary/40',
  scenario: 'border-secondary/40',
};

const STATUS_BADGE: Record<NonNullable<BoardFlowNodeData['status']>, string> = {
  active: 'badge-success',
  inactive: 'badge-ghost',
  missing: 'badge-warning',
  invalid: 'badge-error',
};

function handleOffset(index: number, total: number): string {
  if (total <= 1) {
    return '50%';
  }
  return `${((index + 1) / (total + 1)) * 100}%`;
}

function renderHandles(
  pins: readonly BoardSocketPin[],
  type: 'source' | 'target',
  position: Position,
): React.ReactNode {
  const isLeft = position === Position.Left;
  return pins.map((pin, index) => {
    const label = formatSocketPortLabel(pin);
    const top = handleOffset(index, pins.length);
    return (
      <React.Fragment key={pin.name}>
        <Handle
          id={pin.name}
          type={type}
          position={position}
          style={{ top }}
          className={socketHandleClass(pin)}
          title={label}
        />
        <span
          className={[
            'pointer-events-none absolute -translate-y-1/2 whitespace-nowrap font-mono text-[9px] leading-none text-base-content/70',
            isLeft ? 'left-2 text-left' : 'right-2 text-right',
          ].join(' ')}
          style={{ top }}
        >
          {label}
        </span>
      </React.Fragment>
    );
  });
}

/** Нода доски с типизированными handles (signal + scenario). */
export const BoardFlowNode: React.FC<NodeProps> = ({ data, selected }) => {
  if (!isBoardFlowNodeData(data)) {
    return null;
  }

  const status = data.status ?? 'active';
  const inputs = data.inputs ?? [];
  const outputs = data.outputs ?? [];
  const isSystem = data.system === true;

  return (
    <div
      className={[
        'relative min-w-[148px] rounded-lg border bg-base-100 px-3 py-2 shadow-sm',
        isSystem ? 'border-accent/60 ring-1 ring-accent/20' : LAYER_BORDER[data.layer],
        selected ? 'ring-2 ring-primary/50' : '',
      ].join(' ')}
      data-system={isSystem ? 'true' : undefined}
      aria-label={isSystem ? `Системный узел: ${data.label}` : undefined}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-base-content">
          {isSystem ? (
            <span className="text-accent" title="Системный узел (нельзя удалить)" aria-hidden="true">
              🔒
            </span>
          ) : null}
          {data.label}
        </span>
        <span className={`badge badge-xs ${isSystem ? 'badge-accent' : STATUS_BADGE[status]}`}>
          {isSystem ? 'system' : status}
        </span>
      </div>
      {renderHandles(inputs, 'target', Position.Left)}
      {renderHandles(outputs, 'source', Position.Right)}
    </div>
  );
};
