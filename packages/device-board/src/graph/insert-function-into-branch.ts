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

export interface InsertFunctionSubgraphBlockError {
  readonly ok: false;
  readonly code: 'duplicate-block';
  readonly message: string;
}

export type InsertFunctionSubgraphBlockOutcome =
  | InsertFunctionSubgraphBlockResult
  | InsertFunctionSubgraphBlockError;

function isSubgraphBlockForFunction(node: Node, functionId: string): boolean {
  return node.data?.blockKind === 'subgraph' && node.data?.functionId === functionId;
}

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
 */
export function insertFunctionSubgraphBlock(
  input: InsertFunctionSubgraphBlockInput,
): InsertFunctionSubgraphBlockOutcome {
  if (input.branchNodes.some((node) => isSubgraphBlockForFunction(node, input.draft.id))) {
    return {
      ok: false,
      code: 'duplicate-block',
      message: `Функция «${input.draft.name}» уже есть на этой ветке`,
    };
  }

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
