import type { ScenarioNodeKind } from '@membrana/core';
import { DEFAULT_FFT_TRENDS_POLICY, DEFAULT_SCENARIO_COLLECTOR_CONFIG, DEFAULT_RECORDING_POLICY, DEFAULT_SCENARIO_SEQUENCE_CONFIG, resolveScenarioSequenceConfig } from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { deviceGlobalNodePins, DEVICE_GLOBAL_NODE_KIND } from './device-global-node.js';
import { getRecorderNodePins } from './get-recorder-node.js';
import { getJournalNodePins } from './get-journal-node.js';
import { getReporterNodePins } from './get-reporter-node.js';
import { makeReportFromAnalysisNodePins } from './make-report-from-analysis-node.js';
import { makeReportFromTrackNodePins } from './make-report-from-track-node.js';
import { publishReportNodePins } from './publish-report-node.js';
import { getSpectralAnalyserNodePins } from './get-spectral-analyser-node.js';
import { collectSamplesNodePins } from './collect-samples-node.js';
import { collectFftFramesNodePins } from './collect-fft-frames-node.js';
import { makeTrackNodePins } from './make-track-node.js';
import { makeFftTrendsAnalysisNodePins } from './make-fft-trends-analysis-node.js';
import { stopRuntimeNodePins } from './stop-runtime-node.js';
import { pauseRuntimeNodePins } from './pause-runtime-node.js';
import { sequenceNodePins } from './sequence-node.js';
import { makeRecordingPolicyNodePins } from './make-recording-policy-node.js';
import { makeFftTrendsPolicyNodePins } from './make-fft-trends-policy-node.js';
import { startRecordingNodePins } from './start-recording-node.js';
import { stopRecordingNodePins } from './stop-recording-node.js';
import { isRecordingWindowFullNodePins } from './is-recording-window-full-node.js';
import { flushSpectralAnalyserNodePins } from './flush-spectral-analyser-node.js';

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

/** Data-выход AudioStreamRef для get-audio-stream и start-streaming. */
export const GET_AUDIO_STREAM_OUT_HANDLE = 'stream' as const;

/** Data-вход AudioStreamRef для get-sample. */
export const GET_SAMPLE_STREAM_HANDLE = 'stream' as const;

/** Data-выход AudioSampleRef для get-sample. */
export const GET_SAMPLE_OUT_HANDLE = 'sample' as const;

/** Data-вход AudioSampleRef для get-fft-frame. */
export const GET_FFT_FRAME_SAMPLE_HANDLE = 'sample' as const;

/** Data-выход FftFrameRef для get-fft-frame. */
export const GET_FFT_FRAME_OUT_HANDLE = 'frame' as const;

export {
  GET_RECORDER_DEVICE_HANDLE,
  GET_RECORDER_OUT_HANDLE,
} from './get-recorder-node.js';
export {
  GET_JOURNAL_DEVICE_HANDLE,
  GET_JOURNAL_SERVER_HANDLE,
  GET_JOURNAL_OUT_HANDLE,
} from './get-journal-node.js';
export {
  GET_REPORTER_JOURNAL_HANDLE,
  GET_REPORTER_OUT_HANDLE,
} from './get-reporter-node.js';
export {
  GET_SPECTRAL_ANALYSER_DEVICE_HANDLE,
  GET_SPECTRAL_ANALYSER_OUT_HANDLE,
} from './get-spectral-analyser-node.js';

/** Exec-выход ветки «valid» для is-valid. */
export const IS_VALID_TRUE_HANDLE = 'exec-true-out' as const;

/** Exec-выход ветки «invalid» для is-valid. */
export const IS_VALID_FALSE_HANDLE = 'exec-false-out' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** v0.4 палитра: только эти nodeKind в правом сайдбаре по умолчанию. */
export const V04_PALETTE_NODE_KINDS = [
  'device-global',
  'stop-runtime',
  'pause-runtime',
  'sequence',
  'print',
  'is-valid',
  'get-microphone',
  'get-recorder',
  'get-spectral-analyser',
  'start-streaming',
  'stop-streaming',
  'get-audio-stream',
  'get-sample',
  'get-fft-frame',
  'collect-samples',
  'collect-fft-frames',
  'start-recording',
  'stop-recording',
  'is-recording-window-full',
  'flush-spectral-analyser',
  'make-recording-policy',
  'make-fft-trends-policy',
  'make-track',
  'make-fft-trends-analysis',
  'get-journal',
  'get-reporter',
  'make-report-from-track',
  'make-report-from-analysis',
  'publish-report',
] as const satisfies readonly ScenarioNodeKind[];

export type V04PaletteNodeKind = (typeof V04_PALETTE_NODE_KINDS)[number];

const V04_PALETTE_LABEL: Record<V04PaletteNodeKind, string> = {
  'device-global': 'GetDevice',
  'stop-runtime': 'StopRuntime',
  'pause-runtime': 'PauseRuntime',
  sequence: 'Sequence',
  print: 'Print',
  'is-valid': 'isValid',
  'get-microphone': 'GetMicrophone',
  'get-recorder': 'GetRecorder',
  'get-spectral-analyser': 'GetSpectralAnalyser',
  'start-streaming': 'StartStreaming',
  'stop-streaming': 'StopStreaming',
  'get-audio-stream': 'GetAudioStream',
  'get-sample': 'GetSample',
  'get-fft-frame': 'GetFFTFrame',
  'collect-samples': 'CollectSamples',
  'collect-fft-frames': 'CollectFftFrames',
  'start-recording': 'StartRecording',
  'stop-recording': 'StopRecording',
  'is-recording-window-full': 'IsRecordingWindowFull',
  'flush-spectral-analyser': 'FlushSpectralAnalyser',
  'make-recording-policy': 'MakeRecordingPolicy',
  'make-fft-trends-policy': 'MakeFftTrendsPolicy',
  'make-track': 'MakeTrack',
  'make-fft-trends-analysis': 'MakeFftTrendsAnalysis',
  'get-journal': 'GetJournal',
  'get-reporter': 'GetReporter',
  'make-report-from-track': 'MakeReportFromTrack',
  'make-report-from-analysis': 'MakeReportFromAnalysis',
  'publish-report': 'PublishReport',
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
    case 'device-global':
      return deviceGlobalNodePins();
    case 'stop-runtime':
      return stopRuntimeNodePins();
    case 'pause-runtime':
      return pauseRuntimeNodePins();
    case 'sequence':
      return sequenceNodePins(DEFAULT_SCENARIO_SEQUENCE_CONFIG.thenCount);
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
    case 'get-recorder':
      return getRecorderNodePins();
    case 'get-spectral-analyser':
      return getSpectralAnalyserNodePins();
    case 'start-streaming':
      return {
        inputs: [
          EXEC_IN,
          { name: STREAMING_MIC_HANDLE, kind: 'data', socketType: 'MicrophoneRef' },
        ],
        outputs: [
          EXEC_OUT,
          { name: GET_AUDIO_STREAM_OUT_HANDLE, kind: 'data', socketType: 'AudioStreamRef' },
        ],
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
    case 'collect-samples':
      return collectSamplesNodePins();
    case 'collect-fft-frames':
      return collectFftFramesNodePins();
    case 'start-recording':
      return startRecordingNodePins();
    case 'stop-recording':
      return stopRecordingNodePins();
    case 'is-recording-window-full':
      return isRecordingWindowFullNodePins();
    case 'flush-spectral-analyser':
      return flushSpectralAnalyserNodePins();
    case 'make-recording-policy':
      return makeRecordingPolicyNodePins();
    case 'make-fft-trends-policy':
      return makeFftTrendsPolicyNodePins();
    case 'make-track':
      return makeTrackNodePins();
    case 'make-fft-trends-analysis':
      return makeFftTrendsAnalysisNodePins();
    case 'get-journal':
      return getJournalNodePins();
    case 'get-reporter':
      return getReporterNodePins();
    case 'make-report-from-track':
      return makeReportFromTrackNodePins();
    case 'make-report-from-analysis':
      return makeReportFromAnalysisNodePins();
    case 'publish-report':
      return publishReportNodePins();
  }
}

export interface CreatePaletteBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly microphoneId?: string;
  readonly collectorConfig?: BoardFlowNodeData['collectorConfig'];
  readonly recordingPolicy?: BoardFlowNodeData['recordingPolicy'];
  readonly fftTrendsPolicy?: BoardFlowNodeData['fftTrendsPolicy'];
  readonly sequenceConfig?: BoardFlowNodeData['sequenceConfig'];
}

let paletteNodeSeq = 0;

/** Фабрика узла палитры v0.4. */
export function createPaletteBoardNode(
  nodeKind: V04PaletteNodeKind,
  options: CreatePaletteBoardNodeOptions = {},
): Node {
  paletteNodeSeq += 1;
  const id = options.id ?? `node-${nodeKind}-${Date.now().toString(36)}-${paletteNodeSeq}`;
  const sequenceConfig =
    nodeKind === 'sequence'
      ? resolveScenarioSequenceConfig({
          ...DEFAULT_SCENARIO_SEQUENCE_CONFIG,
          ...options.sequenceConfig,
        })
      : undefined;
  const { inputs, outputs } =
    nodeKind === 'sequence' && sequenceConfig !== undefined
      ? sequenceNodePins(sequenceConfig.thenCount)
      : paletteNodePins(nodeKind);
  const data: BoardFlowNodeData = {
    label: paletteNodeLabel(nodeKind),
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind,
    inputs,
    outputs,
    ...(nodeKind === DEVICE_GLOBAL_NODE_KIND
      ? { system: true as const }
      : {}),
    ...(options.microphoneId !== undefined ? { microphoneId: options.microphoneId } : {}),
    ...(nodeKind === 'collect-samples' || nodeKind === 'collect-fft-frames'
      ? {
          collectorConfig: {
            ...DEFAULT_SCENARIO_COLLECTOR_CONFIG,
            ...options.collectorConfig,
          },
        }
      : {}),
    ...(nodeKind === 'start-recording' ||
    nodeKind === 'is-recording-window-full' ||
    nodeKind === 'make-recording-policy'
      ? {
          recordingPolicy: {
            ...DEFAULT_RECORDING_POLICY,
            ...options.recordingPolicy,
          },
        }
      : {}),
    ...(nodeKind === 'make-fft-trends-policy'
      ? {
          fftTrendsPolicy: {
            ...DEFAULT_FFT_TRENDS_POLICY,
            ...options.fftTrendsPolicy,
          },
        }
      : {}),
    ...(nodeKind === 'sequence' && sequenceConfig !== undefined
      ? { sequenceConfig }
      : {}),
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — палитра v0.4. */
export function isPaletteNodeKind(value: string): value is V04PaletteNodeKind {
  return (V04_PALETTE_NODE_KINDS as readonly string[]).includes(value);
}
