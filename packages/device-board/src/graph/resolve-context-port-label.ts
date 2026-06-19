import type { Edge, Node } from '@xyflow/react';
import type { SocketType } from '@membrana/core';

import { isBoardFlowNodeData } from './board-node-data.js';
import { resolveHandle } from './handle-catalog.js';
import { PALETTE_VALUE_HANDLE } from './palette-node.js';
import type { BoardSocketPin } from './board-node-data.js';
import { formatSocketPortLabel } from './socket-port-label.js';

function referenceNoun(socketType: SocketType): string {
  return socketType === 'MicrophoneRef' ? 'microphone' : 'device';
}

function inferSourceSocketType(
  edge: Edge,
  nodes: readonly Node[],
): SocketType | 'nullable' | undefined {
  if (edge.sourceHandle === undefined || edge.sourceHandle === null) {
    return undefined;
  }
  const sourceNode = nodes.find((node) => node.id === edge.source);
  if (sourceNode !== undefined && isBoardFlowNodeData(sourceNode.data)) {
    const sourcePin = sourceNode.data.outputs?.find((pin) => pin.name === edge.sourceHandle);
    if (sourcePin?.nullable === true) {
      return 'nullable';
    }
    if (sourcePin?.socketType !== undefined) {
      return sourcePin.socketType;
    }
  }
  const resolved = resolveHandle(nodes, edge.source, edge.sourceHandle, 'source');
  return resolved?.socketType;
}

/**
 * Подпись data-порта `value` у print/is-valid: контекстно от подключённого источника.
 * Без ребра — `value`; DeviceRef → `& device`; MicrophoneRef → `& microphone`.
 */
export function resolveContextValuePortLabel(
  nodeId: string,
  pin: BoardSocketPin,
  edges: readonly Edge[],
  nodes: readonly Node[],
): string {
  if (pin.name !== PALETTE_VALUE_HANDLE) {
    return formatSocketPortLabel(pin);
  }

  const incoming = edges.find(
    (edge) => edge.target === nodeId && edge.targetHandle === PALETTE_VALUE_HANDLE,
  );
  if (incoming === undefined) {
    return 'value';
  }

  const sourceType = inferSourceSocketType(incoming, nodes);
  if (sourceType === 'nullable') {
    return '& null';
  }
  if (sourceType === 'DeviceRef' || sourceType === 'MicrophoneRef') {
    return `& ${referenceNoun(sourceType)}`;
  }

  return 'value';
}

/** Pin для handle-стиля: подмешивает socketType с подключённого источника. */
export function resolveContextValuePin(
  nodeId: string,
  pin: BoardSocketPin,
  edges: readonly Edge[],
  nodes: readonly Node[],
): BoardSocketPin {
  if (pin.name !== PALETTE_VALUE_HANDLE) {
    return pin;
  }

  const incoming = edges.find(
    (edge) => edge.target === nodeId && edge.targetHandle === PALETTE_VALUE_HANDLE,
  );
  if (incoming === undefined) {
    return pin;
  }

  const sourceType = inferSourceSocketType(incoming, nodes);
  if (sourceType === 'nullable') {
    return { ...pin, nullable: true, socketType: 'DeviceRef' };
  }
  if (sourceType === 'DeviceRef' || sourceType === 'MicrophoneRef') {
    return { ...pin, socketType: sourceType };
  }

  return pin;
}
