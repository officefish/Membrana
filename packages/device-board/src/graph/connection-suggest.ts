import {
  isReferenceSocketType,
  isValidSocketConnection,
  isValueSocketType,
  type SocketType,
} from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardSocketPin } from './board-node-data.js';
import { DEVICE_GLOBAL_NODE_KIND } from './device-global-node.js';
import { GET_RECORDER_DEVICE_HANDLE } from './get-recorder-node.js';
import { GET_JOURNAL_DEVICE_HANDLE, GET_JOURNAL_SERVER_HANDLE } from './get-journal-node.js';
import { GET_REPORTER_JOURNAL_HANDLE } from './get-reporter-node.js';
import {
  MAKE_REPORT_FROM_ANALYSIS_REPORTER_HANDLE,
} from './make-report-from-analysis-node.js';
import {
  MAKE_REPORT_FROM_TRACK_REPORTER_HANDLE,
} from './make-report-from-track-node.js';
import {
  PUBLISH_REPORT_JOURNAL_HANDLE,
  PUBLISH_REPORT_REPORT_HANDLE,
} from './publish-report-node.js';
import { COLLECT_FFT_ANALYSER_HANDLE } from './collect-fft-frames-node.js';
import { COLLECT_SAMPLES_RECORDER_HANDLE } from './collect-samples-node.js';
import {
  MAKE_FFT_TRENDS_ANALYSER_HANDLE,
} from './make-fft-trends-analysis-node.js';
import { MAKE_TRACK_RECORDER_HANDLE, MAKE_TRACK_SLICE_HANDLE } from './make-track-node.js';
import { START_RECORDING_RECORDER_HANDLE, START_RECORDING_STREAM_HANDLE } from './start-recording-node.js';
import { STOP_RECORDING_RECORDER_HANDLE } from './stop-recording-node.js';
import {
  IS_RECORDING_WINDOW_FULL_RECORDER_HANDLE,
} from './is-recording-window-full-node.js';
import { FLUSH_SPECTRAL_ANALYSER_HANDLE } from './flush-spectral-analyser-node.js';
import {
  GET_SPECTRAL_ANALYSER_DEVICE_HANDLE,
} from './get-spectral-analyser-node.js';
import {
  GET_MICROPHONE_DEVICE_HANDLE,
  IS_VALID_FALSE_HANDLE,
  IS_VALID_TRUE_HANDLE,
  PALETTE_VALUE_HANDLE,
  paletteNodeLabel,
  paletteNodePins,
  V04_PALETTE_NODE_KINDS,
  type V04PaletteNodeKind,
} from './palette-node.js';
import { resolveBoardNodeOutputPin } from './scenario-node-pins.js';
import { STOP_RUNTIME_DEVICE_HANDLE } from './stop-runtime-node.js';

/** Предложение узла палитры при «бросании» ребра на канвас. */
export interface PaletteConnectionSuggestion {
  readonly nodeKind: V04PaletteNodeKind;
  readonly label: string;
  readonly targetHandle: string;
}

const EXEC_SOURCE_HANDLES = new Set([
  'exec-out',
  IS_VALID_TRUE_HANDLE,
  IS_VALID_FALSE_HANDLE,
]);

/** Узлы-приёмники, которые не имеют смысла как target от DeviceRef. */
const SKIP_TARGET_FOR_DEVICE_REF = new Set<V04PaletteNodeKind>([DEVICE_GLOBAL_NODE_KIND]);

/** Методы устройства для DeviceRef (из документации nodeKind). */
export const DEVICE_REF_METHOD_TARGETS = [
  { nodeKind: 'get-microphone' as const, targetHandle: GET_MICROPHONE_DEVICE_HANDLE },
  { nodeKind: 'get-recorder' as const, targetHandle: GET_RECORDER_DEVICE_HANDLE },
  {
    nodeKind: 'get-spectral-analyser' as const,
    targetHandle: GET_SPECTRAL_ANALYSER_DEVICE_HANDLE,
  },
  { nodeKind: 'stop-runtime' as const, targetHandle: STOP_RUNTIME_DEVICE_HANDLE },
  { nodeKind: 'get-journal' as const, targetHandle: GET_JOURNAL_DEVICE_HANDLE },
] as const;

/** Методы для ServerRef (DBJ1). */
export const SERVER_REF_METHOD_TARGETS = [
  { nodeKind: 'get-journal' as const, targetHandle: GET_JOURNAL_SERVER_HANDLE },
] as const;

/** Методы для JournalRef (DBJ2). */
export const JOURNAL_REF_METHOD_TARGETS = [
  { nodeKind: 'get-reporter' as const, targetHandle: GET_REPORTER_JOURNAL_HANDLE },
  { nodeKind: 'publish-report' as const, targetHandle: PUBLISH_REPORT_JOURNAL_HANDLE },
] as const;

/** Методы для ReporterRef (DBJ3). */
export const REPORTER_REF_METHOD_TARGETS = [
  {
    nodeKind: 'make-report-from-track' as const,
    targetHandle: MAKE_REPORT_FROM_TRACK_REPORTER_HANDLE,
  },
  {
    nodeKind: 'make-report-from-analysis' as const,
    targetHandle: MAKE_REPORT_FROM_ANALYSIS_REPORTER_HANDLE,
  },
] as const;

/** Методы для ReportRef (DBJ4). */
export const REPORT_REF_METHOD_TARGETS = [
  { nodeKind: 'publish-report' as const, targetHandle: PUBLISH_REPORT_REPORT_HANDLE },
] as const;

/** Методы для RecorderRef (MakeTrack, CollectSamples, recording gate v0.7). */
export const RECORDER_REF_METHOD_TARGETS = [
  { nodeKind: 'start-recording' as const, targetHandle: START_RECORDING_RECORDER_HANDLE },
  { nodeKind: 'stop-recording' as const, targetHandle: STOP_RECORDING_RECORDER_HANDLE },
  {
    nodeKind: 'is-recording-window-full' as const,
    targetHandle: IS_RECORDING_WINDOW_FULL_RECORDER_HANDLE,
  },
  { nodeKind: 'make-track' as const, targetHandle: MAKE_TRACK_RECORDER_HANDLE },
  { nodeKind: 'collect-samples' as const, targetHandle: COLLECT_SAMPLES_RECORDER_HANDLE },
] as const;

/** Методы для AudioStreamRef (StartRecording). */
export const AUDIO_STREAM_REF_METHOD_TARGETS = [
  { nodeKind: 'start-recording' as const, targetHandle: START_RECORDING_STREAM_HANDLE },
] as const;

/** Методы для RecordingSliceRef (MakeTrack v0.7). */
export const RECORDING_SLICE_REF_METHOD_TARGETS = [
  { nodeKind: 'make-track' as const, targetHandle: MAKE_TRACK_SLICE_HANDLE },
] as const;

/** Методы для SpectralAnalyserRef (MakeFftTrendsAnalysis, CollectFftFrames). */
export const SPECTRAL_ANALYSER_REF_METHOD_TARGETS = [
  {
    nodeKind: 'make-fft-trends-analysis' as const,
    targetHandle: MAKE_FFT_TRENDS_ANALYSER_HANDLE,
  },
  { nodeKind: 'collect-fft-frames' as const, targetHandle: COLLECT_FFT_ANALYSER_HANDLE },
  { nodeKind: 'flush-spectral-analyser' as const, targetHandle: FLUSH_SPECTRAL_ANALYSER_HANDLE },
] as const;

function pinAcceptsSource(
  source: { readonly pinKind: 'exec' | 'data'; readonly socketType?: SocketType },
  pin: BoardSocketPin,
): boolean {
  if (pin.kind === 'event') {
    return false;
  }
  if (source.pinKind === 'exec' && pin.kind === 'exec' && pin.name === 'exec-in') {
    return true;
  }
  if (source.pinKind !== 'data' || pin.kind !== 'data') {
    return false;
  }
  if (
    pin.name === PALETTE_VALUE_HANDLE &&
    source.socketType !== undefined &&
    (isReferenceSocketType(source.socketType) || isValueSocketType(source.socketType))
  ) {
    return true;
  }
  if (source.socketType === undefined || pin.socketType === undefined) {
    return false;
  }
  return isValidSocketConnection(source.socketType, pin.socketType);
}

function resolveSourceNode(
  nodes: readonly Node[],
  sourceNodeId: string,
  sourceNode?: Node,
): Node | undefined {
  if (sourceNode !== undefined && sourceNode.id === sourceNodeId) {
    return sourceNode;
  }
  return nodes.find((node) => node.id === sourceNodeId);
}

function resolveSourcePin(
  nodes: readonly Node[],
  sourceNodeId: string,
  sourceHandle: string,
  sourceNode?: Node,
): { readonly pinKind: 'exec' | 'data'; readonly socketType?: SocketType } | null {
  const node = resolveSourceNode(nodes, sourceNodeId, sourceNode);
  if (node === undefined) {
    return null;
  }

  const outputPin = resolveBoardNodeOutputPin(node, sourceHandle);
  if (outputPin !== undefined) {
    if (outputPin.kind === 'event') {
      return null;
    }
    return { pinKind: outputPin.kind, socketType: outputPin.socketType };
  }

  return null;
}

function suggestPaletteTarget(
  nodeKind: V04PaletteNodeKind,
  sourceResolved: { readonly pinKind: 'exec' | 'data'; readonly socketType?: SocketType },
): PaletteConnectionSuggestion | null {
  if (sourceResolved.pinKind === 'data' && sourceResolved.socketType === 'DeviceRef') {
    if (SKIP_TARGET_FOR_DEVICE_REF.has(nodeKind)) {
      return null;
    }
  }

  const { inputs } = paletteNodePins(nodeKind);
  for (const pin of inputs) {
    if (pinAcceptsSource(sourceResolved, pin)) {
      return {
        nodeKind,
        label: paletteNodeLabel(nodeKind),
        targetHandle: pin.name,
      };
    }
  }
  return null;
}

function suggestFromResolved(sourceResolved: {
  readonly pinKind: 'exec' | 'data';
  readonly socketType?: SocketType;
}): readonly PaletteConnectionSuggestion[] {
  const results: PaletteConnectionSuggestion[] = [];

  for (const nodeKind of V04_PALETTE_NODE_KINDS) {
    const suggestion = suggestPaletteTarget(nodeKind, sourceResolved);
    if (suggestion !== null) {
      results.push(suggestion);
    }
  }

  return results;
}

/**
 * Список узлов палитры v0.4, совместимых с исходящим портом (exec/data).
 * Пины источника и приёмников берутся из канонической схемы nodeKind.
 */
export function suggestPaletteNodesForOutgoingConnection(
  nodes: readonly Node[],
  sourceNodeId: string,
  sourceHandle: string,
  options: { readonly sourceNode?: Node } = {},
): readonly PaletteConnectionSuggestion[] {
  const sourceResolved = resolveSourcePin(
    nodes,
    sourceNodeId,
    sourceHandle,
    options.sourceNode,
  );
  if (sourceResolved === null) {
    return [];
  }
  if (sourceResolved.pinKind === 'exec' && !EXEC_SOURCE_HANDLES.has(sourceHandle)) {
    return [];
  }
  return suggestFromResolved(sourceResolved);
}
