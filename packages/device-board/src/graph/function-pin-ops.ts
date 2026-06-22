import type { Edge, Node } from '@xyflow/react';
import type { ScenarioFunctionPin, SocketType } from '@membrana/core';
import {
  MAX_SCENARIO_FUNCTION_PINS_PER_SIDE,
  isScenarioFunctionPinCountValid,
} from '@membrana/core';

import { functionPinsToSubgraphBlockPins } from './function-io-node.js';
import { encodeSubgraphRef } from './subgraph-ref.js';

export type FunctionPinSide = 'input' | 'output';

function slugPinId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'pin';
}

function uniquePinId(base: string, existing: ReadonlySet<string>): string {
  if (!existing.has(base)) {
    return base;
  }
  let seq = 2;
  while (existing.has(`${base}-${seq}`)) {
    seq += 1;
  }
  return `${base}-${seq}`;
}

export interface ProposeNewFunctionPinResult {
  readonly pin: ScenarioFunctionPin;
}

export interface FunctionPinOpError {
  readonly error: string;
}

/** Предлагает новый pin для добавления на сторону (D-PINS-9). */
export function proposeNewFunctionPin(
  side: FunctionPinSide,
  kind: 'exec' | 'data',
  existing: readonly ScenarioFunctionPin[],
): ProposeNewFunctionPinResult | FunctionPinOpError {
  if (!isScenarioFunctionPinCountValid(existing.length + 1)) {
    return { error: `Не более ${MAX_SCENARIO_FUNCTION_PINS_PER_SIDE} pins на ${side === 'input' ? 'Input' : 'Output'}` };
  }
  if (kind === 'exec') {
    return { error: 'Дополнительные exec pins не поддерживаются' };
  }
  const ids = new Set(existing.map((pin) => pin.id));
  const base = side === 'input' ? 'data-in' : 'data-out';
  const id = uniquePinId(base, ids);
  const defaultSocket: SocketType = 'DeviceRef';
  return { pin: { id, name: id, kind: 'data', socketType: defaultSocket } };
}

export function removeFunctionPinFromList(
  pins: readonly ScenarioFunctionPin[],
  pinId: string,
): readonly ScenarioFunctionPin[] | FunctionPinOpError {
  if (pins.length <= 1) {
    return { error: 'На каждой стороне должен остаться минимум один pin' };
  }
  const pin = pins.find((candidate) => candidate.id === pinId);
  if (pin?.kind === 'exec') {
    return { error: 'Exec pin нельзя удалить' };
  }
  const next = pins.filter((candidate) => candidate.id !== pinId);
  if (next.length === pins.length) {
    return { error: 'Pin не найден' };
  }
  return next;
}

export interface UpdateFunctionPinInListResult {
  readonly pins: readonly ScenarioFunctionPin[];
  readonly renamedFrom?: string;
  readonly renamedTo?: string;
}

/** Обновляет pin; при смене имени пересчитывает id и сообщает rename для remap edges. */
export function updateFunctionPinInList(
  pins: readonly ScenarioFunctionPin[],
  pinId: string,
  patch: {
    readonly name?: string;
    readonly kind?: 'exec' | 'data';
    readonly socketType?: SocketType;
  },
): UpdateFunctionPinInListResult | FunctionPinOpError {
  const index = pins.findIndex((pin) => pin.id === pinId);
  if (index < 0) {
    return { error: 'Pin не найден' };
  }
  const current = pins[index]!;
  if (current.kind === 'exec' && patch.kind !== undefined && patch.kind !== 'exec') {
    return { error: 'Тип exec pin нельзя изменить' };
  }
  const nextName = patch.name !== undefined ? patch.name.trim() : current.name;
  if (nextName.length === 0) {
    return { error: 'Имя pin не может быть пустым' };
  }
  const nextKind = patch.kind ?? current.kind;
  const nextSocketType =
    nextKind === 'data'
      ? (patch.socketType ?? current.socketType ?? ('DeviceRef' as SocketType))
      : undefined;

  const siblingIds = new Set(pins.filter((_, itemIndex) => itemIndex !== index).map((pin) => pin.id));
  let nextId = current.id;
  let renamedFrom: string | undefined;
  let renamedTo: string | undefined;
  if (patch.name !== undefined) {
    const slug = slugPinId(nextName);
    nextId = uniquePinId(slug, siblingIds);
    if (nextId !== current.id) {
      renamedFrom = current.id;
      renamedTo = nextId;
    }
  }

  const updated: ScenarioFunctionPin = {
    id: nextId,
    name: nextName,
    kind: nextKind,
    ...(nextKind === 'data' && nextSocketType !== undefined ? { socketType: nextSocketType } : {}),
  };
  const nextPins = pins.map((pin, itemIndex) => (itemIndex === index ? updated : pin));
  return { pins: nextPins, renamedFrom, renamedTo };
}

/** Удаляет edges function canvas, связанные с удалёнными handles. */
export function stripFunctionCanvasEdgesForPins(
  edges: readonly Edge[],
  inputNodeId: string,
  outputNodeId: string,
  removedInputPinIds: ReadonlySet<string>,
  removedOutputPinIds: ReadonlySet<string>,
): Edge[] {
  return edges.filter((edge) => {
    if (edge.source === inputNodeId && removedInputPinIds.has(edge.sourceHandle ?? '')) {
      return false;
    }
    if (edge.target === outputNodeId && removedOutputPinIds.has(edge.targetHandle ?? '')) {
      return false;
    }
    return true;
  });
}

/** Переименовывает handle на function canvas. */
export function remapFunctionCanvasEdgeHandles(
  edges: readonly Edge[],
  inputNodeId: string,
  outputNodeId: string,
  side: FunctionPinSide,
  renamedFrom: string,
  renamedTo: string,
): Edge[] {
  return edges.map((edge) => {
    if (side === 'input' && edge.source === inputNodeId && edge.sourceHandle === renamedFrom) {
      return { ...edge, sourceHandle: renamedTo };
    }
    if (side === 'output' && edge.target === outputNodeId && edge.targetHandle === renamedFrom) {
      return { ...edge, targetHandle: renamedTo };
    }
    return edge;
  });
}

function isSubgraphBlockForFunction(node: Node, functionId: string): boolean {
  return node.data?.blockKind === 'subgraph' && node.data?.functionId === functionId;
}

/** Обновляет subgraph-блоки и чистит edges на всех ветках. */
export function syncSubgraphBlocksForFunctionPins(input: {
  readonly functionId: string;
  readonly functionName: string;
  readonly inputPins: readonly ScenarioFunctionPin[];
  readonly outputPins: readonly ScenarioFunctionPin[];
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
  readonly removedInputPinIds: ReadonlySet<string>;
  readonly removedOutputPinIds: ReadonlySet<string>;
  readonly renames: readonly { readonly side: FunctionPinSide; readonly from: string; readonly to: string }[];
}): { readonly nodes: Node[]; readonly edges: Edge[] } {
  const blockPins = functionPinsToSubgraphBlockPins(input.inputPins, input.outputPins);
  const nodes = input.nodes.map((node) => {
    if (!isSubgraphBlockForFunction(node, input.functionId)) {
      return node;
    }
    return {
      ...node,
      data: {
        ...node.data,
        label: encodeSubgraphRef(input.functionName, input.functionId),
        inputs: blockPins.inputs,
        outputs: blockPins.outputs,
      },
    };
  });

  let edges = [...input.edges];
  for (const node of input.nodes) {
    if (!isSubgraphBlockForFunction(node, input.functionId)) {
      continue;
    }
    const blockId = node.id;
    edges = edges.filter((edge) => {
      if (edge.target === blockId && input.removedInputPinIds.has(edge.targetHandle ?? '')) {
        return false;
      }
      if (edge.source === blockId && input.removedOutputPinIds.has(edge.sourceHandle ?? '')) {
        return false;
      }
      return true;
    });
    for (const rename of input.renames) {
      edges = edges.map((edge) => {
        if (rename.side === 'input' && edge.target === blockId && edge.targetHandle === rename.from) {
          return { ...edge, targetHandle: rename.to };
        }
        if (rename.side === 'output' && edge.source === blockId && edge.sourceHandle === rename.from) {
          return { ...edge, sourceHandle: rename.to };
        }
        return edge;
      });
    }
  }

  return { nodes, edges };
}

export function findFunctionIoNodeIds(nodes: readonly Node[]): {
  readonly inputNodeId: string | null;
  readonly outputNodeId: string | null;
} {
  let inputNodeId: string | null = null;
  let outputNodeId: string | null = null;
  for (const node of nodes) {
    if (node.data?.nodeKind === 'function-input') {
      inputNodeId = node.id;
    }
    if (node.data?.nodeKind === 'function-output') {
      outputNodeId = node.id;
    }
  }
  return { inputNodeId, outputNodeId };
}
