import { describe, expect, it } from 'vitest';

import { createPaletteBoardNode } from './palette-node.js';
import { isValidBoardConnection } from './connection-validation.js';
import { COLLECT_EVENT_OUT_HANDLE } from './collect-node-shared.js';

describe('connection-validation event edges (DBC3)', () => {
  it('allows event-out from Collect to exec-in on print', () => {
    const collect = createPaletteBoardNode('collect-samples', { id: 'cs' });
    const print = createPaletteBoardNode('print', { id: 'p' });
    const nodes = [collect, print];
    expect(
      isValidBoardConnection(
        {
          source: 'cs',
          target: 'p',
          sourceHandle: COLLECT_EVENT_OUT_HANDLE,
          targetHandle: 'exec-in',
        },
        nodes,
        'scenario',
      ),
    ).toBe(true);
  });

  it('allows RecorderRef to collect-samples recorder input', () => {
    const getter = createPaletteBoardNode('get-recorder', { id: 'gr' });
    const collect = createPaletteBoardNode('collect-samples', { id: 'cs' });
    expect(
      isValidBoardConnection(
        {
          source: 'gr',
          target: 'cs',
          sourceHandle: 'recorder',
          targetHandle: 'recorder',
        },
        [getter, collect],
        'scenario',
      ),
    ).toBe(true);
  });
});
