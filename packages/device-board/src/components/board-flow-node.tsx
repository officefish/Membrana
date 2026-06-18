import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SocketType } from '@membrana/core';

import type { BoardFlowNodeData, BoardSocketPin } from '../graph/board-node-data.js';
import { isBoardFlowNodeData } from '../graph/board-node-data.js';

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

const SOCKET_COLOR: Record<SocketType, string> = {
  AudioFrame: '!bg-primary',
  Spectrum: '!bg-secondary',
  Detection: '!bg-accent',
  TDOAPair: '!bg-info',
  IQSamples: '!bg-warning',
  RFSignature: '!bg-error',
  ThermalFrame: '!bg-neutral',
  BlobMask: '!bg-success',
  Observation: '!bg-base-content',
  DeviceRef: '!bg-accent',
  MicrophoneRef: '!bg-info',
};

function handleOffset(index: number, total: number): string {
  if (total <= 1) {
    return '50%';
  }
  return `${((index + 1) / (total + 1)) * 100}%`;
}

function handleClass(pin: BoardSocketPin): string {
  const base = '!h-2.5 !w-2.5 !border-2 !border-base-100';
  if (pin.kind === 'exec') {
    return `${base} !bg-base-content`;
  }
  if (pin.socketType !== undefined) {
    return `${base} ${SOCKET_COLOR[pin.socketType]}`;
  }
  return `${base} !bg-neutral`;
}

function renderHandles(
  pins: readonly BoardSocketPin[],
  type: 'source' | 'target',
  position: Position,
): React.ReactNode {
  return pins.map((pin, index) => (
    <Handle
      key={pin.name}
      id={pin.name}
      type={type}
      position={position}
      style={{ top: handleOffset(index, pins.length) }}
      className={handleClass(pin)}
      title={pin.kind === 'exec' ? 'exec' : pin.socketType}
    />
  ));
}

/** Нода доски с типизированными handles (signal + scenario). */
export const BoardFlowNode: React.FC<NodeProps> = ({ data, selected }) => {
  if (!isBoardFlowNodeData(data)) {
    return null;
  }

  const status = data.status ?? 'active';
  const inputs = data.inputs ?? [];
  const outputs = data.outputs ?? [];

  return (
    <div
      className={[
        'min-w-[148px] rounded-lg border bg-base-100 px-3 py-2 shadow-sm',
        LAYER_BORDER[data.layer],
        selected ? 'ring-2 ring-primary/50' : '',
      ].join(' ')}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-base-content">{data.label}</span>
        <span className={`badge badge-xs ${STATUS_BADGE[status]}`}>{status}</span>
      </div>
      {renderHandles(inputs, 'target', Position.Left)}
      {renderHandles(outputs, 'source', Position.Right)}
    </div>
  );
};
