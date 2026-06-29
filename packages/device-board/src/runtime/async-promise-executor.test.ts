import { describe, expect, it, vi } from 'vitest';
import {
  createEmptyScenarioGraph,
} from '@membrana/core';

import { ASYNC_PROMISE_REF_HANDLE } from '../graph/async-orchestration-nodes.js';
import { COLLECT_EVENT_OUT_HANDLE } from '../graph/collect-node-shared.js';
import { AsyncJobStore } from './async-job-store.js';
import {
  executeAwaitPromise,
  executeCancelAsyncJobs,
  executeStartAsyncJob,
} from './async-promise-executor.js';
import { PromiseRuntimeStore } from './promise-runtime-store.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { ScenarioVariableStore } from './variable-store.js';
import { dispatchAsyncResolvedBranches } from './async-resolved-dispatch.js';

function buildStartAwaitSubgraph(): {
  subgraph: {
    entry: string;
    nodes: Array<{
      id: string;
      blockKind: 'custom';
      position: { x: number; y: number };
      nodeKind: string;
      asyncJobConfig?: { jobKind: string };
    }>;
    edges: Array<{
      source: string;
      sourceHandle: string;
      target: string;
      targetHandle: string;
      kind: 'exec' | 'data';
      dataType?: string;
    }>;
  };
} {
  return {
    subgraph: {
      entry: 'start',
      nodes: [
        {
          id: 'start',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'start-async-job',
          asyncJobConfig: { jobKind: 'track-upload' },
        },
        {
          id: 'await',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'await-promise',
          asyncJobConfig: { jobKind: 'track-upload', awaitTimeoutMs: 200 },
        },
      ],
      edges: [
        {
          source: 'start',
          sourceHandle: 'exec-out',
          target: 'await',
          targetHandle: 'exec-in',
          kind: 'exec',
        },
        {
          source: 'start',
          sourceHandle: ASYNC_PROMISE_REF_HANDLE,
          target: 'await',
          targetHandle: ASYNC_PROMISE_REF_HANDLE,
          kind: 'data',
          dataType: 'PromiseRef',
        },
      ],
    },
  };
}

describe('async-promise-executor', () => {
  it('start-async-job registers job and promise ref', async () => {
    const host = createStubScenarioRuntimeHost({ log: vi.fn() });
    const asyncJobStore = new AsyncJobStore();
    const promiseRuntimeStore = new PromiseRuntimeStore();
    const { subgraph } = buildStartAwaitSubgraph();

    await executeStartAsyncJob({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node: subgraph.nodes[0]!,
      runId: 'run-1',
      asyncJobStore,
      promiseRuntimeStore,
    });

    expect(asyncJobStore.listPending()).toHaveLength(1);
    const ref = promiseRuntimeStore.getPromiseRef('start');
    expect(ref.kind).toBe('PromiseRef');
    expect(ref.handle).toMatch(/^promise:track-upload:start-/);
  });

  it('await-promise blocks until job resolves', async () => {
    const host = createStubScenarioRuntimeHost({ log: vi.fn() });
    const asyncJobStore = new AsyncJobStore();
    const promiseRuntimeStore = new PromiseRuntimeStore();
    const variableStore = new ScenarioVariableStore();
    const { subgraph } = buildStartAwaitSubgraph();

    await executeStartAsyncJob({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node: subgraph.nodes[0]!,
      runId: 'run-1',
      asyncJobStore,
      promiseRuntimeStore,
    });

    const promiseId = asyncJobStore.listPending()[0]!.promiseId;
    const awaitPromise = executeAwaitPromise({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node: subgraph.nodes[1]!,
      runId: 'run-1',
      variableStore,
      resolveContext: {
        getPromiseRef: (nodeId) => promiseRuntimeStore.getPromiseRef(nodeId),
      },
      asyncJobStore,
      promiseRuntimeStore,
    });

    setTimeout(() => {
      asyncJobStore.resolve(promiseId);
    }, 10);

    await awaitPromise;
    expect(asyncJobStore.get(promiseId)?.state).toBe('resolved');
  });

  it('cancel-async-jobs cancels pending by kind', async () => {
    const host = createStubScenarioRuntimeHost({ log: vi.fn() });
    const asyncJobStore = new AsyncJobStore();
    const promiseRuntimeStore = new PromiseRuntimeStore();
    const { subgraph } = buildStartAwaitSubgraph();

    await executeStartAsyncJob({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node: subgraph.nodes[0]!,
      runId: 'run-1',
      asyncJobStore,
      promiseRuntimeStore,
    });

    executeCancelAsyncJobs({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node: {
        id: 'cancel',
        blockKind: 'custom',
        position: { x: 0, y: 0 },
        nodeKind: 'cancel-async-jobs',
        asyncJobConfig: { jobKind: 'track-upload' },
      },
      runId: 'run-1',
      asyncJobStore,
    });

    expect(asyncJobStore.listPending()).toHaveLength(0);
  });

  it('on-async-resolved dispatches event branch after resolve', async () => {
    const log = vi.fn();
    const host = createStubScenarioRuntimeHost({ log, printLine: vi.fn() });
    const asyncJobStore = new AsyncJobStore();
    const promiseRuntimeStore = new PromiseRuntimeStore();
    const variableStore = new ScenarioVariableStore();
    const signal = new AbortController().signal;

    const graph = createEmptyScenarioGraph();
    const subgraph = {
      entry: 'start',
      nodes: [
        {
          id: 'start',
          blockKind: 'custom' as const,
          position: { x: 0, y: 0 },
          nodeKind: 'start-async-job' as const,
          asyncJobConfig: { jobKind: 'track-upload' as const },
        },
        {
          id: 'listener',
          blockKind: 'custom' as const,
          position: { x: 0, y: 0 },
          nodeKind: 'on-async-resolved' as const,
        },
        {
          id: 'print',
          blockKind: 'custom' as const,
          position: { x: 0, y: 0 },
          nodeKind: 'print' as const,
        },
      ],
      edges: [
        {
          source: 'start',
          sourceHandle: ASYNC_PROMISE_REF_HANDLE,
          target: 'listener',
          targetHandle: ASYNC_PROMISE_REF_HANDLE,
          kind: 'data' as const,
          dataType: 'PromiseRef' as const,
        },
        {
          source: 'listener',
          sourceHandle: COLLECT_EVENT_OUT_HANDLE,
          target: 'print',
          targetHandle: 'exec-in',
          kind: 'event' as const,
        },
      ],
    };
    graph.loops.main = subgraph;

    await executeStartAsyncJob({
      host,
      signal,
      branch: 'main',
      subgraph,
      node: subgraph.nodes[0]!,
      runId: 'run-evt',
      asyncJobStore,
      promiseRuntimeStore,
    });

    const promiseId = asyncJobStore.listPending()[0]!.promiseId;
    const record = asyncJobStore.resolve(promiseId);
    expect(record).not.toBeNull();

    const document = {
      meta: { title: 'test' },
      deviceKind: 'microphone' as const,
      scenario: graph,
    };

    await dispatchAsyncResolvedBranches({
      document,
      record: record!,
      host,
      signal,
      variableStore,
      promiseRuntimeStore,
      execOptions: (branch) => ({
        branch,
        variableStore,
        resolveContext: {
          getPromiseRef: (nodeId) => promiseRuntimeStore.getPromiseRef(nodeId),
        },
        asyncJobStore,
        promiseRuntimeStore,
        runId: 'run-evt',
      }),
    });

    expect(log).toHaveBeenCalledWith(
      'async-resolved-dispatch-done',
      expect.objectContaining({ promiseId }),
    );
  });

  it('executeScenarioBlock runs start-async-job with runId', async () => {
    const { executeScenarioBlock } = await import('./block-executor.js');
    const host = createStubScenarioRuntimeHost({ log: vi.fn() });
    const asyncJobStore = new AsyncJobStore();
    const promiseRuntimeStore = new PromiseRuntimeStore();
    const { subgraph } = buildStartAwaitSubgraph();

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node: subgraph.nodes[0]!,
      lastDetection: null,
      defaultChunkDurationMs: 1000,
      functions: [],
      asyncJobStore,
      promiseRuntimeStore,
      runId: 'run-block',
    });

    expect(asyncJobStore.listPending()).toHaveLength(1);
  });
});

describe('wait-for-async-job', () => {
  it('rejects on timeout', async () => {
    const { waitForAsyncJobTerminal } = await import('./wait-for-async-job.js');
    const store = new AsyncJobStore();
    store.register({
      promiseId: 'p-timeout',
      kind: 'custom',
      correlation: {
        runId: 'r1',
        branch: 'main',
        nodeId: 'n1',
        startedAtMs: Date.now(),
      },
    });

    await expect(
      waitForAsyncJobTerminal(store, 'p-timeout', 30, new AbortController().signal),
    ).rejects.toThrow(/timeout/);
  });
});
