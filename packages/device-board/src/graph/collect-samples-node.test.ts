import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENARIO_COLLECTOR_CONFIG } from '@membrana/core';

import {
  COLLECT_BATCH_OUT_HANDLE,
  COLLECT_EVENT_OUT_HANDLE,
} from './collect-node-shared.js';
import {
  collectSamplesNodePins,
  createCollectSamplesBoardNode,
} from './collect-samples-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('collect-samples-node (DBC3)', () => {
  it('defines exec + recorder + sample in and event + batch out', () => {
    const pins = collectSamplesNodePins();
    expect(pins.inputs.some((pin) => pin.name === 'recorder' && pin.socketType === 'RecorderRef')).toBe(
      true,
    );
    expect(pins.inputs.some((pin) => pin.name === 'sample' && pin.socketType === 'AudioSampleRef')).toBe(
      true,
    );
    expect(pins.outputs.find((pin) => pin.name === COLLECT_EVENT_OUT_HANDLE)?.kind).toBe('event');
    expect(pins.outputs.find((pin) => pin.name === COLLECT_BATCH_OUT_HANDLE)?.socketType).toBe(
      'AudioSampleRefList',
    );
  });

  it('round-trips collectorConfig through serialize', () => {
    const node = createCollectSamplesBoardNode({
      id: 'cs-1',
      collectorConfig: { ...DEFAULT_SCENARIO_COLLECTOR_CONFIG, queueCapacity: 5 },
    });
    const sub = serializeScenarioSubgraph('cs-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.collectorConfig?.queueCapacity).toBe(5);
  });
});
