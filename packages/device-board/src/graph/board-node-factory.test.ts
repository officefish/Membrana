import { describe, expect, it } from 'vitest';

import { createScenarioBoardNode } from './board-node-factory.js';
import { D0_SCENARIO_NODE_CATALOG } from './d0-node-catalog.js';

describe('createScenarioBoardNode (MP7b RT6)', () => {
  it('builds a scenario board node from the catalog template', () => {
    const node = createScenarioBoardNode('write-journal');
    expect(node.type).toBe('board');
    expect(node.data.layer).toBe('scenario');
    expect(node.data.blockKind).toBe('write-journal');
    expect(node.data.label).toBe(D0_SCENARIO_NODE_CATALOG['write-journal'].label);
  });

  it('generates unique ids for repeated palette adds', () => {
    const a = createScenarioBoardNode('record-chunk');
    const b = createScenarioBoardNode('record-chunk');
    expect(a.id).not.toBe(b.id);
  });

  it('honours explicit id, label and position overrides', () => {
    const node = createScenarioBoardNode('custom', {
      id: 'fixed-1',
      label: 'My block',
      position: { x: 10, y: 20 },
    });
    expect(node.id).toBe('fixed-1');
    expect(node.data.label).toBe('My block');
    expect(node.position).toEqual({ x: 10, y: 20 });
  });
});
