import type { Node } from '@xyflow/react';

import type { ScenarioFunctionDraft } from './collapse-to-function.js';
import { functionPinsToSubgraphBlockPins } from './function-io-node.js';
import { isLockedBoardNode } from './event-node.js';
import { encodeSubgraphRef } from './subgraph-ref.js';

export interface InsertFunctionSubgraphBlockInput {
  readonly draft: Pick<
    ScenarioFunctionDraft,
    'id' | 'name' | 'inputPins' | 'outputPins'
  >;
  readonly branchNodes: readonly Node[];
}

export interface InsertFunctionSubgraphBlockResult {
  readonly ok: true;
  readonly node: Node;
}

export type InsertFunctionSubgraphBlockOutcome = InsertFunctionSubgraphBlockResult;

function nextSubgraphBlockId(functionId: string, nodes: readonly Node[]): string {
  const base = `${functionId}-block`;
  if (!nodes.some((node) => node.id === base)) {
    return base;
  }
  let seq = 2;
  while (nodes.some((node) => node.id === `${functionId}-block-${seq}`)) {
    seq += 1;
  }
  return `${functionId}-block-${seq}`;
}

function defaultInsertPosition(nodes: readonly Node[]): { readonly x: number; readonly y: number } {
  const movable = nodes.filter((node) => !isLockedBoardNode(node));
  if (movable.length === 0) {
    return { x: 240, y: 160 };
  }
  const maxY = Math.max(...movable.map((node) => node.position.y));
  return { x: 240, y: maxY + 120 };
}

/**
 * Добавляет subgraph-блок пользовательской функции на ветку сценария (без автосвязки exec).
 * Одна и та же функция может встречаться на ветке несколько раз — уникален id блока, не functionId.
 */
export function insertFunctionSubgraphBlock(
  input: InsertFunctionSubgraphBlockInput,
): InsertFunctionSubgraphBlockOutcome {
  const blockPins = functionPinsToSubgraphBlockPins(input.draft.inputPins, input.draft.outputPins);
  const nodeId = nextSubgraphBlockId(input.draft.id, input.branchNodes);
  const position = defaultInsertPosition(input.branchNodes);

  const node: Node = {
    id: nodeId,
    type: 'board',
    position,
    data: {
      label: encodeSubgraphRef(input.draft.name, input.draft.id),
      layer: 'scenario',
      status: 'active',
      blockKind: 'subgraph',
      functionId: input.draft.id,
      inputs: blockPins.inputs,
      outputs: blockPins.outputs,
    },
  };

  return { ok: true, node };
}
