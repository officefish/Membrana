import type { Connection, Edge, Node } from '@xyflow/react';

import { resolveHandle } from './handle-catalog.js';

/** Сообщение при попытке второго exec/event-исхода с одного handle. */
export const EXEC_FAN_OUT_MESSAGE =
  'Exec-выход уже подключён. Используйте узел Sequence для нескольких веток.';

function isControlFlowSourceHandle(
  nodes: readonly Node[],
  source: string,
  sourceHandle: string,
): boolean {
  const resolved = resolveHandle(nodes, source, sourceHandle, 'source');
  if (resolved === null) {
    return false;
  }
  return resolved.pinKind === 'exec' || resolved.pinKind === 'event';
}

function isControlFlowTargetHandle(
  nodes: readonly Node[],
  target: string,
  targetHandle: string,
): boolean {
  const resolved = resolveHandle(nodes, target, targetHandle, 'target');
  if (resolved === null) {
    return false;
  }
  return resolved.pinKind === 'exec' && targetHandle === 'exec-in';
}

/** Ребро control-flow: exec/event-out → exec-in. */
export function isControlFlowEdge(
  edge: Pick<Edge, 'source' | 'target' | 'sourceHandle' | 'targetHandle'>,
  nodes: readonly Node[],
): boolean {
  const sourceHandle = edge.sourceHandle;
  const targetHandle = edge.targetHandle;
  if (sourceHandle === null || sourceHandle === undefined) {
    return false;
  }
  if (targetHandle === null || targetHandle === undefined) {
    return false;
  }
  if (!isControlFlowSourceHandle(nodes, edge.source, sourceHandle)) {
    return false;
  }
  return isControlFlowTargetHandle(nodes, edge.target, targetHandle);
}

function controlFlowSourceKey(source: string, sourceHandle: string): string {
  return `${source}\0${sourceHandle}`;
}

/** Второе и последующие exec/event-рёра с одного (source, sourceHandle). */
export function findExecFanOutEdges(
  edges: readonly Edge[],
  nodes: readonly Node[],
): readonly Edge[] {
  const seen = new Map<string, string>();
  const duplicates: Edge[] = [];
  for (const edge of edges) {
    if (!isControlFlowEdge(edge, nodes)) {
      continue;
    }
    const sourceHandle = edge.sourceHandle;
    if (sourceHandle === null || sourceHandle === undefined) {
      continue;
    }
    const key = controlFlowSourceKey(edge.source, sourceHandle);
    const firstId = seen.get(key);
    if (firstId === undefined) {
      seen.set(key, edge.id);
      continue;
    }
    duplicates.push(edge);
  }
  return duplicates;
}

/** Блокирует connect, если exec/event-out уже ведёт на exec-in. */
export function wouldCreateExecFanOut(
  connection: Connection,
  edges: readonly Edge[],
  nodes: readonly Node[],
): boolean {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (
    source === null ||
    target === null ||
    sourceHandle === null ||
    targetHandle === null
  ) {
    return false;
  }
  if (
    !isControlFlowSourceHandle(nodes, source, sourceHandle) ||
    !isControlFlowTargetHandle(nodes, target, targetHandle)
  ) {
    return false;
  }
  const key = controlFlowSourceKey(source, sourceHandle);
  return edges.some((edge) => {
    if (!isControlFlowEdge(edge, nodes)) {
      return false;
    }
    const handle = edge.sourceHandle;
    if (handle === null || handle === undefined) {
      return false;
    }
    return controlFlowSourceKey(edge.source, handle) === key;
  });
}
