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
};

/**
 * Человекочитаемая подпись data/exec-порта на ноде.
 * Ссылочные типы: префикс `&` (DeviceRef → `& device`).
 */
export function formatSocketPortLabel(pin: BoardSocketPin): string {
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
  if (pin.nullable === true) {
    return '& null';
  }
  if (pin.socketType !== undefined && isReferenceSocketType(pin.socketType)) {
    const noun = REFERENCE_NOUN[pin.socketType] ?? pin.socketType.toLowerCase();
    return `& ${noun}`;
  }
  if (pin.socketType !== undefined) {
    return pin.socketType.toLowerCase();
  }
  return pin.name;
}
