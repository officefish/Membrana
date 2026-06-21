import { isReferenceSocketType, isValueSocketType } from '@membrana/core';

import type { BoardSocketPin } from './board-node-data.js';

/** Голубой — ссылочные типы (`& device`, `& microphone`). */
export const REFERENCE_SOCKET_HANDLE_CLASS = '!bg-sky-400';

/** Красный — DateTime. */
export const DATETIME_SOCKET_HANDLE_CLASS = '!bg-error';

/** Тёмно-синий — Integer. */
export const INTEGER_SOCKET_HANDLE_CLASS = '!bg-blue-900';

/** Оранжевый — String. */
export const STRING_SOCKET_HANDLE_CLASS = '!bg-orange-500';

/** Teal — RecordingPolicy. */
export const RECORDING_POLICY_SOCKET_HANDLE_CLASS = '!bg-teal-600';

/** Emerald — FftTrendsPolicy. */
export const FFT_TRENDS_POLICY_SOCKET_HANDLE_CLASS = '!bg-emerald-600';

/** Тёмный indigo — nullable / `& null`. */
export const NULL_SOCKET_HANDLE_CLASS = '!bg-indigo-800';

/** Exec-порты — нейтральный контраст темы. */
export const EXEC_SOCKET_HANDLE_CLASS = '!bg-base-content';

/** Event-порты Collect (квадратный handle, flush). */
export const EVENT_SOCKET_HANDLE_CLASS = '!bg-amber-400';

/** SVG stroke для event-рёбер. */
export const EVENT_EDGE_STROKE = '#fbbf24';
export const EVENT_EDGE_STROKE_WIDTH = 2;

/** SVG stroke для exec-рёбер. */
export const EXEC_EDGE_STROKE = 'oklch(var(--bc) / 0.5)';

/** SVG stroke для ссылочных data-рёбер (sky-400). */
export const REFERENCE_SOCKET_STROKE = '#38bdf8';

/** SVG stroke для DateTime data-рёбер. */
export const DATETIME_SOCKET_STROKE = '#f87171';

/** SVG stroke для Integer data-рёбер (blue-900). */
export const INTEGER_SOCKET_STROKE = '#1e3a8a';

/** SVG stroke для String data-рёбер (orange-500). */
export const STRING_SOCKET_STROKE = '#f97316';

/** SVG stroke для RecordingPolicy data-рёбер (teal-600). */
export const RECORDING_POLICY_SOCKET_STROKE = '#0d9488';

/** SVG stroke для FftTrendsPolicy data-рёбер (emerald-600). */
export const FFT_TRENDS_POLICY_SOCKET_STROKE = '#059669';

/** SVG stroke для nullable data-рёбер (indigo-800). */
export const NULL_SOCKET_STROKE = '#3730a3';

export const EXEC_EDGE_STROKE_WIDTH = 2.5;
export const DATA_EDGE_STROKE_WIDTH = 1.25;

const HANDLE_BASE = '!h-2.5 !w-2.5 !border-2 !border-base-100';

/** Цвет stroke data-ребра по SocketType источника. */
export function dataSocketStrokeColor(socketType?: BoardSocketPin['socketType']): string {
  if (socketType !== undefined && isReferenceSocketType(socketType)) {
    return REFERENCE_SOCKET_STROKE;
  }
  if (socketType === 'DateTime') {
    return DATETIME_SOCKET_STROKE;
  }
  if (socketType === 'Integer') {
    return INTEGER_SOCKET_STROKE;
  }
  if (socketType === 'String') {
    return STRING_SOCKET_STROKE;
  }
  if (socketType === 'RecordingPolicy') {
    return RECORDING_POLICY_SOCKET_STROKE;
  }
  if (socketType === 'FftTrendsPolicy') {
    return FFT_TRENDS_POLICY_SOCKET_STROKE;
  }
  return 'oklch(var(--bc) / 0.35)';
}

/** CSS-класс handle по типу порта (палитра device-board, не только DaisyUI theme). */
export function socketHandleClass(pin: BoardSocketPin): string {
  if (pin.kind === 'event') {
    return `${HANDLE_BASE} !rounded-sm !h-3 !w-3 ${EVENT_SOCKET_HANDLE_CLASS}`;
  }
  if (pin.kind === 'exec') {
    return `${HANDLE_BASE} ${EXEC_SOCKET_HANDLE_CLASS}`;
  }
  if (pin.nullable === true) {
    return `${HANDLE_BASE} ${NULL_SOCKET_HANDLE_CLASS}`;
  }
  if (pin.socketType !== undefined && isReferenceSocketType(pin.socketType)) {
    return `${HANDLE_BASE} ${REFERENCE_SOCKET_HANDLE_CLASS}`;
  }
  if (pin.socketType !== undefined && isValueSocketType(pin.socketType)) {
    if (pin.socketType === 'Integer') {
      return `${HANDLE_BASE} ${INTEGER_SOCKET_HANDLE_CLASS}`;
    }
    if (pin.socketType === 'String') {
      return `${HANDLE_BASE} ${STRING_SOCKET_HANDLE_CLASS}`;
    }
    if (pin.socketType === 'RecordingPolicy') {
      return `${HANDLE_BASE} ${RECORDING_POLICY_SOCKET_HANDLE_CLASS}`;
    }
    if (pin.socketType === 'FftTrendsPolicy') {
      return `${HANDLE_BASE} ${FFT_TRENDS_POLICY_SOCKET_HANDLE_CLASS}`;
    }
    return `${HANDLE_BASE} ${DATETIME_SOCKET_HANDLE_CLASS}`;
  }
  return `${HANDLE_BASE} !bg-neutral`;
}
