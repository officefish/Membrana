import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/**
 * basn-5 (#323, консилиум 2026-07-09 т.4): узел MakeCombinedReport —
 * СИНХРОННЫЙ конструктор единого отчёта: 2 анализа (trends+ensemble) + трек →
 * ReportRef. Тяжёлую упаковку/выгрузку запускает host-runtime как async job
 * (`report-build`, существующий канал start-async-job) — НЕ узел: узлы stateless,
 * job с lifecycle внутри узла запрещён. Идемпотентность по хэшу входов — на
 * хосте (повторы alarm-loop не плодят дубли). Публикация — publish-report.
 */

export const MAKE_COMBINED_REPORT_NODE_KIND = 'make-combined-report' as const;

/** Data-вход ReporterRef. */
export const MAKE_COMBINED_REPORT_REPORTER_HANDLE = 'reporter' as const;

/** Data-входы анализов (union DetectionAnalysisRef): analysis-1 / analysis-2. */
export const MAKE_COMBINED_REPORT_ANALYSIS_1_HANDLE = 'analysis-1' as const;
export const MAKE_COMBINED_REPORT_ANALYSIS_2_HANDLE = 'analysis-2' as const;

/** Data-вход TrackRef (записанный трек детекции). */
export const MAKE_COMBINED_REPORT_TRACK_HANDLE = 'track' as const;

/** Data-выход ReportRef (единый combined-отчёт). */
export const MAKE_COMBINED_REPORT_OUT_HANDLE = 'report' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины MakeCombinedReport: exec + reporter + 2 анализа + track → report. */
export function makeCombinedReportNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: MAKE_COMBINED_REPORT_REPORTER_HANDLE,
        kind: 'data',
        socketType: 'ReporterRef',
      },
      {
        name: MAKE_COMBINED_REPORT_ANALYSIS_1_HANDLE,
        kind: 'data',
        socketType: 'DetectionAnalysisRef',
      },
      {
        name: MAKE_COMBINED_REPORT_ANALYSIS_2_HANDLE,
        kind: 'data',
        socketType: 'DetectionAnalysisRef',
      },
      {
        name: MAKE_COMBINED_REPORT_TRACK_HANDLE,
        kind: 'data',
        socketType: 'TrackRef',
      },
    ],
    outputs: [
      EXEC_OUT,
      {
        name: MAKE_COMBINED_REPORT_OUT_HANDLE,
        kind: 'data',
        socketType: 'ReportRef',
      },
    ],
  };
}

export interface CreateMakeCombinedReportBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let makeCombinedReportSeq = 0;

/** Узел MakeCombinedReport — 2 анализа + трек → единый ReportRef. */
export function createMakeCombinedReportBoardNode(
  options: CreateMakeCombinedReportBoardNodeOptions = {},
): Node {
  makeCombinedReportSeq += 1;
  const id =
    options.id ?? `node-make-combined-report-${Date.now().toString(36)}-${makeCombinedReportSeq}`;
  const { inputs, outputs } = makeCombinedReportNodePins();
  const data: BoardFlowNodeData = {
    label: 'MakeCombinedReport',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: MAKE_COMBINED_REPORT_NODE_KIND,
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

/** True, если узел — MakeCombinedReport. */
export function isMakeCombinedReportNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) && node.data.nodeKind === MAKE_COMBINED_REPORT_NODE_KIND
  );
}

/** True, если nodeKind — MakeCombinedReport. */
export function isMakeCombinedReportNodeKind(
  kind: string | undefined,
): kind is typeof MAKE_COMBINED_REPORT_NODE_KIND {
  return kind === MAKE_COMBINED_REPORT_NODE_KIND;
}
