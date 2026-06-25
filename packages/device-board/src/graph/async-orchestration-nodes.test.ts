import { describe, expect, it } from 'vitest';

import {
  ASYNC_PROMISE_REF_HANDLE,
  awaitPromiseNodePins,
  cancelAsyncJobsNodePins,
  createAwaitPromiseBoardNode,
  createOnAsyncResolvedBoardNode,
  createStartAsyncJobBoardNode,
  onAsyncResolvedNodePins,
  startAsyncJobNodePins,
  START_ASYNC_JOB_TRACK_HANDLE,
} from './async-orchestration-nodes.js';
import { COLLECT_EVENT_OUT_HANDLE } from './collect-node-shared.js';
import { createPaletteBoardNode } from './palette-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('async-orchestration-nodes', () => {
  it('defines start-async-job pins with track in and promise out', () => {
    const pins = startAsyncJobNodePins();
    expect(pins.inputs.some((p) => p.name === START_ASYNC_JOB_TRACK_HANDLE)).toBe(true);
    expect(pins.outputs.find((p) => p.name === ASYNC_PROMISE_REF_HANDLE)?.socketType).toBe(
      'PromiseRef',
    );
  });

  it('defines await-promise with required promise input', () => {
    const pins = awaitPromiseNodePins();
    expect(pins.inputs.find((p) => p.name === ASYNC_PROMISE_REF_HANDLE)?.socketType).toBe(
      'PromiseRef',
    );
    expect(pins.outputs.map((p) => p.name)).toEqual(['exec-out']);
  });

  it('defines on-async-resolved with event-out only', () => {
    const pins = onAsyncResolvedNodePins();
    expect(pins.inputs.map((p) => p.name)).toEqual([ASYNC_PROMISE_REF_HANDLE]);
    expect(pins.outputs).toEqual([{ name: COLLECT_EVENT_OUT_HANDLE, kind: 'event' }]);
  });

  it('defines cancel-async-jobs as exec-only', () => {
    const pins = cancelAsyncJobsNodePins();
    expect(pins.inputs.map((p) => p.name)).toEqual(['exec-in']);
    expect(pins.outputs.map((p) => p.name)).toEqual(['exec-out']);
  });

  it('round-trips asyncJobConfig through serialize', () => {
    const node = createStartAsyncJobBoardNode({
      id: 'start-1',
      asyncJobConfig: { jobKind: 'journal-publish' },
    });
    const { nodes, edges } = serializeScenarioSubgraph('entry', [node], []);
    expect(nodes[0]?.asyncJobConfig?.jobKind).toBe('journal-publish');

    const hydrated = deserializeScenarioSubgraph({ entry: 'entry', nodes, edges });
    const data = hydrated.nodes[0]?.data as {
      nodeKind?: string;
      asyncJobConfig?: { jobKind: string };
    };
    expect(data.nodeKind).toBe('start-async-job');
    expect(data.asyncJobConfig?.jobKind).toBe('journal-publish');
  });

  it('palette creates promise nodes with labels (AD6)', () => {
    expect(createPaletteBoardNode('start-async-job').data.label).toBe('Start Async Job');
    expect(createPaletteBoardNode('await-promise').data.label).toBe('Await Promise');
    expect(createPaletteBoardNode('on-async-resolved').data.label).toBe('On Async Resolved');
    expect(createPaletteBoardNode('cancel-async-jobs').data.label).toBe('Cancel Async Jobs');
  });

  it('await-promise factory stores awaitTimeoutMs', () => {
    const node = createAwaitPromiseBoardNode({ asyncJobConfig: { awaitTimeoutMs: 12_000 } });
    const data = node.data as { asyncJobConfig?: { awaitTimeoutMs?: number } };
    expect(data.asyncJobConfig?.awaitTimeoutMs).toBe(12_000);
  });

  it('on-async-resolved has no asyncJobConfig', () => {
    const node = createOnAsyncResolvedBoardNode();
    expect(node.data.asyncJobConfig).toBeUndefined();
  });
});
