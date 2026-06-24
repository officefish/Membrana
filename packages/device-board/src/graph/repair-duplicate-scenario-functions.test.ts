import { describe, expect, it } from 'vitest';

import {
  createDefaultFunctionExecInputPin,
  createDefaultFunctionExecOutputPin,
} from '@membrana/core';

import { createEmptyFunctionDraft } from './collapse-to-function.js';
import { repairDuplicateScenarioFunctionDrafts } from './repair-duplicate-scenario-functions.js';

describe('repairDuplicateScenarioFunctionDrafts', () => {
  it('reassigns duplicate function ids and subgraph blocks', () => {
    const first = createEmptyFunctionDraft('fn-1', 'Function 1');
    const second = createEmptyFunctionDraft('fn-1', 'Function 2');
    const main = {
      nodes: [
        {
          id: 'fn-1-block',
          type: 'board',
          position: { x: 0, y: 0 },
          data: { blockKind: 'subgraph', functionId: 'fn-1', label: 'Function 1' },
        },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'fn-1-block' }],
    };
    const alarm = {
      nodes: [
        {
          id: 'fn-1-block',
          type: 'board',
          position: { x: 10, y: 10 },
          data: { blockKind: 'subgraph', functionId: 'fn-1', label: 'Function 2' },
        },
      ],
      edges: [],
    };

    const repaired = repairDuplicateScenarioFunctionDrafts([first, second], [main, alarm]);

    expect(repaired).toHaveLength(2);
    expect(repaired[0]?.id).toBe('fn-1');
    expect(repaired[1]?.id).toBe('fn-2');
    expect(repaired[1]?.entry).toBe('fn-2-input');
    expect(main.nodes[0]?.id).toBe('fn-1-block');
    expect(alarm.nodes[0]?.id).toBe('fn-2-block');
    expect(alarm.nodes[0]?.data.functionId).toBe('fn-2');
    expect(alarm.edges).toEqual([]);
  });

  it('leaves unique ids unchanged', () => {
    const draft = {
      id: 'fn-9',
      name: 'Fn9',
      entry: 'fn-9-input',
      inputPins: [createDefaultFunctionExecInputPin()],
      outputPins: [createDefaultFunctionExecOutputPin()],
      nodes: [],
      edges: [],
    };
    const repaired = repairDuplicateScenarioFunctionDrafts([draft], [{ nodes: [], edges: [] }]);
    expect(repaired[0]?.id).toBe('fn-9');
  });
});
