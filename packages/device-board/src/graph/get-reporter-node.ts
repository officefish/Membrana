import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * GetReporter — JournalRef → ReporterRef scoped к journal.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §17
 */
export const GET_REPORTER_NODE_KIND = 'get-reporter' as const;

/** Data-вход JournalRef. */
export const GET_REPORTER_JOURNAL_HANDLE = 'journal' as const;

/** Data-выход ReporterRef. */
export const GET_REPORTER_OUT_HANDLE = 'reporter' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/**
 * Пины GetReporter:
 * - pure (default) — journal in, reporter out;
 * - impure — exec passthrough + data.
 */
export function getReporterNodePins(pure = true): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  const journalIn: BoardSocketPin = {
    name: GET_REPORTER_JOURNAL_HANDLE,
    kind: 'data',
    socketType: 'JournalRef',
  };
  const reporterOut: BoardSocketPin = {
    name: GET_REPORTER_OUT_HANDLE,
    kind: 'data',
    socketType: 'ReporterRef',
  };
  if (pure) {
    return { inputs: [journalIn], outputs: [reporterOut] };
  }
  return {
    inputs: [EXEC_IN, journalIn],
    outputs: [EXEC_OUT, reporterOut],
  };
}

export interface CreateGetReporterBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let getReporterSeq = 0;

/** Фабрика узла GetReporter. */
export function createGetReporterBoardNode(
  options: CreateGetReporterBoardNodeOptions = {},
): Node {
  getReporterSeq += 1;
  const id = options.id ?? `node-get-reporter-${Date.now().toString(36)}-${getReporterSeq}`;
  const { inputs, outputs } = getReporterNodePins();
  const data: BoardFlowNodeData = {
    label: 'GetReporter',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: GET_REPORTER_NODE_KIND,
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

/** True, если узел — GetReporter. */
export function isGetReporterNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === GET_REPORTER_NODE_KIND;
}
