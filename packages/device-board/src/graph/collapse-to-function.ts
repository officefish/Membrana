import type { Edge, Node } from '@xyflow/react';
import type { ScenarioFunctionPin, SocketType } from '@membrana/core';
import {
  MAX_SCENARIO_FUNCTION_PINS_PER_SIDE,
  createDefaultFunctionExecInputPin,
  createDefaultFunctionExecOutputPin,
} from '@membrana/core';

import {
  createFunctionInputBoardNode,
  createFunctionOutputBoardNode,
  functionPinsToSubgraphBlockPins,
} from './function-io-node.js';
import { isSystemNode, isEventNode } from './event-node.js';
import { isFunctionIoNode } from './function-io-node.js';
import { encodeSubgraphRef } from './subgraph-ref.js';

export interface ScenarioFunctionDraft {
  readonly id: string;
  readonly name: string;
  readonly entry: string;
  readonly description?: string;
  readonly inputPins: readonly ScenarioFunctionPin[];
  readonly outputPins: readonly ScenarioFunctionPin[];
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
}

export interface CollapseToFunctionInput {
  readonly selectedNodeIds: readonly string[];
  readonly branchNodes: readonly Node[];
  readonly branchEdges: readonly Edge[];
  readonly functionId?: string;
  readonly functionName?: string;
}

export interface CollapseToFunctionResult {
  readonly ok: true;
  readonly branchNodes: Node[];
  readonly branchEdges: Edge[];
  readonly functionDraft: ScenarioFunctionDraft;
  readonly subgraphBlockNodeId: string;
}

export interface CollapseToFunctionError {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
}

export type CollapseToFunctionOutcome = CollapseToFunctionResult | CollapseToFunctionError;

function isExecHandle(handle: string | null | undefined): boolean {
  return handle === 'exec-in' || handle === 'exec-out' || handle?.startsWith('exec') === true;
}

function inferSocketTypeFromEdge(edge: Edge, nodes: readonly Node[]): SocketType | undefined {
  const targetNode = nodes.find((node) => node.id === edge.target);
  const sourceNode = nodes.find((node) => node.id === edge.source);
  const targetData = targetNode?.data;
  const sourceData = sourceNode?.data;
  if (typeof targetData === 'object' && targetData !== null && 'inputs' in targetData) {
    const inputs = (targetData as { inputs?: readonly { name: string; socketType?: SocketType }[] }).inputs;
    const pin = inputs?.find((item) => item.name === edge.targetHandle);
    if (pin?.socketType !== undefined) {
      return pin.socketType;
    }
  }
  if (typeof sourceData === 'object' && sourceData !== null && 'outputs' in sourceData) {
    const outputs = (sourceData as { outputs?: readonly { name: string; socketType?: SocketType }[] }).outputs;
    const pin = outputs?.find((item) => item.name === edge.sourceHandle);
    if (pin?.socketType !== undefined) {
      return pin.socketType;
    }
  }
  return 'DeviceRef';
}

function uniquePinId(base: string, used: Set<string>): string {
  let candidate = base;
  let seq = 1;
  while (used.has(candidate)) {
    candidate = `${base}-${seq}`;
    seq += 1;
  }
  used.add(candidate);
  return candidate;
}

function nextFunctionId(existingIds: ReadonlySet<string>): string {
  let seq = 1;
  while (existingIds.has(`fn-${seq}`)) {
    seq += 1;
  }
  return `fn-${seq}`;
}

/**
 * Упаковывает marquee-выделение в пользовательскую функцию (CGF F1).
 * Pure transform: branch nodes/edges + новый function draft + subgraph block.
 */
export function collapseSelectionToFunction(input: CollapseToFunctionInput): CollapseToFunctionOutcome {
  const selected = new Set(input.selectedNodeIds);
  if (selected.size < 2) {
    return { ok: false, code: 'selection-too-small', message: 'Выберите минимум 2 узла' };
  }

  for (const nodeId of selected) {
    const node = input.branchNodes.find((item) => item.id === nodeId);
    if (node === undefined) {
      return { ok: false, code: 'missing-node', message: `Узел «${nodeId}» не найден` };
    }
    if (isSystemNode(node) || isEventNode(node) || isFunctionIoNode(node)) {
      return {
        ok: false,
        code: 'system-node-selected',
        message: 'Системные узлы нельзя объединять в функцию',
      };
    }
  }

  const internalEdges = input.branchEdges.filter(
    (edge) => selected.has(edge.source) && selected.has(edge.target),
  );
  const boundaryEdges = input.branchEdges.filter(
    (edge) => selected.has(edge.source) !== selected.has(edge.target),
  );

  const inputPins: ScenarioFunctionPin[] = [];
  const outputPins: ScenarioFunctionPin[] = [];
  const usedInputIds = new Set<string>();
  const usedOutputIds = new Set<string>();

  for (const edge of boundaryEdges) {
    const sourceInside = selected.has(edge.source);
    const handle = sourceInside ? edge.sourceHandle : edge.targetHandle;
    if (handle === null || handle === undefined) {
      continue;
    }
    if (isExecHandle(handle)) {
      if (sourceInside) {
        const id = uniquePinId('exec-out', usedOutputIds);
        outputPins.push({ id, name: id, kind: 'exec' });
      } else {
        const id = uniquePinId('exec-in', usedInputIds);
        inputPins.push({ id, name: id, kind: 'exec' });
      }
      continue;
    }
    const socketType = inferSocketTypeFromEdge(edge, input.branchNodes);
    if (sourceInside) {
      const id = uniquePinId(handle, usedOutputIds);
      outputPins.push({ id, name: handle, kind: 'data', socketType });
    } else {
      const id = uniquePinId(handle, usedInputIds);
      inputPins.push({ id, name: handle, kind: 'data', socketType });
    }
  }

  if (inputPins.length === 0) {
    inputPins.push(createDefaultFunctionExecInputPin());
  }
  if (outputPins.length === 0) {
    outputPins.push(createDefaultFunctionExecOutputPin());
  }

  if (
    inputPins.length > MAX_SCENARIO_FUNCTION_PINS_PER_SIDE ||
    outputPins.length > MAX_SCENARIO_FUNCTION_PINS_PER_SIDE
  ) {
    return {
      ok: false,
      code: 'pin-limit-exceeded',
      message: `Не более ${MAX_SCENARIO_FUNCTION_PINS_PER_SIDE} pins на Input и Output (D-PINS-9)`,
    };
  }

  const functionId = input.functionId ?? nextFunctionId(new Set());
  const functionName = input.functionName ?? `Function ${functionId}`;
  const inputNode = createFunctionInputBoardNode({
    id: `${functionId}-input`,
    position: { x: 40, y: 160 },
    inputPins,
  });
  const outputNode = createFunctionOutputBoardNode({
    id: `${functionId}-output`,
    position: { x: 520, y: 160 },
    outputPins,
  });

  const movedNodes = input.branchNodes
    .filter((node) => selected.has(node.id))
    .map((node) => ({
      ...node,
      position: {
        x: node.position.x - 120,
        y: node.position.y - 40,
      },
    }));

  const functionNodes: Node[] = [inputNode, outputNode, ...movedNodes];
  const functionEdges: Edge[] = [...internalEdges];

  const wireInputExec = inputPins.find((pin) => pin.kind === 'exec');
  const wireOutputExec = outputPins.find((pin) => pin.kind === 'exec');
  const firstInternalExecIn = movedNodes.find((node) => {
    const inputs = (node.data as { inputs?: readonly { name: string; kind: string }[] }).inputs;
    return inputs?.some((pin) => pin.kind === 'exec') === true;
  });
  const lastInternalExecOut = [...movedNodes].reverse().find((node) => {
    const outputs = (node.data as { outputs?: readonly { name: string; kind: string }[] }).outputs;
    return outputs?.some((pin) => pin.kind === 'exec') === true;
  });

  if (wireInputExec !== undefined && firstInternalExecIn !== undefined) {
    functionEdges.push({
      id: `${functionId}-e-in`,
      source: inputNode.id,
      sourceHandle: wireInputExec.id,
      target: firstInternalExecIn.id,
      targetHandle: 'exec-in',
    });
  }
  if (wireOutputExec !== undefined && lastInternalExecOut !== undefined) {
    functionEdges.push({
      id: `${functionId}-e-out`,
      source: lastInternalExecOut.id,
      sourceHandle: 'exec-out',
      target: outputNode.id,
      targetHandle: wireOutputExec.id,
    });
  }

  for (const edge of boundaryEdges) {
    const sourceInside = selected.has(edge.source);
    if (sourceInside) {
      const pin = outputPins.find((item) => item.name === edge.sourceHandle || item.id === edge.sourceHandle);
      if (pin !== undefined) {
        functionEdges.push({
          ...edge,
          id: `${functionId}-b-${edge.id}`,
          source: edge.source,
          sourceHandle: edge.sourceHandle,
          target: outputNode.id,
          targetHandle: pin.id,
        });
      }
    } else {
      const pin = inputPins.find((item) => item.name === edge.targetHandle || item.id === edge.targetHandle);
      if (pin !== undefined) {
        functionEdges.push({
          ...edge,
          id: `${functionId}-b-${edge.id}`,
          source: inputNode.id,
          sourceHandle: pin.id,
          target: edge.target,
          targetHandle: edge.targetHandle,
        });
      }
    }
  }

  const blockPins = functionPinsToSubgraphBlockPins(inputPins, outputPins);
  const subgraphBlockNodeId = `${functionId}-block`;
  const minX = Math.min(...input.branchNodes.filter((n) => selected.has(n.id)).map((n) => n.position.x));
  const minY = Math.min(...input.branchNodes.filter((n) => selected.has(n.id)).map((n) => n.position.y));
  const subgraphBlock: Node = {
    id: subgraphBlockNodeId,
    type: 'board',
    position: { x: minX, y: minY },
    data: {
      label: encodeSubgraphRef(functionName, functionId),
      layer: 'scenario',
      status: 'active',
      blockKind: 'subgraph',
      functionId,
      inputs: blockPins.inputs,
      outputs: blockPins.outputs,
    },
  };

  const remappedBranchEdges: Edge[] = [];
  for (const edge of input.branchEdges) {
    const sourceInside = selected.has(edge.source);
    const targetInside = selected.has(edge.target);
    if (sourceInside && targetInside) {
      continue;
    }
    if (sourceInside && !targetInside) {
      const pin = outputPins.find((item) => item.id === edge.sourceHandle || item.name === edge.sourceHandle);
      if (pin === undefined) {
        continue;
      }
      remappedBranchEdges.push({
        ...edge,
        source: subgraphBlockNodeId,
        sourceHandle: pin.id,
      });
      continue;
    }
    if (!sourceInside && targetInside) {
      const pin = inputPins.find((item) => item.id === edge.targetHandle || item.name === edge.targetHandle);
      if (pin === undefined) {
        continue;
      }
      remappedBranchEdges.push({
        ...edge,
        target: subgraphBlockNodeId,
        targetHandle: pin.id,
      });
      continue;
    }
    remappedBranchEdges.push(edge);
  }

  const branchNodes = [
    ...input.branchNodes.filter((node) => !selected.has(node.id)),
    subgraphBlock,
  ];
  const branchEdges = remappedBranchEdges;

  return {
    ok: true,
    branchNodes,
    branchEdges,
    subgraphBlockNodeId,
    functionDraft: {
      id: functionId,
      name: functionName,
      entry: inputNode.id,
      inputPins,
      outputPins,
      nodes: functionNodes,
      edges: functionEdges,
    },
  };
}

export function createEmptyFunctionDraft(id: string, name: string): ScenarioFunctionDraft {
  const inputNode = createFunctionInputBoardNode({ id: `${id}-input` });
  const outputNode = createFunctionOutputBoardNode({ id: `${id}-output` });
  const inputPins = [createDefaultFunctionExecInputPin()];
  const outputPins = [createDefaultFunctionExecOutputPin()];
  return {
    id,
    name,
    entry: inputNode.id,
    inputPins,
    outputPins,
    nodes: [inputNode, outputNode],
    edges: [],
  };
}
