import type { Connection, Edge } from '@xyflow/react';

type BoardEdgeEndpoints = Pick<Edge, 'source' | 'sourceHandle' | 'target' | 'targetHandle'>;

/** Стабильный ключ соединения (совпадает с id при deserialize). */
export function boardEdgeConnectionKey(edge: BoardEdgeEndpoints): string {
  return `${edge.source}:${edge.sourceHandle ?? ''}->${edge.target}:${edge.targetHandle ?? ''}`;
}

/** Канонический id ребра на канвасе. */
export function canonicalBoardEdgeId(edge: BoardEdgeEndpoints): string {
  return boardEdgeConnectionKey(edge);
}

/**
 * Убирает дубликаты рёбер с одинаковыми source/target/handles.
 * Нормализует id к каноническому виду — устраняет React Flow warning о duplicate keys.
 */
export function dedupeBoardEdges(edges: readonly Edge[]): Edge[] {
  const seen = new Set<string>();
  const result: Edge[] = [];
  for (const edge of edges) {
    const key = boardEdgeConnectionKey(edge);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const id = canonicalBoardEdgeId(edge);
    result.push(edge.id === id ? edge : { ...edge, id });
  }
  return result;
}

/** Добавляет ребро, если такого соединения ещё нет (id = connection key). */
export function addBoardEdge(connection: Connection, edges: readonly Edge[]): Edge[] {
  if (connection.source === null || connection.target === null) {
    return [...edges];
  }
  const candidate: Edge = {
    id: canonicalBoardEdgeId({
      source: connection.source,
      sourceHandle: connection.sourceHandle ?? undefined,
      target: connection.target,
      targetHandle: connection.targetHandle ?? undefined,
    }),
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle ?? undefined,
    targetHandle: connection.targetHandle ?? undefined,
  };
  const key = boardEdgeConnectionKey(candidate);
  if (edges.some((edge) => boardEdgeConnectionKey(edge) === key)) {
    return [...edges];
  }
  return [...edges, candidate];
}
