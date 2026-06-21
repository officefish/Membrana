import type { SocketType } from '@membrana/core';
import { isReferenceSocketType } from '@membrana/core';

import type { BoardPinKind } from './board-node-data.js';

/** Tailwind-класс заливки индикатора типа сокета (сайдбар runtime, схема портов). */
export function socketTypeIndicatorClass(
  kind: BoardPinKind,
  socketType?: SocketType,
  nullable?: boolean,
): string {
  if (kind === 'exec') {
    return 'bg-base-content';
  }
  if (nullable === true) {
    return 'bg-indigo-800';
  }
  if (socketType !== undefined && isReferenceSocketType(socketType)) {
    return 'bg-sky-400';
  }
  if (socketType === 'DateTime') {
    return 'bg-error';
  }
  if (socketType === 'Integer') {
    return 'bg-blue-900';
  }
  if (socketType === 'String') {
    return 'bg-orange-500';
  }
  if (socketType === 'RecordingPolicy') {
    return 'bg-teal-600';
  }
  if (socketType === 'FftTrendsPolicy') {
    return 'bg-emerald-600';
  }
  return 'bg-neutral';
}
