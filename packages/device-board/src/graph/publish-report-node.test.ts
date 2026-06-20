import { describe, expect, it } from 'vitest';

import {
  createPublishReportBoardNode,
  PUBLISH_REPORT_JOURNAL_HANDLE,
  PUBLISH_REPORT_REPORT_HANDLE,
  publishReportNodePins,
} from './publish-report-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('publish-report-node (DBJ4)', () => {
  it('defines exec-in + JournalRef + ReportRef in and no outputs (terminal)', () => {
    const pins = publishReportNodePins();
    expect(
      pins.inputs.find((pin) => pin.name === PUBLISH_REPORT_JOURNAL_HANDLE)?.socketType,
    ).toBe('JournalRef');
    expect(
      pins.inputs.find((pin) => pin.name === PUBLISH_REPORT_REPORT_HANDLE)?.socketType,
    ).toBe('ReportRef');
    expect(pins.inputs.some((pin) => pin.name === 'exec-in')).toBe(true);
    expect(pins.outputs).toEqual([]);
  });

  it('round-trips through scenario subgraph serialization', () => {
    const node = createPublishReportBoardNode({ id: 'pr-1' });
    const sub = serializeScenarioSubgraph('pr-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe('publish-report');
    expect(restored.nodes[0]?.data.label).toBe('PublishReport');
  });
});
