import { isReferenceSocketType } from '@membrana/core';

import type { BoardSocketPin } from './board-node-data.js';

const REFERENCE_NOUN: Record<string, string> = {
  DeviceRef: 'device',
  MicrophoneRef: 'microphone',
};

/**
 * Человекочитаемая подпись data/exec-порта на ноде.
 * Ссылочные типы: префикс `&` (DeviceRef → `& device`).
 */
export function formatSocketPortLabel(pin: BoardSocketPin): string {
  if (pin.kind === 'exec') {
    return 'exec';
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
