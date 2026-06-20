import {
  isReferenceSocketType,
  isValidSocketConnection,
  isValueSocketType,
  type SocketType,
} from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardSocketPin } from './board-node-data.js';
import { DEVICE_GLOBAL_NODE_KIND } from './device-global-node.js';
import { GET_RECORDER_DEVICE_HANDLE } from './get-recorder-node.js';
import { GET_JOURNAL_DEVICE_HANDLE, GET_JOURNAL_SERVER_HANDLE } from './get-journal-node.js';
import { GET_SPECTRAL_ANALYSER_DEVICE_HANDLE } from './get-spectral-analyser-node.js';
import {
  GET_MICROPHONE_DEVICE_HANDLE,
  IS_VALID_FALSE_HANDLE,
  IS_VALID_TRUE_HANDLE,
  PALETTE_VALUE_HANDLE,
  paletteNodeLabel,
  paletteNodePins,
  V04_PALETTE_NODE_KINDS,
  type V04PaletteNodeKind,
} from './palette-node.js';
import { resolveBoardNodeOutputPin } from './scenario-node-pins.js';
import { STOP_RUNTIME_DEVICE_HANDLE } from './stop-runtime-node.js';

/** Предложение узла палитры при «бросании» ребра на канвас. */
export interface PaletteConnectionSuggestion {
  readonly nodeKind: V04PaletteNodeKind;
  readonly label: string;
  readonly targetHandle: string;
}

const EXEC_SOURCE_HANDLES = new Set([
  'exec-out',
  IS_VALID_TRUE_HANDLE,
  IS_VALID_FALSE_HANDLE,
]);

/** Узлы-приёмники, которые не имеют смысла как target от DeviceRef. */
const SKIP_TARGET_FOR_DEVICE_REF = new Set<V04PaletteNodeKind>([DEVICE_GLOBAL_NODE_KIND]);

/** Методы устройства для DeviceRef (из документации nodeKind). */
export const DEVICE_REF_METHOD_TARGETS = [
  { nodeKind: 'get-microphone' as const, targetHandle: GET_MICROPHONE_DEVICE_HANDLE },
  { nodeKind: 'get-recorder' as const, targetHandle: GET_RECORDER_DEVICE_HANDLE },
  {
    nodeKind: 'get-spectral-analyser' as const,
    targetHandle: GET_SPECTRAL_ANALYSER_DEVICE_HANDLE,
  },
  { nodeKind: 'stop-runtime' as const, targetHandle: STOP_RUNTIME_DEVICE_HANDLE },
  { nodeKind: 'get-journal' as const, targetHandle: GET_JOURNAL_DEVICE_HANDLE },
] as const;

/** Методы для ServerRef (DBJ1). */
export const SERVER_REF_METHOD_TARGETS = [
  { nodeKind: 'get-journal' as const, targetHandle: GET_JOURNAL_SERVER_HANDLE },
] as const;

function pinAcceptsSource(
  source: { readonly pinKind: 'exec' | 'data'; readonly socketType?: SocketType },
  pin: BoardSocketPin,
): boolean {
  if (pin.kind === 'event') {
    return false;
  }
  if (source.pinKind === 'exec' && pin.kind === 'exec' && pin.name === 'exec-in') {
    return true;
  }
  if (source.pinKind !== 'data' || pin.kind !== 'data') {
    return false;
  }
  if (
    pin.name === PALETTE_VALUE_HANDLE &&
    source.socketType !== undefined &&
    (isReferenceSocketType(source.socketType) || isValueSocketType(source.socketType))
  ) {
    return true;
  }
  if (source.socketType === undefined || pin.socketType === undefined) {
    return false;
  }
  return isValidSocketConnection(source.socketType, pin.socketType);
}

function resolveSourceNode(
  nodes: readonly Node[],
  sourceNodeId: string,
  sourceNode?: Node,
): Node | undefined {
  if (sourceNode !== undefined && sourceNode.id === sourceNodeId) {
    return sourceNode;
  }
  return nodes.find((node) => node.id === sourceNodeId);
}

function resolveSourcePin(
  nodes: readonly Node[],
  sourceNodeId: string,
  sourceHandle: string,
  sourceNode?: Node,
): { readonly pinKind: 'exec' | 'data'; readonly socketType?: SocketType } | null {
  const node = resolveSourceNode(nodes, sourceNodeId, sourceNode);
  if (node === undefined) {
    return null;
  }

  const outputPin = resolveBoardNodeOutputPin(node, sourceHandle);
  if (outputPin !== undefined) {
    if (outputPin.kind === 'event') {
      return null;
    }
    return { pinKind: outputPin.kind, socketType: outputPin.socketType };
  }

  return null;
}

function suggestPaletteTarget(
  nodeKind: V04PaletteNodeKind,
  sourceResolved: { readonly pinKind: 'exec' | 'data'; readonly socketType?: SocketType },
): PaletteConnectionSuggestion | null {
  if (sourceResolved.pinKind === 'data' && sourceResolved.socketType === 'DeviceRef') {
    if (SKIP_TARGET_FOR_DEVICE_REF.has(nodeKind)) {
      return null;
    }
  }

  const { inputs } = paletteNodePins(nodeKind);
  for (const pin of inputs) {
    if (pinAcceptsSource(sourceResolved, pin)) {
      return {
        nodeKind,
        label: paletteNodeLabel(nodeKind),
        targetHandle: pin.name,
      };
    }
  }
  return null;
}

function suggestFromResolved(sourceResolved: {
  readonly pinKind: 'exec' | 'data';
  readonly socketType?: SocketType;
}): readonly PaletteConnectionSuggestion[] {
  const results: PaletteConnectionSuggestion[] = [];

  for (const nodeKind of V04_PALETTE_NODE_KINDS) {
    const suggestion = suggestPaletteTarget(nodeKind, sourceResolved);
    if (suggestion !== null) {
      results.push(suggestion);
    }
  }

  return results;
}

/**
 * Список узлов палитры v0.4, совместимых с исходящим портом (exec/data).
 * Пины источника и приёмников берутся из канонической схемы nodeKind.
 */
export function suggestPaletteNodesForOutgoingConnection(
  nodes: readonly Node[],
  sourceNodeId: string,
  sourceHandle: string,
  options: { readonly sourceNode?: Node } = {},
): readonly PaletteConnectionSuggestion[] {
  const sourceResolved = resolveSourcePin(
    nodes,
    sourceNodeId,
    sourceHandle,
    options.sourceNode,
  );
  if (sourceResolved === null) {
    return [];
  }
  if (sourceResolved.pinKind === 'exec' && !EXEC_SOURCE_HANDLES.has(sourceHandle)) {
    return [];
  }
  return suggestFromResolved(sourceResolved);
}
