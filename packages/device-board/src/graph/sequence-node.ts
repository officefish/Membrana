import type { ScenarioSequenceConfig } from '@membrana/core';
import { MAX_SCENARIO_SEQUENCE_THEN_COUNT, resolveScenarioSequenceConfig } from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

export const SEQUENCE_NODE_KIND = 'sequence' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Имя exec-выхода Then по индексу (0..8). */
export function sequenceThenHandle(index: number): string {
  return `then-${index}`;
}

/** True, если handle — Then-выход Sequence. */
export function isSequenceThenHandle(handle: string): boolean {
  return /^then-\d+$/.test(handle);
}

/** Индекс Then из handle; `null` если не Then-pin. */
export function parseSequenceThenIndex(handle: string): number | null {
  if (!isSequenceThenHandle(handle)) {
    return null;
  }
  const index = Number.parseInt(handle.slice('then-'.length), 10);
  return Number.isFinite(index) ? index : null;
}

/** Пины Sequence: exec-in + Then 0..(thenCount-1) + exec-out. */
export function sequenceNodePins(thenCount: number): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  const count = resolveScenarioSequenceConfig({ thenCount }).thenCount;
  const outputs: BoardSocketPin[] = [];
  for (let index = 0; index < count; index += 1) {
    outputs.push({ name: sequenceThenHandle(index), kind: 'exec' });
  }
  outputs.push(EXEC_OUT);
  return {
    inputs: [EXEC_IN],
    outputs,
  };
}

export interface CreateSequenceBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly sequenceConfig?: Partial<ScenarioSequenceConfig>;
}

let sequenceNodeSeq = 0;

/** Фабрика узла Sequence. */
export function createSequenceBoardNode(options: CreateSequenceBoardNodeOptions = {}): Node {
  sequenceNodeSeq += 1;
  const id = options.id ?? `node-sequence-${Date.now().toString(36)}-${sequenceNodeSeq}`;
  const sequenceConfig = resolveScenarioSequenceConfig(options.sequenceConfig);
  const { inputs, outputs } = sequenceNodePins(sequenceConfig.thenCount);
  const data: BoardFlowNodeData = {
    label: 'Sequence',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: SEQUENCE_NODE_KIND,
    sequenceConfig,
    inputs,
    outputs,
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — Sequence. */
export function isSequenceNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === SEQUENCE_NODE_KIND;
}

/** Читает sequenceConfig из data ноды или ScenarioGraphNode. */
export function readSequenceConfig(
  source: Pick<BoardFlowNodeData, 'sequenceConfig'> | { readonly sequenceConfig?: ScenarioSequenceConfig },
): ScenarioSequenceConfig {
  return resolveScenarioSequenceConfig(source.sequenceConfig);
}

/** Обновляет data ноды Sequence: config + пересчёт pins. */
export function applySequenceConfigToNodeData(
  data: BoardFlowNodeData,
  config: ScenarioSequenceConfig,
): BoardFlowNodeData {
  const { inputs, outputs } = sequenceNodePins(config.thenCount);
  return {
    ...data,
    sequenceConfig: config,
    inputs,
    outputs,
  };
}

/** Удаляет рёбра с Then-пинов, которые больше не существуют. */
export function pruneSequenceThenEdges(
  edges: readonly Edge[],
  nodeId: string,
  thenCount: number,
): Edge[] {
  return edges.filter((edge) => {
    if (edge.source !== nodeId || edge.sourceHandle === null || edge.sourceHandle === undefined) {
      return true;
    }
    const index = parseSequenceThenIndex(edge.sourceHandle);
    if (index === null) {
      return true;
    }
    return index < thenCount && index < MAX_SCENARIO_SEQUENCE_THEN_COUNT;
  });
}
