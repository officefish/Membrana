import type { Node } from '@xyflow/react';
import type { ScenarioFunctionPin } from '@membrana/core';
import {
  createDefaultFunctionExecInputPin,
  createDefaultFunctionExecOutputPin,
} from '@membrana/core';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

export const FUNCTION_INPUT_NODE_KIND = 'function-input' as const;
export const FUNCTION_OUTPUT_NODE_KIND = 'function-output' as const;

export const FUNCTION_INPUT_NODE_ID = 'fn-input' as const;
export const FUNCTION_OUTPUT_NODE_ID = 'fn-output' as const;

/** Преобразует pins функции в handles узла Input (outputs наружу внутрь функции). */
export function functionInputNodePins(inputPins: readonly ScenarioFunctionPin[]): {
  readonly inputs: readonly BoardSocketPin[];
  readonly outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [],
    outputs: inputPins.map((pin) => ({
      name: pin.id,
      kind: pin.kind,
      ...(pin.kind === 'data' && pin.socketType !== undefined ? { socketType: pin.socketType } : {}),
    })),
  };
}

/** Преобразует pins функции в handles узла Output (inputs изнутри функции наружу). */
export function functionOutputNodePins(outputPins: readonly ScenarioFunctionPin[]): {
  readonly inputs: readonly BoardSocketPin[];
  readonly outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: outputPins.map((pin) => ({
      name: pin.id,
      kind: pin.kind,
      ...(pin.kind === 'data' && pin.socketType !== undefined ? { socketType: pin.socketType } : {}),
    })),
    outputs: [],
  };
}

export interface CreateFunctionIoNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly inputPins?: readonly ScenarioFunctionPin[];
  readonly outputPins?: readonly ScenarioFunctionPin[];
}

/** System Input tunnel на function canvas. */
export function createFunctionInputBoardNode(options: CreateFunctionIoNodeOptions = {}): Node {
  const inputPins = options.inputPins ?? [createDefaultFunctionExecInputPin()];
  const pins = functionInputNodePins(inputPins);
  return {
    id: options.id ?? FUNCTION_INPUT_NODE_ID,
    type: 'board',
    position: options.position ?? { x: 40, y: 160 },
    data: {
      label: 'Input',
      layer: 'scenario',
      status: 'active',
      blockKind: 'custom',
      nodeKind: FUNCTION_INPUT_NODE_KIND,
      system: true,
      inputs: pins.inputs,
      outputs: pins.outputs,
    } satisfies BoardFlowNodeData,
  };
}

/** System Output tunnel на function canvas. */
export function createFunctionOutputBoardNode(options: CreateFunctionIoNodeOptions = {}): Node {
  const outputPins = options.outputPins ?? [createDefaultFunctionExecOutputPin()];
  const pins = functionOutputNodePins(outputPins);
  return {
    id: options.id ?? FUNCTION_OUTPUT_NODE_ID,
    type: 'board',
    position: options.position ?? { x: 480, y: 160 },
    data: {
      label: 'Output',
      layer: 'scenario',
      status: 'active',
      blockKind: 'custom',
      nodeKind: FUNCTION_OUTPUT_NODE_KIND,
      system: true,
      inputs: pins.inputs,
      outputs: pins.outputs,
    } satisfies BoardFlowNodeData,
  };
}

export function isFunctionInputNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === FUNCTION_INPUT_NODE_KIND;
}

export function isFunctionOutputNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === FUNCTION_OUTPUT_NODE_KIND;
}

export function isFunctionIoNode(node: Node): boolean {
  return isFunctionInputNode(node) || isFunctionOutputNode(node);
}

/** Синхронизирует handles IO-узлов с pins функции. */
export function syncFunctionIoNodePins(
  nodes: readonly Node[],
  inputPins: readonly ScenarioFunctionPin[],
  outputPins: readonly ScenarioFunctionPin[],
): Node[] {
  return nodes.map((node) => {
    if (isFunctionInputNode(node)) {
      const pins = functionInputNodePins(inputPins);
      return {
        ...node,
        data: {
          ...node.data,
          inputs: pins.inputs,
          outputs: pins.outputs,
        },
      };
    }
    if (isFunctionOutputNode(node)) {
      const pins = functionOutputNodePins(outputPins);
      return {
        ...node,
        data: {
          ...node.data,
          inputs: pins.inputs,
          outputs: pins.outputs,
        },
      };
    }
    return node;
  });
}

/** Преобразует pins функции в handles subgraph-блока на родительской ветке. */
export function functionPinsToSubgraphBlockPins(
  inputPins: readonly ScenarioFunctionPin[],
  outputPins: readonly ScenarioFunctionPin[],
): { readonly inputs: readonly BoardSocketPin[]; readonly outputs: readonly BoardSocketPin[] } {
  return {
    inputs: inputPins.map((pin) => ({
      name: pin.id,
      kind: pin.kind,
      ...(pin.kind === 'data' && pin.socketType !== undefined ? { socketType: pin.socketType } : {}),
    })),
    outputs: outputPins.map((pin) => ({
      name: pin.id,
      kind: pin.kind,
      ...(pin.kind === 'data' && pin.socketType !== undefined ? { socketType: pin.socketType } : {}),
    })),
  };
}
