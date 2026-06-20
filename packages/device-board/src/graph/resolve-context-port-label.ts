import type { Edge, Node } from '@xyflow/react';
import type { ReferenceSocketType, SocketType } from '@membrana/core';
import { isReferenceSocketType } from '@membrana/core';

import { isBoardFlowNodeData } from './board-node-data.js';
import type { BoardSocketPin } from './board-node-data.js';
import { resolveHandle } from './handle-catalog.js';
import { PALETTE_VALUE_HANDLE } from './palette-node.js';
import { formatSocketPortLabel } from './socket-port-label.js';
import { VARIABLE_VALUE_HANDLE } from './variable-node.js';

function referenceNoun(socketType: ReferenceSocketType): string {
  if (socketType === 'MicrophoneRef') {
    return 'microphone';
  }
  if (socketType === 'ServerRef') {
    return 'server';
  }
  if (socketType === 'AudioStreamRef') {
    return 'audio stream';
  }
  if (socketType === 'AudioSampleRef') {
    return 'audio sample';
  }
  if (socketType === 'FftFrameRef') {
    return 'fft frame';
  }
  return 'device';
}

function isContextValuePin(pin: BoardSocketPin): boolean {
  return pin.name === PALETTE_VALUE_HANDLE || pin.name === VARIABLE_VALUE_HANDLE;
}

function isVariableSetValuePin(
  nodeId: string,
  pin: BoardSocketPin,
  nodes: readonly Node[],
): boolean {
  if (pin.name !== VARIABLE_VALUE_HANDLE) {
    return false;
  }
  const node = nodes.find((item) => item.id === nodeId);
  if (node === undefined || !isBoardFlowNodeData(node.data)) {
    return false;
  }
  return node.data.nodeKind === 'variable-set';
}

/** Тип data-входа variable-set: без ребра — null; иначе тип источника. */
function resolveVariableSetSourceType(
  nodeId: string,
  pin: BoardSocketPin,
  edges: readonly Edge[],
  nodes: readonly Node[],
): SocketType | 'nullable' | undefined {
  const incoming = edges.find(
    (edge) => edge.target === nodeId && edge.targetHandle === VARIABLE_VALUE_HANDLE,
  );
  if (incoming === undefined) {
    if (pin.socketType !== undefined && isReferenceSocketType(pin.socketType)) {
      return 'nullable';
    }
    return pin.socketType;
  }
  return inferSourceSocketType(incoming, edges, nodes);
}

function inferSourceSocketType(
  edge: Edge,
  edges: readonly Edge[],
  nodes: readonly Node[],
): SocketType | 'nullable' | undefined {
  if (edge.sourceHandle === undefined || edge.sourceHandle === null) {
    return undefined;
  }
  const sourceNode = nodes.find((node) => node.id === edge.source);
  if (sourceNode !== undefined && isBoardFlowNodeData(sourceNode.data)) {
    const outputs = sourceNode.data.outputs ?? [];
    const sourcePin = outputs.find((pin) => pin.name === edge.sourceHandle);
    if (
      sourceNode.data.nodeKind === 'variable-set' &&
      edge.sourceHandle === VARIABLE_VALUE_HANDLE &&
      sourcePin !== undefined
    ) {
      return resolveVariableSetSourceType(sourceNode.id, sourcePin, edges, nodes);
    }
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

function formatContextSourceLabel(sourceType: SocketType | 'nullable' | undefined): string {
  if (sourceType === 'nullable') {
    return '& null';
  }
  if (sourceType === 'DateTime') {
    return 'datetime';
  }
  if (sourceType === 'Integer') {
    return 'integer';
  }
  if (sourceType === 'String') {
    return 'string';
  }
  if (sourceType !== undefined && isReferenceSocketType(sourceType)) {
    return `& ${referenceNoun(sourceType)}`;
  }
  return 'value';
}

function pinFromContextSource(
  pin: BoardSocketPin,
  sourceType: SocketType | 'nullable' | undefined,
): BoardSocketPin {
  if (sourceType === 'nullable') {
    return {
      ...pin,
      nullable: true,
      socketType: pin.socketType ?? 'DeviceRef',
    };
  }
  if (sourceType === 'DateTime') {
    return { ...pin, socketType: sourceType, nullable: undefined };
  }
  if (sourceType === 'Integer') {
    return { ...pin, socketType: sourceType, nullable: undefined };
  }
  if (sourceType === 'String') {
    return { ...pin, socketType: sourceType, nullable: undefined };
  }
  if (sourceType !== undefined && isReferenceSocketType(sourceType)) {
    return { ...pin, socketType: sourceType, nullable: undefined };
  }
  return pin;
}

/**
 * Подпись data-порта `value` у print/is-valid/variable-set.
 * Без ребра у reference-setter — `& null`; DeviceRef → `& device`; и т.д.
 */
export function resolveContextValuePortLabel(
  nodeId: string,
  pin: BoardSocketPin,
  edges: readonly Edge[],
  nodes: readonly Node[],
): string {
  if (!isContextValuePin(pin)) {
    return formatSocketPortLabel(pin);
  }

  if (isVariableSetValuePin(nodeId, pin, nodes)) {
    const sourceType = resolveVariableSetSourceType(nodeId, pin, edges, nodes);
    return formatContextSourceLabel(sourceType);
  }

  const incoming = edges.find(
    (edge) => edge.target === nodeId && edge.targetHandle === PALETTE_VALUE_HANDLE,
  );
  if (incoming === undefined) {
    return 'value';
  }

  return formatContextSourceLabel(inferSourceSocketType(incoming, edges, nodes));
}

/** Pin для handle-стиля: подмешивает socketType с подключённого источника. */
export function resolveContextValuePin(
  nodeId: string,
  pin: BoardSocketPin,
  edges: readonly Edge[],
  nodes: readonly Node[],
): BoardSocketPin {
  if (!isContextValuePin(pin)) {
    return pin;
  }

  if (isVariableSetValuePin(nodeId, pin, nodes)) {
    const sourceType = resolveVariableSetSourceType(nodeId, pin, edges, nodes);
    return pinFromContextSource(pin, sourceType);
  }

  const incoming = edges.find(
    (edge) => edge.target === nodeId && edge.targetHandle === PALETTE_VALUE_HANDLE,
  );
  if (incoming === undefined) {
    return pin;
  }

  return pinFromContextSource(pin, inferSourceSocketType(incoming, edges, nodes));
}

/** Разрешает data-выход variable-set для стиля рёбер (passthrough от входа). */
export function resolveVariableSetValuePin(
  nodeId: string,
  pin: BoardSocketPin,
  edges: readonly Edge[],
  nodes: readonly Node[],
): BoardSocketPin {
  if (!isVariableSetValuePin(nodeId, pin, nodes)) {
    return pin;
  }
  const sourceType = resolveVariableSetSourceType(nodeId, pin, edges, nodes);
  return pinFromContextSource(pin, sourceType);
}
