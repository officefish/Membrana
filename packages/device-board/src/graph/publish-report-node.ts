import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * PublishReport — JournalRef + ReportRef → append в journal; exec passthrough.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §17
 */
export const PUBLISH_REPORT_NODE_KIND = 'publish-report' as const;

/** Data-вход JournalRef. */
export const PUBLISH_REPORT_JOURNAL_HANDLE = 'journal' as const;

/** Data-вход ReportRef. */
export const PUBLISH_REPORT_REPORT_HANDLE = 'report' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины PublishReport: exec passthrough + journal + report in. */
export function publishReportNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: PUBLISH_REPORT_JOURNAL_HANDLE,
        kind: 'data',
        socketType: 'JournalRef',
      },
      {
        name: PUBLISH_REPORT_REPORT_HANDLE,
        kind: 'data',
        socketType: 'ReportRef',
      },
    ],
    outputs: [EXEC_OUT],
  };
}

export interface CreatePublishReportBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let publishReportSeq = 0;

/** Фабрика узла PublishReport. */
export function createPublishReportBoardNode(
  options: CreatePublishReportBoardNodeOptions = {},
): Node {
  publishReportSeq += 1;
  const id =
    options.id ?? `node-publish-report-${Date.now().toString(36)}-${publishReportSeq}`;
  const { inputs, outputs } = publishReportNodePins();
  const data: BoardFlowNodeData = {
    label: 'PublishReport',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: PUBLISH_REPORT_NODE_KIND,
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

/** True, если узел — PublishReport. */
export function isPublishReportNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === PUBLISH_REPORT_NODE_KIND;
}
