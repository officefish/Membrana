import { isValidSocketConnection } from '@membrana/core';
import type { Connection, Edge, Node } from '@xyflow/react';

import type { BoardLayerTab } from '../types/board-ui.js';
import { resolveHandle } from './handle-catalog.js';

/** XYFlow `isValidConnection`: exec/exec или data с совпадающим SocketType. */
export function isValidBoardConnection(
  connection: Connection,
  nodes: readonly Node[],
  layer: BoardLayerTab,
): boolean {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (
    source === null ||
    target === null ||
    sourceHandle === null ||
    targetHandle === null ||
    source === target
  ) {
    return false;
  }

  const sourceResolved = resolveHandle(nodes, source, sourceHandle, 'source');
  const targetResolved = resolveHandle(nodes, target, targetHandle, 'target');
  if (sourceResolved === null || targetResolved === null) {
    return false;
  }

  if (layer === 'scenario') {
    if (sourceResolved.pinKind === 'exec' && targetResolved.pinKind === 'exec') {
      return true;
    }
    if (sourceResolved.pinKind === 'data' && targetResolved.pinKind === 'data') {
      if (sourceResolved.socketType === undefined || targetResolved.socketType === undefined) {
        return false;
      }
      return isValidSocketConnection(sourceResolved.socketType, targetResolved.socketType);
    }
    return false;
  }

  if (sourceResolved.pinKind !== 'data' || targetResolved.pinKind !== 'data') {
    return false;
  }
  if (sourceResolved.socketType === undefined || targetResolved.socketType === undefined) {
    return false;
  }
  return isValidSocketConnection(sourceResolved.socketType, targetResolved.socketType);
}

/** Проверяет уже существующее ребро (после загрузки JSON). */
export function isValidBoardEdge(
  edge: Edge,
  nodes: readonly Node[],
  layer: BoardLayerTab,
): boolean {
  return isValidBoardConnection(
    {
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
    },
    nodes,
    layer,
  );
}
