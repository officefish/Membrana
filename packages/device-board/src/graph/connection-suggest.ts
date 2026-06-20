import { isReferenceSocketType, isValidSocketConnection, isValueSocketType } from '@membrana/core';
import type { Node } from '@xyflow/react';

import { resolveHandle } from './handle-catalog.js';
import {
  IS_VALID_FALSE_HANDLE,
  IS_VALID_TRUE_HANDLE,
  PALETTE_VALUE_HANDLE,
  paletteNodeLabel,
  paletteNodePins,
  V04_PALETTE_NODE_KINDS,
  type V04PaletteNodeKind,
} from './palette-node.js';

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

function pinAcceptsSource(
  source: { readonly pinKind: 'exec' | 'data'; readonly socketType?: string },
  pin: { readonly name: string; readonly kind: 'exec' | 'data'; readonly socketType?: string },
): boolean {
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

/**
 * Список узлов палитры v0.4, совместимых с исходящим портом (exec/data).
 * Используется модалом «добавить метод устройства» при отпускании ребра над полем.
 */
export function suggestPaletteNodesForOutgoingConnection(
  nodes: readonly Node[],
  sourceNodeId: string,
  sourceHandle: string,
): readonly PaletteConnectionSuggestion[] {
  const sourceResolved = resolveHandle(nodes, sourceNodeId, sourceHandle, 'source');
  if (sourceResolved === null) {
    return [];
  }
  if (sourceResolved.pinKind === 'exec' && !EXEC_SOURCE_HANDLES.has(sourceHandle)) {
    return [];
  }
  return suggestFromResolved(sourceResolved);
}

function suggestFromResolved(sourceResolved: {
  readonly pinKind: 'exec' | 'data';
  readonly socketType?: string;
}): readonly PaletteConnectionSuggestion[] {
  const results: PaletteConnectionSuggestion[] = [];

  for (const nodeKind of V04_PALETTE_NODE_KINDS) {
    const { inputs } = paletteNodePins(nodeKind);
    for (const pin of inputs) {
      if (pinAcceptsSource(sourceResolved, pin)) {
        results.push({
          nodeKind,
          label: paletteNodeLabel(nodeKind),
          targetHandle: pin.name,
        });
        break;
      }
    }
  }

  return results;
}
