import { describe, expect, it } from 'vitest';

import {
  createGetJournalBoardNode,
  GET_JOURNAL_DEVICE_HANDLE,
  GET_JOURNAL_OUT_HANDLE,
  GET_JOURNAL_SERVER_HANDLE,
  getJournalNodePins,
} from './get-journal-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('get-journal-node (DBJ1)', () => {
  it('defines exec + device|server in and exec + JournalRef out', () => {
    const pins = getJournalNodePins();
    expect(pins.inputs.find((pin) => pin.name === GET_JOURNAL_DEVICE_HANDLE)?.socketType).toBe(
      'DeviceRef',
    );
    expect(pins.inputs.find((pin) => pin.name === GET_JOURNAL_SERVER_HANDLE)?.socketType).toBe(
      'ServerRef',
    );
    expect(pins.outputs.find((pin) => pin.name === GET_JOURNAL_OUT_HANDLE)?.socketType).toBe(
      'JournalRef',
    );
    expect(pins.inputs.some((pin) => pin.name === 'exec-in')).toBe(true);
    expect(pins.outputs.some((pin) => pin.name === 'exec-out')).toBe(true);
  });

  it('round-trips through scenario subgraph serialization', () => {
    const node = createGetJournalBoardNode({ id: 'gj-1' });
    const sub = serializeScenarioSubgraph('gj-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe('get-journal');
    expect(restored.nodes[0]?.data.label).toBe('GetJournal');
  });
});
