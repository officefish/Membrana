import { describe, expect, it } from 'vitest';

import {
  createMakeReportFromAnalysisBoardNode,
  MAKE_REPORT_FROM_ANALYSIS_ANALYSIS_HANDLE,
  MAKE_REPORT_FROM_ANALYSIS_OUT_HANDLE,
  MAKE_REPORT_FROM_ANALYSIS_REPORTER_HANDLE,
  makeReportFromAnalysisNodePins,
} from './make-report-from-analysis-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('make-report-from-analysis-node (DBJ3)', () => {
  it('defines exec + ReporterRef + FftTrendAnalysisRef in and exec + ReportRef out', () => {
    const pins = makeReportFromAnalysisNodePins();
    expect(
      pins.inputs.find((pin) => pin.name === MAKE_REPORT_FROM_ANALYSIS_REPORTER_HANDLE)?.socketType,
    ).toBe('ReporterRef');
    expect(
      pins.inputs.find((pin) => pin.name === MAKE_REPORT_FROM_ANALYSIS_ANALYSIS_HANDLE)?.socketType,
    ).toBe('FftTrendAnalysisRef');
    expect(
      pins.outputs.find((pin) => pin.name === MAKE_REPORT_FROM_ANALYSIS_OUT_HANDLE)?.socketType,
    ).toBe('ReportRef');
    expect(pins.inputs.some((pin) => pin.name === 'exec-in')).toBe(true);
    expect(pins.outputs.some((pin) => pin.name === 'exec-out')).toBe(true);
  });

  it('round-trips through scenario subgraph serialization', () => {
    const node = createMakeReportFromAnalysisBoardNode({ id: 'mra-1' });
    const sub = serializeScenarioSubgraph('mra-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe('make-report-from-analysis');
    expect(restored.nodes[0]?.data.label).toBe('MakeReportFromAnalysis');
  });
});
