import { describe, expect, it, vi } from 'vitest';
import type { ScenarioAsyncJobRecord } from '@membrana/core';

import {
  ScenarioAsyncJobHub,
  bindScenarioAsyncJobPublisher,
} from './scenario-async-job-hub.js';

function sampleRecord(
  promiseId: string,
  state: ScenarioAsyncJobRecord['state'] = 'pending',
): ScenarioAsyncJobRecord {
  return {
    promiseId,
    kind: 'track-upload',
    state,
    correlation: {
      runId: 'run-1',
      branch: 'main',
      nodeId: 'node-start-async-job-v20',
      startedAtMs: Date.now(),
    },
  };
}

describe('ScenarioAsyncJobHub', () => {
  it('publish updates snapshot pendingCount', () => {
    const hub = new ScenarioAsyncJobHub();
    expect(hub.getSnapshot().pendingCount).toBe(0);

    hub.publish(sampleRecord('p1'));
    expect(hub.getSnapshot().pendingCount).toBe(1);
    expect(hub.listPending('track-upload')).toHaveLength(1);

    hub.publish(sampleRecord('p1', 'resolved'));
    expect(hub.getSnapshot().pendingCount).toBe(0);
    expect(hub.get('p1')?.state).toBe('resolved');
  });

  it('notifies record and snapshot listeners', () => {
    const hub = new ScenarioAsyncJobHub();
    const onRecord = vi.fn();
    const onSnapshot = vi.fn();
    hub.subscribe(onRecord);
    hub.subscribeSnapshot(onSnapshot);

    hub.publish(sampleRecord('p2'));
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({ promiseId: 'p2' }));
    expect(onSnapshot).toHaveBeenCalledTimes(1);

    hub.clear();
    expect(hub.getSnapshot().pendingCount).toBe(0);
    expect(onSnapshot).toHaveBeenCalledTimes(2);
  });

  it('bindScenarioAsyncJobPublisher forwards store events', () => {
    const hub = new ScenarioAsyncJobHub();
    const storeListeners = new Set<(record: ScenarioAsyncJobRecord) => void>();

    const unbind = bindScenarioAsyncJobPublisher(
      hub,
      (listener) => {
        storeListeners.add(listener);
        return () => {
          storeListeners.delete(listener);
        };
      },
      { seed: () => [sampleRecord('seed')] },
    );

    expect(hub.getSnapshot().pendingCount).toBe(1);

    for (const listener of storeListeners) {
      listener(sampleRecord('live'));
    }
    expect(hub.getSnapshot().pendingCount).toBe(2);

    unbind();
    for (const listener of storeListeners) {
      listener(sampleRecord('ignored'));
    }
    expect(hub.getSnapshot().pendingCount).toBe(2);
  });
});
