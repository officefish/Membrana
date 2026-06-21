import { describe, expect, it } from 'vitest';

import {
  MAKE_RECORDING_POLICY_OUT_HANDLE,
  createMakeRecordingPolicyBoardNode,
  makeRecordingPolicyNodePins,
} from './make-recording-policy-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('make-recording-policy-node (v0.8)', () => {
  it('exposes RecordingPolicy data-out without exec pins', () => {
    const pins = makeRecordingPolicyNodePins();
    expect(pins.inputs).toEqual([]);
    expect(pins.outputs.find((p) => p.name === MAKE_RECORDING_POLICY_OUT_HANDLE)?.socketType).toBe(
      'RecordingPolicy',
    );
  });

  it('serializes with recordingPolicy config', () => {
    const node = createMakeRecordingPolicyBoardNode({
      id: 'mrp-1',
      recordingPolicy: { windowSec: 10, captureFormat: 'webm' },
    });
    const sub = serializeScenarioSubgraph('mrp-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe('make-recording-policy');
    expect(restored.nodes[0]?.data.recordingPolicy).toMatchObject({
      windowSec: 10,
      captureFormat: 'webm',
    });
  });
});
