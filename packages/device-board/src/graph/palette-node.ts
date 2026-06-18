import type { ScenarioNodeKind } from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';

/** Data-вход ссылочного значения (DeviceRef или MicrophoneRef). */
export const PALETTE_VALUE_HANDLE = 'value' as const;

/** Data-вход DeviceRef для get-microphone. */
export const GET_MICROPHONE_DEVICE_HANDLE = 'device' as const;

/** Data-выход MicrophoneRef для get-microphone. */
export const GET_MICROPHONE_OUT_HANDLE = 'microphone' as const;

/** Exec-выход ветки «valid» для is-valid. */
export const IS_VALID_TRUE_HANDLE = 'exec-true-out' as const;

/** Exec-выход ветки «invalid» для is-valid. */
export const IS_VALID_FALSE_HANDLE = 'exec-false-out' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** v0.4 палитра: только эти nodeKind в правом сайдбаре по умолчанию. */
export const V04_PALETTE_NODE_KINDS = ['print', 'is-valid', 'get-microphone'] as const satisfies readonly ScenarioNodeKind[];

export type V04PaletteNodeKind = (typeof V04_PALETTE_NODE_KINDS)[number];

const V04_PALETTE_LABEL: Record<V04PaletteNodeKind, string> = {
  print: 'Print',
  'is-valid': 'isValid',
  'get-microphone': 'GetMicrophone',
};

/** Человекочитаемый лейбл палитры v0.4. */
export function paletteNodeLabel(nodeKind: V04PaletteNodeKind): string {
  return V04_PALETTE_LABEL[nodeKind];
}

/** Пины узла палитры v0.4 по `nodeKind`. */
export function paletteNodePins(nodeKind: V04PaletteNodeKind): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  switch (nodeKind) {
    case 'print':
      return {
        inputs: [EXEC_IN, { name: PALETTE_VALUE_HANDLE, kind: 'data' }],
        outputs: [EXEC_OUT],
      };
    case 'is-valid':
      return {
        inputs: [EXEC_IN, { name: PALETTE_VALUE_HANDLE, kind: 'data' }],
        outputs: [
          { name: IS_VALID_TRUE_HANDLE, kind: 'exec' },
          { name: IS_VALID_FALSE_HANDLE, kind: 'exec' },
        ],
      };
    case 'get-microphone':
      return {
        inputs: [
          EXEC_IN,
          { name: GET_MICROPHONE_DEVICE_HANDLE, kind: 'data', socketType: 'DeviceRef' },
        ],
        outputs: [
          EXEC_OUT,
          { name: GET_MICROPHONE_OUT_HANDLE, kind: 'data', socketType: 'MicrophoneRef' },
        ],
      };
  }
}

export interface CreatePaletteBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly microphoneId?: string;
}

let paletteNodeSeq = 0;

/** Фабрика узла палитры v0.4 (`print` / `is-valid` / `get-microphone`). */
export function createPaletteBoardNode(
  nodeKind: V04PaletteNodeKind,
  options: CreatePaletteBoardNodeOptions = {},
): Node {
  paletteNodeSeq += 1;
  const id = options.id ?? `node-${nodeKind}-${Date.now().toString(36)}-${paletteNodeSeq}`;
  const offset = (paletteNodeSeq % 5) * 40;
  const { inputs, outputs } = paletteNodePins(nodeKind);
  const data: BoardFlowNodeData = {
    label: paletteNodeLabel(nodeKind),
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind,
    inputs,
    outputs,
    ...(options.microphoneId !== undefined ? { microphoneId: options.microphoneId } : {}),
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 120 + offset, y: 120 + offset },
    data,
  };
}

/** True, если узел — палитра v0.4 (print / is-valid / get-microphone). */
export function isPaletteNodeKind(value: string): value is V04PaletteNodeKind {
  return (V04_PALETTE_NODE_KINDS as readonly string[]).includes(value);
}
