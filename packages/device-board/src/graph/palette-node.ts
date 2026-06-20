import type { ScenarioNodeKind } from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';

/** Data-вход произвольного значения для print / is-valid. */
export const PALETTE_VALUE_HANDLE = 'value' as const;

/** Data-выход String для print (текст, отправленный в консоль). */
export const PRINT_OUT_HANDLE = 'text' as const;

/** Data-вход DeviceRef для get-microphone. */
export const GET_MICROPHONE_DEVICE_HANDLE = 'device' as const;

/** Data-выход MicrophoneRef для get-microphone. */
export const GET_MICROPHONE_OUT_HANDLE = 'microphone' as const;

/** Data-вход MicrophoneRef для start/stop-streaming (опционально). */
export const STREAMING_MIC_HANDLE = 'microphone' as const;

/** @deprecated Используйте `STREAMING_MIC_HANDLE`. */
export const START_STREAMING_MIC_HANDLE = STREAMING_MIC_HANDLE;

/** Data-вход MicrophoneRef для stop-streaming. */
export const STOP_STREAMING_MIC_HANDLE = STREAMING_MIC_HANDLE;

/** Data-вход MicrophoneRef для get-audio-stream. */
export const GET_AUDIO_STREAM_MIC_HANDLE = STREAMING_MIC_HANDLE;

/** Data-выход AudioStreamRef для get-audio-stream. */
export const GET_AUDIO_STREAM_OUT_HANDLE = 'stream' as const;

/** Data-вход AudioStreamRef для get-sample. */
export const GET_SAMPLE_STREAM_HANDLE = 'stream' as const;

/** Data-выход AudioSampleRef для get-sample. */
export const GET_SAMPLE_OUT_HANDLE = 'sample' as const;

/** Data-вход AudioSampleRef для get-fft-frame. */
export const GET_FFT_FRAME_SAMPLE_HANDLE = 'sample' as const;

/** Data-выход FftFrameRef для get-fft-frame. */
export const GET_FFT_FRAME_OUT_HANDLE = 'frame' as const;

/** Exec-выход ветки «valid» для is-valid. */
export const IS_VALID_TRUE_HANDLE = 'exec-true-out' as const;

/** Exec-выход ветки «invalid» для is-valid. */
export const IS_VALID_FALSE_HANDLE = 'exec-false-out' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** v0.4 палитра: только эти nodeKind в правом сайдбаре по умолчанию. */
export const V04_PALETTE_NODE_KINDS = [
  'print',
  'is-valid',
  'get-microphone',
  'start-streaming',
  'stop-streaming',
  'get-audio-stream',
  'get-sample',
  'get-fft-frame',
] as const satisfies readonly ScenarioNodeKind[];

export type V04PaletteNodeKind = (typeof V04_PALETTE_NODE_KINDS)[number];

const V04_PALETTE_LABEL: Record<V04PaletteNodeKind, string> = {
  print: 'Print',
  'is-valid': 'isValid',
  'get-microphone': 'GetMicrophone',
  'start-streaming': 'StartStreaming',
  'stop-streaming': 'StopStreaming',
  'get-audio-stream': 'GetAudioStream',
  'get-sample': 'GetSample',
  'get-fft-frame': 'GetFFTFrame',
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
        outputs: [
          EXEC_OUT,
          { name: PRINT_OUT_HANDLE, kind: 'data', socketType: 'String' },
        ],
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
    case 'start-streaming':
      return {
        inputs: [
          EXEC_IN,
          { name: STREAMING_MIC_HANDLE, kind: 'data', socketType: 'MicrophoneRef' },
        ],
        outputs: [EXEC_OUT],
      };
    case 'stop-streaming':
      return {
        inputs: [
          EXEC_IN,
          { name: STOP_STREAMING_MIC_HANDLE, kind: 'data', socketType: 'MicrophoneRef' },
        ],
        outputs: [EXEC_OUT],
      };
    case 'get-audio-stream':
      return {
        inputs: [
          EXEC_IN,
          { name: GET_AUDIO_STREAM_MIC_HANDLE, kind: 'data', socketType: 'MicrophoneRef' },
        ],
        outputs: [
          EXEC_OUT,
          { name: GET_AUDIO_STREAM_OUT_HANDLE, kind: 'data', socketType: 'AudioStreamRef' },
        ],
      };
    case 'get-sample':
      return {
        inputs: [
          EXEC_IN,
          { name: GET_SAMPLE_STREAM_HANDLE, kind: 'data', socketType: 'AudioStreamRef' },
        ],
        outputs: [
          EXEC_OUT,
          { name: GET_SAMPLE_OUT_HANDLE, kind: 'data', socketType: 'AudioSampleRef' },
        ],
      };
    case 'get-fft-frame':
      return {
        inputs: [
          EXEC_IN,
          { name: GET_FFT_FRAME_SAMPLE_HANDLE, kind: 'data', socketType: 'AudioSampleRef' },
        ],
        outputs: [
          EXEC_OUT,
          { name: GET_FFT_FRAME_OUT_HANDLE, kind: 'data', socketType: 'FftFrameRef' },
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

/** Фабрика узла палитры v0.4. */
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

/** True, если узел — палитра v0.4. */
export function isPaletteNodeKind(value: string): value is V04PaletteNodeKind {
  return (V04_PALETTE_NODE_KINDS as readonly string[]).includes(value);
}
