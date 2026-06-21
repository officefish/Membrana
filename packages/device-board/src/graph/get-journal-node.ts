import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * GetJournal — device или server scope → JournalRef (per deviceId).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §17
 */
export const GET_JOURNAL_NODE_KIND = 'get-journal' as const;

/** Data-вход DeviceRef → journal:device:{deviceId}. */
export const GET_JOURNAL_DEVICE_HANDLE = 'device' as const;

/** Data-вход ServerRef → journal:server:{deviceId} (deviceId из paired context). */
export const GET_JOURNAL_SERVER_HANDLE = 'server' as const;

/** Data-выход JournalRef. */
export const GET_JOURNAL_OUT_HANDLE = 'journal' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/**
 * Пины GetJournal:
 * - pure (default) — device | server in, journal out;
 * - impure — exec passthrough + data.
 */
export function getJournalNodePins(pure = true): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  const dataInputs: BoardSocketPin[] = [
    {
      name: GET_JOURNAL_DEVICE_HANDLE,
      kind: 'data',
      socketType: 'DeviceRef',
    },
    {
      name: GET_JOURNAL_SERVER_HANDLE,
      kind: 'data',
      socketType: 'ServerRef',
    },
  ];
  const journalOut: BoardSocketPin = {
    name: GET_JOURNAL_OUT_HANDLE,
    kind: 'data',
    socketType: 'JournalRef',
  };
  if (pure) {
    return { inputs: dataInputs, outputs: [journalOut] };
  }
  return {
    inputs: [EXEC_IN, ...dataInputs],
    outputs: [EXEC_OUT, journalOut],
  };
}

export interface CreateGetJournalBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let getJournalSeq = 0;

/** Фабрика узла GetJournal. */
export function createGetJournalBoardNode(
  options: CreateGetJournalBoardNodeOptions = {},
): Node {
  getJournalSeq += 1;
  const id = options.id ?? `node-get-journal-${Date.now().toString(36)}-${getJournalSeq}`;
  const { inputs, outputs } = getJournalNodePins();
  const data: BoardFlowNodeData = {
    label: 'GetJournal',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: GET_JOURNAL_NODE_KIND,
    inputs,
    outputs,
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — GetJournal. */
export function isGetJournalNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === GET_JOURNAL_NODE_KIND;
}
