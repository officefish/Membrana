import { describe, expect, it } from 'vitest';
import { createScenarioVariable } from '@membrana/core';

import { createVariableBoardNode } from './variable-node.js';
import { syncVariableNodeLabels } from './sync-variable-node-labels.js';

describe('syncVariableNodeLabels', () => {
  const variable = createScenarioVariable('var-1', 'device1', 'DeviceRef');
  const getNode = createVariableBoardNode('variable-get', variable, { id: 'get-1' });
  const setNode = createVariableBoardNode('variable-set', variable, { id: 'set-1' });

  it('updates label on all nodes bound to the variable', () => {
    const next = syncVariableNodeLabels([getNode, setNode], 'var-1', 'mainDevice');
    expect(next[0]?.data.label).toBe('mainDevice');
    expect(next[1]?.data.label).toBe('mainDevice');
  });

  it('leaves unrelated nodes unchanged', () => {
    const other = createVariableBoardNode('variable-get', {
      ...variable,
      id: 'var-2',
      name: 'other',
    }, { id: 'get-2' });
    const next = syncVariableNodeLabels([getNode, other], 'var-1', 'renamed');
    expect(next[1]?.data.label).toBe('other');
  });
});
