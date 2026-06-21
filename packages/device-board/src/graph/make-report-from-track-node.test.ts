import { describe, expect, it } from 'vitest';

import {
  createMakeReportFromTrackBoardNode,
  MAKE_REPORT_FROM_TRACK_OUT_HANDLE,
  MAKE_REPORT_FROM_TRACK_REPORTER_HANDLE,
  MAKE_REPORT_FROM_TRACK_TRACK_HANDLE,
  makeReportFromTrackNodePins,
} from './make-report-from-track-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('make-report-from-track-node (DBJ3)', () => {
  it('defines exec + ReporterRef + TrackRef in and exec + ReportRef out', () => {
    const pins = makeReportFromTrackNodePins();
    expect(
      pins.inputs.find((pin) => pin.name === MAKE_REPORT_FROM_TRACK_REPORTER_HANDLE)?.socketType,
    ).toBe('ReporterRef');
    expect(
      pins.inputs.find((pin) => pin.name === MAKE_REPORT_FROM_TRACK_TRACK_HANDLE)?.socketType,
    ).toBe('TrackRef');
    expect(
      pins.outputs.find((pin) => pin.name === MAKE_REPORT_FROM_TRACK_OUT_HANDLE)?.socketType,
    ).toBe('ReportRef');
    expect(pins.inputs.some((pin) => pin.name === 'exec-in')).toBe(true);
    expect(pins.outputs.some((pin) => pin.name === 'exec-out')).toBe(true);
  });

  it('round-trips through scenario subgraph serialization', () => {
    const node = createMakeReportFromTrackBoardNode({ id: 'mrt-1' });
    const sub = serializeScenarioSubgraph('mrt-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe('make-report-from-track');
    expect(restored.nodes[0]?.data.label).toBe('MakeReportFromTrack');
  });
});
