import type { ScenarioVariable, ScenarioVariableType } from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';

/** Вид узла переменной: чтение (get) или запись (set). */
export type VariableNodeKind = 'variable-get' | 'variable-set';

/** Имя handle ссылочного значения переменной (общий для get/set). */
export const VARIABLE_VALUE_HANDLE = 'value' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Короткий человекочитаемый лейбл ссылочного типа для бейджа/узла. */
export function referenceTypeLabel(type: ScenarioVariableType): string {
  return type === 'DeviceRef' ? 'Device' : 'Microphone';
}

/**
 * Пины узла переменной по её типу:
 * - `variable-get` — чистый источник данных: один data-выход `value`;
 * - `variable-set` — exec-проход + data-вход `value` + data-выход `value` (passthrough, DBR4).
 */
export function variableNodePins(
  kind: VariableNodeKind,
  type: ScenarioVariableType,
): { inputs: readonly BoardSocketPin[]; outputs: readonly BoardSocketPin[] } {
  const valuePin: BoardSocketPin = { name: VARIABLE_VALUE_HANDLE, kind: 'data', socketType: type };
  if (kind === 'variable-get') {
    return { inputs: [], outputs: [valuePin] };
  }
  return { inputs: [EXEC_IN, valuePin], outputs: [EXEC_OUT, valuePin] };
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
  const prefix = kind === 'variable-get' ? 'get' : 'set';
  const data: BoardFlowNodeData = {
    label: `${prefix} ${variable.name}`,
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
