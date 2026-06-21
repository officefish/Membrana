import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * MakeReportFromAnalysis — ReporterRef + FftTrendAnalysisRef → ReportRef.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §17
 */
export const MAKE_REPORT_FROM_ANALYSIS_NODE_KIND = 'make-report-from-analysis' as const;

/** Data-вход ReporterRef. */
export const MAKE_REPORT_FROM_ANALYSIS_REPORTER_HANDLE = 'reporter' as const;

/** Data-вход FftTrendAnalysisRef. */
export const MAKE_REPORT_FROM_ANALYSIS_ANALYSIS_HANDLE = 'analysis' as const;

/** Data-выход ReportRef. */
export const MAKE_REPORT_FROM_ANALYSIS_OUT_HANDLE = 'report' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины MakeReportFromAnalysis: exec passthrough + reporter + analysis in, report out. */
export function makeReportFromAnalysisNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: MAKE_REPORT_FROM_ANALYSIS_REPORTER_HANDLE,
        kind: 'data',
        socketType: 'ReporterRef',
      },
      {
        name: MAKE_REPORT_FROM_ANALYSIS_ANALYSIS_HANDLE,
        kind: 'data',
        socketType: 'FftTrendAnalysisRef',
      },
    ],
    outputs: [
      EXEC_OUT,
      {
        name: MAKE_REPORT_FROM_ANALYSIS_OUT_HANDLE,
        kind: 'data',
        socketType: 'ReportRef',
      },
    ],
  };
}

export interface CreateMakeReportFromAnalysisBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let makeReportFromAnalysisSeq = 0;

/** Фабрика узла MakeReportFromAnalysis. */
export function createMakeReportFromAnalysisBoardNode(
  options: CreateMakeReportFromAnalysisBoardNodeOptions = {},
): Node {
  makeReportFromAnalysisSeq += 1;
  const id =
    options.id ??
    `node-make-report-analysis-${Date.now().toString(36)}-${makeReportFromAnalysisSeq}`;
  const { inputs, outputs } = makeReportFromAnalysisNodePins();
  const data: BoardFlowNodeData = {
    label: 'MakeReportFromAnalysis',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: MAKE_REPORT_FROM_ANALYSIS_NODE_KIND,
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

/** True, если узел — MakeReportFromAnalysis. */
export function isMakeReportFromAnalysisNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) &&
    node.data.nodeKind === MAKE_REPORT_FROM_ANALYSIS_NODE_KIND
  );
}
