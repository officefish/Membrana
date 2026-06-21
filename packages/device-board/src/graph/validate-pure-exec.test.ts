import { describe, expect, it } from 'vitest';
import { createScenarioVariable } from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import { createMakeRecordingPolicyBoardNode } from './make-recording-policy-node.js';
import { createVariableBoardNode } from './variable-node.js';
import { findPureExecEdgeHints } from './validate-pure-exec.js';
import { isPreRunValid } from './validate-pre-run.js';

describe('validate pure exec hints', () => {
  it('emits warning (non-blocking) for exec edge into pure policy constructor', () => {
    const policy = createMakeRecordingPolicyBoardNode({ id: 'pol-1' });
    const print: Node = {
      id: 'pr-1',
      type: 'board',
      position: { x: 0, y: 0 },
      data: {
        label: 'Print',
        layer: 'scenario',
        blockKind: 'custom',
        nodeKind: 'print',
        inputs: [{ name: 'exec-in', kind: 'exec' }],
        outputs: [{ name: 'exec-out', kind: 'exec' }],
      },
    };
    const edge: Edge = {
      id: 'e1',
      source: 'pol-1',
      sourceHandle: 'exec-out',
      target: 'pr-1',
      targetHandle: 'exec-in',
    };
    const issues = findPureExecEdgeHints([policy, print], [edge], 'scenario.loops.main.edges');
    expect(issues).toHaveLength(0);

    const execIn: Edge = {
      id: 'e2',
      source: 'pr-1',
      sourceHandle: 'exec-out',
      target: 'pol-1',
      targetHandle: 'exec-in',
    };
    const inbound = findPureExecEdgeHints([policy, print], [execIn], 'scenario.loops.main.edges');
    expect(inbound[0]?.code).toBe('pure-exec-edge-hint');
    expect(isPreRunValid(inbound)).toBe(true);
  });

  it('does not warn for impure variable-get with pure: false', () => {
    const variable = createScenarioVariable('v1', 'mic', 'MicrophoneRef');
    const getter = createVariableBoardNode('variable-get', variable, { id: 'vg-1' });
    getter.data = { ...getter.data, pure: false };
    const edge: Edge = {
      id: 'e1',
      source: 'evt',
      sourceHandle: 'exec-out',
      target: 'vg-1',
      targetHandle: 'exec-in',
    };
    const issues = findPureExecEdgeHints([getter], [edge], 'test');
    expect(issues).toHaveLength(0);
  });
});
