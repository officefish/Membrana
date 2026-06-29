import { describe, expect, it } from 'vitest';

import { formatSocketPortLabel } from './socket-port-label.js';
import {
  createSequenceBoardNode,
  pruneSequenceThenEdges,
  sequenceNodePins,
  sequenceThenHandle,
} from './sequence-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('sequence-node', () => {
  it('exposes Then 0..N-1 plus exec-out', () => {
    const pins = sequenceNodePins(3);
    expect(pins.inputs.map((pin) => pin.name)).toEqual(['exec-in']);
    expect(pins.outputs.map((pin) => pin.name)).toEqual(['then-0', 'then-1', 'then-2', 'exec-out']);
  });

  it('clamps then count to 1..9', () => {
    expect(sequenceNodePins(0).outputs).toHaveLength(2);
    expect(sequenceNodePins(12).outputs).toHaveLength(10);
  });

  it('formats Then pin labels as index', () => {
    expect(formatSocketPortLabel({ name: sequenceThenHandle(2), kind: 'exec' })).toBe('2');
  });

  it('round-trips sequenceConfig through serialize', () => {
    const node = createSequenceBoardNode({
      id: 'seq-1',
      sequenceConfig: { thenCount: 4, parallelAsync: true },
    });
    const sub = serializeScenarioSubgraph('seq-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    const data = restored.nodes[0]?.data as {
      nodeKind?: string;
      sequenceConfig?: { thenCount: number; parallelAsync: boolean };
      outputs?: { name: string }[];
    };
    expect(data.nodeKind).toBe('sequence');
    expect(data.sequenceConfig).toEqual({ thenCount: 4, parallelAsync: true, latentThen: false });
    expect(data.outputs?.map((pin) => pin.name)).toEqual([
      'then-0',
      'then-1',
      'then-2',
      'then-3',
      'exec-out',
    ]);
  });

  it('round-trips latentThen in sequenceConfig', () => {
    const node = createSequenceBoardNode({
      id: 'seq-latent',
      sequenceConfig: { thenCount: 2, latentThen: true },
    });
    const sub = serializeScenarioSubgraph('seq-latent', [node], []);
    expect(sub.nodes[0]?.sequenceConfig).toEqual({
      thenCount: 2,
      parallelAsync: false,
      latentThen: true,
    });
  });

  it('prunes edges from removed Then pins', () => {
    const edges = [
      {
        id: 'e1',
        source: 'seq',
        target: 'a',
        sourceHandle: 'then-0',
        targetHandle: 'exec-in',
      },
      {
        id: 'e2',
        source: 'seq',
        target: 'b',
        sourceHandle: 'then-2',
        targetHandle: 'exec-in',
      },
      {
        id: 'e3',
        source: 'seq',
        target: 'c',
        sourceHandle: 'exec-out',
        targetHandle: 'exec-in',
      },
    ];
    expect(pruneSequenceThenEdges(edges, 'seq', 2).map((edge) => edge.id)).toEqual(['e1', 'e3']);
  });
});
