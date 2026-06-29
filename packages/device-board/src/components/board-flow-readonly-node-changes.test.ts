import { describe, expect, it } from 'vitest';

import {
  filterStructureReadOnlyNodeChanges,
  isStructureReadOnlyPreservingNodeChange,
} from './board-flow-readonly-node-changes.js';

describe('board-flow-readonly-node-changes', () => {
  it('allows select and dimensions in structure read-only', () => {
    expect(isStructureReadOnlyPreservingNodeChange({ type: 'select', id: 'n1', selected: true })).toBe(
      true,
    );
    expect(
      isStructureReadOnlyPreservingNodeChange({
        type: 'dimensions',
        id: 'n1',
        dimensions: { width: 120, height: 48 },
        resizing: false,
      }),
    ).toBe(true);
  });

  it('blocks structural position/remove changes', () => {
    expect(
      isStructureReadOnlyPreservingNodeChange({
        type: 'position',
        id: 'n1',
        position: { x: 0, y: 0 },
        dragging: true,
      }),
    ).toBe(false);
    expect(isStructureReadOnlyPreservingNodeChange({ type: 'remove', id: 'n1' })).toBe(false);
  });

  it('filters mixed change batches', () => {
    const filtered = filterStructureReadOnlyNodeChanges([
      { type: 'select', id: 'n1', selected: true },
      { type: 'position', id: 'n1', position: { x: 1, y: 2 } },
      {
        type: 'dimensions',
        id: 'n2',
        dimensions: { width: 80, height: 40 },
        resizing: false,
      },
    ]);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((change) => change.type)).toEqual(['select', 'dimensions']);
  });
});
