import { isReferenceSocketType } from '@membrana/core';

import type { BoardSocketPin } from './board-node-data.js';

/** Голубой — ссылочные типы (`& device`, `& microphone`). */
export const REFERENCE_SOCKET_HANDLE_CLASS = '!bg-sky-400';

/** Тёмный indigo — nullable / `& null`. */
export const NULL_SOCKET_HANDLE_CLASS = '!bg-indigo-800';

/** Exec-порты — нейтральный контраст темы. */
export const EXEC_SOCKET_HANDLE_CLASS = '!bg-base-content';

const HANDLE_BASE = '!h-2.5 !w-2.5 !border-2 !border-base-100';

/** CSS-класс handle по типу порта (палитра device-board, не только DaisyUI theme). */
export function socketHandleClass(pin: BoardSocketPin): string {
  if (pin.kind === 'exec') {
    return `${HANDLE_BASE} ${EXEC_SOCKET_HANDLE_CLASS}`;
  }
  if (pin.nullable === true) {
    return `${HANDLE_BASE} ${NULL_SOCKET_HANDLE_CLASS}`;
  }
  if (pin.socketType !== undefined && isReferenceSocketType(pin.socketType)) {
    return `${HANDLE_BASE} ${REFERENCE_SOCKET_HANDLE_CLASS}`;
  }
  return `${HANDLE_BASE} !bg-neutral`;
}
