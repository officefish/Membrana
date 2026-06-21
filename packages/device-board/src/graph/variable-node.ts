import type { ScenarioVariable, ScenarioVariableType } from '@membrana/core';
import { resolveScenarioGraphNodePure } from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** Вид узла переменной: чтение (get) или запись (set). */
export type VariableNodeKind = 'variable-get' | 'variable-set';

/** Имя handle ссылочного значения переменной (общий для get/set). */
export const VARIABLE_VALUE_HANDLE = 'value' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Короткий человекочитаемый лейбл типа переменной для бейджа/узла. */
export function referenceTypeLabel(type: ScenarioVariableType): string {
  if (type === 'DeviceRef') {
    return 'Device';
  }
  if (type === 'MicrophoneRef') {
    return 'Microphone';
  }
  if (type === 'ServerRef') {
    return 'Server';
  }
  if (type === 'JournalRef') {
    return 'Journal';
  }
  if (type === 'AudioStreamRef') {
    return 'AudioStream';
  }
  if (type === 'AudioSampleRef') {
    return 'AudioSample';
  }
  if (type === 'FftFrameRef') {
    return 'FftFrame';
  }
  if (type === 'Integer') {
    return 'Integer';
  }
  if (type === 'String') {
    return 'String';
  }
  if (type === 'RecordingPolicy') {
    return 'RecordingPolicy';
  }
  return 'DateTime';
}

/** Префикс автогенерируемого имени переменной (`journal1`, `device2`, …). */
export function defaultVariableNamePrefix(type: ScenarioVariableType): string {
  return referenceTypeLabel(type).toLowerCase();
}

/**
 * Пины узла переменной по её типу:
 * - `variable-get` pure (default) — только data-out `value`;
 * - `variable-get` impure — exec-in/out + data-out;
 * - `variable-set` — exec-проход + data-вход/выход `value`.
 */
export function variableNodePins(
  kind: VariableNodeKind,
  type: ScenarioVariableType,
  pureGetter = true,
): { inputs: readonly BoardSocketPin[]; outputs: readonly BoardSocketPin[] } {
  const valuePin: BoardSocketPin = {
    name: VARIABLE_VALUE_HANDLE,
    kind: 'data',
    socketType: type,
  };
  if (kind === 'variable-get') {
    if (pureGetter) {
      return { inputs: [], outputs: [valuePin] };
    }
    return { inputs: [EXEC_IN], outputs: [EXEC_OUT, valuePin] };
  }
  return { inputs: [EXEC_IN, valuePin], outputs: [EXEC_OUT, valuePin] };
}

/**
 * Обновляет пины variable-get/set после изменения схемы (nullable set, DateTime value).
 */
export function syncVariableNodePins(
  nodes: readonly Node[],
  variables: readonly ScenarioVariable[],
): Node[] {
  return nodes.map((node) => {
    if (!isBoardFlowNodeData(node.data)) {
      return node;
    }
    const kind = node.data.nodeKind;
    if (kind !== 'variable-get' && kind !== 'variable-set') {
      return node;
    }
    const variableId = node.data.variableId;
    if (variableId === undefined) {
      return node;
    }
    const variable = variables.find((item) => item.id === variableId);
    if (variable === undefined) {
      return node;
    }
    const pureGetter =
      kind === 'variable-get'
        ? resolveScenarioGraphNodePure({ nodeKind: kind, pure: node.data.pure })
        : false;
    const { inputs, outputs } = variableNodePins(kind, variable.type, pureGetter);
    return {
      ...node,
      data: {
        ...node.data,
        inputs,
        outputs,
      },
    };
  });
}

export interface CreateVariableBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let variableNodeSeq = 0;

/**
 * Фабрика узла переменной (`variable-get`/`variable-set`) для канваса.
 * `blockKind: 'custom'` — legacy-носитель формы; смысл узла несут
 * `nodeKind` + `variableId`. Пины типизированы ссылочным `SocketType`.
 */
export function createVariableBoardNode(
  kind: VariableNodeKind,
  variable: ScenarioVariable,
  options: CreateVariableBoardNodeOptions = {},
): Node {
  variableNodeSeq += 1;
  const id = options.id ?? `node-${kind}-${variable.id}-${Date.now().toString(36)}-${variableNodeSeq}`;
  const offset = (variableNodeSeq % 5) * 40;
  const { inputs, outputs } = variableNodePins(kind, variable.type);
  const data: BoardFlowNodeData = {
    label: variable.name,
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: kind,
    variableId: variable.id,
    inputs,
    outputs,
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 140 + offset, y: 160 + offset },
    data,
  };
}
