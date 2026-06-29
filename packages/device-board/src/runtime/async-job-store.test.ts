import { describe, expect, it, vi } from 'vitest';

import { AsyncJobStore } from './async-job-store.js';

const correlation = {
  runId: 'abc12345',
  branch: 'main',
  nodeId: 'make-track-1',
  tick: 44,
  startedAtMs: 1_000,
} as const;

describe('AsyncJobStore', () => {
  it('registers and resolves a job', () => {
    const store = new AsyncJobStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.register({ promiseId: 'p1', kind: 'track-upload', correlation });
    expect(store.get('p1')?.state).toBe('pending');

    const resolved = store.resolve('p1');
    expect(resolved?.state).toBe('resolved');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('cancels oldest pending track-upload when backpressure exceeded', () => {
    const store = new AsyncJobStore({ maxPendingTrackUploads: 2 });
    store.register({ promiseId: 'p1', kind: 'track-upload', correlation });
    store.register({ promiseId: 'p2', kind: 'track-upload', correlation });
    store.register({ promiseId: 'p3', kind: 'track-upload', correlation });

    expect(store.get('p1')?.state).toBe('cancelled');
    expect(store.get('p2')?.state).toBe('pending');
    expect(store.get('p3')?.state).toBe('pending');
  });

  it('cancelByRunId cancels only pending jobs for run', () => {
    const store = new AsyncJobStore();
    store.register({ promiseId: 'p1', kind: 'report-build', correlation });
    store.register({
      promiseId: 'p2',
      kind: 'journal-publish',
      correlation: { ...correlation, runId: 'other-run' },
    });

    const cancelled = store.cancelByRunId('abc12345');
    expect(cancelled).toHaveLength(1);
    expect(store.get('p1')?.state).toBe('cancelled');
    expect(store.get('p2')?.state).toBe('pending');
  });
});
