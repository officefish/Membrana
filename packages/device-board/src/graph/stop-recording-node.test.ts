import { describe, expect, it } from 'vitest';

import {
  createStopRecordingBoardNode,
  stopRecordingNodePins,
  STOP_RECORDING_NODE_KIND,
} from './stop-recording-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('stop-recording-node (R1)', () => {
  it('defines exec + recorder in and exec + slice out', () => {
    const pins = stopRecordingNodePins();
    expect(pins.inputs.some((p) => p.name === 'recorder' && p.socketType === 'RecorderRef')).toBe(
      true,
    );
    expect(pins.outputs.some((p) => p.name === 'slice' && p.socketType === 'RecordingSliceRef')).toBe(
      true,
    );
  });

  it('factory sets nodeKind', () => {
    const node = createStopRecordingBoardNode({ id: 'stp-1' });
    const sub = serializeScenarioSubgraph('stp-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe(STOP_RECORDING_NODE_KIND);
  });
});
