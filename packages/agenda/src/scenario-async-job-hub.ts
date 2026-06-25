/**
 * Thin publish/subscribe facade for scenario async jobs (AP v1 R10).
 * Depends only on `@membrana/core` — no device-board runtime import.
 *
 * @see docs/prompts/DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md §AP7
 */

import type { ScenarioAsyncJobKind, ScenarioAsyncJobRecord } from '@membrana/core';

export type ScenarioAsyncJobListener = (record: ScenarioAsyncJobRecord) => void;

export type ScenarioAsyncJobSnapshotListener = () => void;

/** UI-friendly projection of hub state (pending badge, debug panels). */
export interface ScenarioAsyncJobHubSnapshot {
  readonly pendingCount: number;
  readonly pending: readonly ScenarioAsyncJobRecord[];
  readonly records: readonly ScenarioAsyncJobRecord[];
}

export interface BindScenarioAsyncJobPublisherOptions {
  /** Replay current pending jobs when binding (e.g. after React mount). */
  readonly seed?: () => readonly ScenarioAsyncJobRecord[];
}

/**
 * In-memory hub: runtime / remote WS → client UI.
 * Not a product-wide event bus — scenario async jobs only.
 */
export class ScenarioAsyncJobHub {
  private readonly records = new Map<string, ScenarioAsyncJobRecord>();

  private readonly listeners = new Set<ScenarioAsyncJobListener>();

  private readonly snapshotListeners = new Set<ScenarioAsyncJobSnapshotListener>();

  private snapshot: ScenarioAsyncJobHubSnapshot = buildSnapshot(this.records);

  /** Upsert job record and notify subscribers. */
  publish(record: ScenarioAsyncJobRecord): void {
    this.records.set(record.promiseId, record);
    this.emitRecord(record);
    this.emitSnapshot();
  }

  /** Drop all tracked jobs (new scenario run / controller reset). */
  clear(): void {
    if (this.records.size === 0) {
      return;
    }
    this.records.clear();
    this.emitSnapshot();
  }

  get(promiseId: string): ScenarioAsyncJobRecord | undefined {
    return this.records.get(promiseId);
  }

  getSnapshot(): ScenarioAsyncJobHubSnapshot {
    return this.snapshot;
  }

  listPending(kind?: ScenarioAsyncJobKind): readonly ScenarioAsyncJobRecord[] {
    const pending = [...this.records.values()].filter((record) => record.state === 'pending');
    if (kind === undefined) {
      return pending;
    }
    return pending.filter((record) => record.kind === kind);
  }

  subscribe(listener: ScenarioAsyncJobListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** For `useSyncExternalStore` — fires on publish/clear. */
  subscribeSnapshot(listener: ScenarioAsyncJobSnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  private emitRecord(record: ScenarioAsyncJobRecord): void {
    for (const listener of this.listeners) {
      listener(record);
    }
  }

  private emitSnapshot(): void {
    this.snapshot = buildSnapshot(this.records);
    for (const listener of this.snapshotListeners) {
      listener();
    }
  }
}

function buildSnapshot(
  records: ReadonlyMap<string, ScenarioAsyncJobRecord>,
): ScenarioAsyncJobHubSnapshot {
  const all = [...records.values()];
  const pending = all.filter((record) => record.state === 'pending');
  return {
    pendingCount: pending.length,
    pending,
    records: all,
  };
}

/**
 * Bridge device-board `AsyncJobStore.subscribe` (or MP7b WS) into agenda hub.
 * Returns unbind — call on runtime teardown.
 */
export function bindScenarioAsyncJobPublisher(
  hub: ScenarioAsyncJobHub,
  subscribe: (listener: ScenarioAsyncJobListener) => () => void,
  options: BindScenarioAsyncJobPublisherOptions = {},
): () => void {
  if (options.seed !== undefined) {
    for (const record of options.seed()) {
      hub.publish(record);
    }
  }
  return subscribe((record) => {
    hub.publish(record);
  });
}
