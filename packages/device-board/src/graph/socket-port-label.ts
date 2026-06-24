import { isReferenceSocketType } from '@membrana/core';

import type { BoardSocketPin } from './board-node-data.js';
import {
  IS_VALID_FALSE_HANDLE,
  IS_VALID_TRUE_HANDLE,
} from './palette-node.js';

const REFERENCE_NOUN: Record<string, string> = {
  DeviceRef: 'device',
  MicrophoneRef: 'microphone',
  ServerRef: 'server',
  AudioStreamRef: 'audio stream',
  AudioSampleRef: 'audio sample',
  FftFrameRef: 'fft frame',
  RecorderRef: 'recorder',
  SpectralAnalyserRef: 'spectral analyser',
  AudioSampleRefList: 'sample batch',
  JournalRef: 'journal',
  ReporterRef: 'reporter',
  TrackRef: 'track',
  ReportRef: 'report',
  FftTrendAnalysisRef: 'fft trend analysis',
};

function formatSocketPortBase(pin: BoardSocketPin): string {
  if (pin.socketType !== undefined && isReferenceSocketType(pin.socketType)) {
    const noun = REFERENCE_NOUN[pin.socketType] ?? pin.socketType.toLowerCase();
    return `& ${noun}`;
  }
  if (pin.socketType !== undefined) {
    return pin.socketType.toLowerCase();
  }
  return pin.name;
}

/**
 * Человекочитаемая подпись data/exec-порта на ноде.
 * Ссылочные типы: префикс `&` (DeviceRef → `& device`).
 * Nullable / необязательный порт: суффикс ` ?` (как TypeScript optional).
 */
export function formatSocketPortLabel(pin: BoardSocketPin): string {
  if (pin.kind === 'event') {
    return 'event';
  }
  if (pin.kind === 'exec') {
    if (pin.name === IS_VALID_TRUE_HANDLE) {
      return 'true';
    }
    if (pin.name === IS_VALID_FALSE_HANDLE) {
      return 'false';
    }
    return 'exec';
  }
  if (pin.name === 'deltatime') {
    return 'deltatime';
  }
  if (pin.name === 'tickMs') {
    return 'tick ms';
  }
  const base = formatSocketPortBase(pin);
  if (pin.nullable === true) {
    if (pin.socketType === undefined && base === pin.name) {
      return 'any ?';
    }
    return `${base} ?`;
  }
  return base;
}
