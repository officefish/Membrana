import { describe, expect, it } from 'vitest';

import {
  createStartRecordingBoardNode,
  startRecordingNodePins,
  START_RECORDING_NODE_KIND,
} from './start-recording-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('start-recording-node (R1)', () => {
  it('defines exec + recorder + stream + optional policy in', () => {
    const pins = startRecordingNodePins();
    expect(pins.inputs.some((p) => p.name === 'recorder' && p.socketType === 'RecorderRef')).toBe(
      true,
    );
    expect(pins.inputs.some((p) => p.name === 'stream' && p.socketType === 'AudioStreamRef')).toBe(
      true,
    );
    expect(
      pins.inputs.some((p) => p.name === 'policy' && p.socketType === 'RecordingPolicy'),
    ).toBe(true);
    expect(pins.outputs.some((p) => p.name === 'recorder' && p.socketType === 'RecorderRef')).toBe(
      true,
    );
  });

  it('factory sets nodeKind and default recordingPolicy', () => {
    const node = createStartRecordingBoardNode({ id: 'sr-1' });
    const sub = serializeScenarioSubgraph('sr-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe(START_RECORDING_NODE_KIND);
    expect(restored.nodes[0]?.data.recordingPolicy).toMatchObject({
      windowSec: 5,
      captureFormat: 'wav',
    });
  });
});
