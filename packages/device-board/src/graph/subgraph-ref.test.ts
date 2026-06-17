import { describe, expect, it } from 'vitest';

import { encodeSubgraphRef, parseSubgraphDisplayLabel, parseSubgraphFunctionId } from './subgraph-ref.js';

describe('subgraph-ref', () => {
  it('round-trips function id in subgraph label', () => {
    const node = {
      id: 'main-fn',
      blockKind: 'subgraph' as const,
      position: { x: 0, y: 0 },
      label: encodeSubgraphRef('Capture+Detect', 'fn-capture-detect'),
    };
    expect(parseSubgraphFunctionId(node)).toBe('fn-capture-detect');
    expect(parseSubgraphDisplayLabel(node)).toBe('Capture+Detect');
  });
});
