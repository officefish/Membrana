import type {
  ScenarioAsyncJobCorrelation,
  ScenarioAsyncJobKind,
  ScenarioAsyncJobRecord,
  ScenarioAsyncJobState,
} from '@membrana/core';
import {
  DEFAULT_MAX_PENDING_TRACK_UPLOAD_JOBS,
  isTerminalScenarioAsyncJobState,
} from '@membrana/core';

export interface RegisterAsyncJobInput {
  readonly promiseId: string;
  readonly kind: ScenarioAsyncJobKind;
  readonly correlation: ScenarioAsyncJobCorrelation;
}

export interface AsyncJobStoreOptions {
  readonly maxPendingTrackUploads?: number;
}

export type AsyncJobListener = (record: ScenarioAsyncJobRecord) => void;

/**
 * In-memory registry async jobs для scenario runtime (AP v1).
 * Host bridge resolve/reject; runtime await-promise / on-async-resolved.
 */
export class AsyncJobStore {
  private readonly jobs = new Map<string, ScenarioAsyncJobRecord>();

  private readonly maxPendingTrackUploads: number;

  private readonly listeners = new Set<AsyncJobListener>();

  constructor(options: AsyncJobStoreOptions = {}) {
    this.maxPendingTrackUploads =
      options.maxPendingTrackUploads ?? DEFAULT_MAX_PENDING_TRACK_UPLOAD_JOBS;
  }

  subscribe(listener: AsyncJobListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  get(promiseId: string): ScenarioAsyncJobRecord | undefined {
    return this.jobs.get(promiseId);
  }

  listPending(): readonly ScenarioAsyncJobRecord[] {
    return [...this.jobs.values()].filter((job) => job.state === 'pending');
  }

  register(input: RegisterAsyncJobInput): ScenarioAsyncJobRecord {
    if (input.kind === 'track-upload') {
      this.enforceTrackUploadBackpressure(input.correlation.runId);
    }
    const record: ScenarioAsyncJobRecord = {
      promiseId: input.promiseId,
      kind: input.kind,
      state: 'pending',
      correlation: input.correlation,
    };
    this.jobs.set(input.promiseId, record);
    this.emit(record);
    return record;
  }

  resolve(promiseId: string): ScenarioAsyncJobRecord | null {
    return this.transition(promiseId, 'resolved');
  }

  reject(promiseId: string, errorMessage?: string): ScenarioAsyncJobRecord | null {
    return this.transition(promiseId, 'rejected', errorMessage);
  }

  cancel(promiseId: string): ScenarioAsyncJobRecord | null {
    return this.transition(promiseId, 'cancelled');
  }

  /** Cancel all pending jobs for run (abort / onStop). */
  cancelByRunId(runId: string): readonly ScenarioAsyncJobRecord[] {
    const cancelled: ScenarioAsyncJobRecord[] = [];
    for (const job of this.jobs.values()) {
      if (job.state === 'pending' && job.correlation.runId === runId) {
        const updated = this.transition(job.promiseId, 'cancelled');
        if (updated !== null) {
          cancelled.push(updated);
        }
      }
    }
    return cancelled;
  }

  /** Cancel pending jobs of kind (cancel-async-jobs node). */
  cancelByKind(kind: ScenarioAsyncJobKind, runId?: string): readonly ScenarioAsyncJobRecord[] {
    const cancelled: ScenarioAsyncJobRecord[] = [];
    for (const job of this.jobs.values()) {
      if (job.state !== 'pending' || job.kind !== kind) {
        continue;
      }
      if (runId !== undefined && job.correlation.runId !== runId) {
        continue;
      }
      const updated = this.transition(job.promiseId, 'cancelled');
      if (updated !== null) {
        cancelled.push(updated);
      }
    }
    return cancelled;
  }

  clear(): void {
    this.jobs.clear();
  }

  private enforceTrackUploadBackpressure(runId: string): void {
    const pending = [...this.jobs.values()].filter(
      (job) =>
        job.kind === 'track-upload' &&
        job.state === 'pending' &&
        job.correlation.runId === runId,
    );
    while (pending.length >= this.maxPendingTrackUploads) {
      const oldest = pending.shift();
      if (oldest === undefined) {
        break;
      }
      this.transition(oldest.promiseId, 'cancelled');
    }
  }

  private transition(
    promiseId: string,
    state: ScenarioAsyncJobState,
    errorMessage?: string,
  ): ScenarioAsyncJobRecord | null {
    const current = this.jobs.get(promiseId);
    if (current === undefined || isTerminalScenarioAsyncJobState(current.state)) {
      return null;
    }
    const updated: ScenarioAsyncJobRecord = {
      ...current,
      state,
      resolvedAtMs: Date.now(),
      ...(errorMessage !== undefined ? { errorMessage } : {}),
    };
    this.jobs.set(promiseId, updated);
    this.emit(updated);
    return updated;
  }

  private emit(record: ScenarioAsyncJobRecord): void {
    for (const listener of this.listeners) {
      listener(record);
    }
  }
}
