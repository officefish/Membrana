import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * MakeReportFromTrack — ReporterRef + TrackRef → ReportRef (in-memory payload).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §17
 */
export const MAKE_REPORT_FROM_TRACK_NODE_KIND = 'make-report-from-track' as const;

/** Data-вход ReporterRef. */
export const MAKE_REPORT_FROM_TRACK_REPORTER_HANDLE = 'reporter' as const;

/** Data-вход TrackRef. */
export const MAKE_REPORT_FROM_TRACK_TRACK_HANDLE = 'track' as const;

/** Data-выход ReportRef. */
export const MAKE_REPORT_FROM_TRACK_OUT_HANDLE = 'report' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины MakeReportFromTrack: exec passthrough + reporter + track in, report out. */
export function makeReportFromTrackNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: MAKE_REPORT_FROM_TRACK_REPORTER_HANDLE,
        kind: 'data',
        socketType: 'ReporterRef',
      },
      {
        name: MAKE_REPORT_FROM_TRACK_TRACK_HANDLE,
        kind: 'data',
        socketType: 'TrackRef',
      },
    ],
    outputs: [
      EXEC_OUT,
      {
        name: MAKE_REPORT_FROM_TRACK_OUT_HANDLE,
        kind: 'data',
        socketType: 'ReportRef',
      },
    ],
  };
}

export interface CreateMakeReportFromTrackBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let makeReportFromTrackSeq = 0;

/** Фабрика узла MakeReportFromTrack. */
export function createMakeReportFromTrackBoardNode(
  options: CreateMakeReportFromTrackBoardNodeOptions = {},
): Node {
  makeReportFromTrackSeq += 1;
  const id =
    options.id ??
    `node-make-report-track-${Date.now().toString(36)}-${makeReportFromTrackSeq}`;
  const { inputs, outputs } = makeReportFromTrackNodePins();
  const data: BoardFlowNodeData = {
    label: 'MakeReportFromTrack',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: MAKE_REPORT_FROM_TRACK_NODE_KIND,
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

/** True, если узел — MakeReportFromTrack. */
export function isMakeReportFromTrackNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) &&
    node.data.nodeKind === MAKE_REPORT_FROM_TRACK_NODE_KIND
  );
}
