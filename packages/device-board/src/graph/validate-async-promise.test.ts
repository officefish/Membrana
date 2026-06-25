import { describe, expect, it } from 'vitest';
import type { Edge } from '@xyflow/react';

import { ASYNC_PROMISE_REF_HANDLE } from './async-orchestration-nodes.js';
import { createPaletteBoardNode } from './palette-node.js';
import { createSequenceBoardNode } from './sequence-node.js';
import {
  findPromiseRefMissingIssues,
  findPromiseRefPreRunIssues,
  findSequenceLatentThenGateIssues,
  findSequenceLatentThenPreRunIssues,
} from './validate-async-promise.js';

function edge(
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
): Edge {
  return {
    id: `${source}->${target}`,
    source,
    sourceHandle,
    target,
    targetHandle,
  };
}

describe('validate-async-promise', () => {
  it('flags await-promise without promise input', () => {
    const awaitNode = createPaletteBoardNode('await-promise', { id: 'await' });
    const issues = findPromiseRefMissingIssues([awaitNode], []);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.nodeKind).toBe('await-promise');
  });

  it('allows await-promise with promise ref edge', () => {
    const start = createPaletteBoardNode('start-async-job', { id: 'start' });
    const awaitNode = createPaletteBoardNode('await-promise', { id: 'await' });
    const edges = [
      edge('start', ASYNC_PROMISE_REF_HANDLE, 'await', ASYNC_PROMISE_REF_HANDLE),
    ];
    expect(findPromiseRefMissingIssues([start, awaitNode], edges)).toHaveLength(0);
  });

  it('flags impure node on latent Then branch', () => {
    const seq = createSequenceBoardNode({
      id: 'seq',
      sequenceConfig: { thenCount: 1, latentThen: true },
    });
    const print = createPaletteBoardNode('print', { id: 'print' });
    const edges = [edge('seq', 'then-0', 'print', 'exec-in')];
    const issues = findSequenceLatentThenGateIssues([seq, print], edges);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.nodeKind).toBe('print');
  });

  it('allows pause-runtime on latent Then branch', () => {
    const seq = createSequenceBoardNode({
      id: 'seq',
      sequenceConfig: { thenCount: 1, latentThen: true },
    });
    const pause = createPaletteBoardNode('pause-runtime', { id: 'pause' });
    const edges = [edge('seq', 'then-0', 'pause', 'exec-in')];
    expect(findSequenceLatentThenGateIssues([seq, pause], edges)).toHaveLength(0);
  });

  it('maps pre-run issues with paths', () => {
    const awaitNode = createPaletteBoardNode('await-promise', { id: 'await' });
    const issues = findPromiseRefPreRunIssues([awaitNode], [], 'scenario.main.edges');
    expect(issues[0]).toMatchObject({
      code: 'await-promise-missing-ref',
      path: 'scenario.main.edges/await',
    });
    expect(findSequenceLatentThenPreRunIssues([], [], 'scenario.main.edges')).toHaveLength(0);
  });
});
