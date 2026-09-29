export type BatchCollectionSampleStatus = 'ok' | 'failed' | 'skipped';

export type BatchCollectionRejectionReason =
  | 'empty'
  | 'reader-failed'
  | 'detector-unavailable'
  | 'limit-exceeded';

export interface BatchCollectionRunRequest {
  /** Optional frozen subset. Omitted means the full collection snapshot at run start. */
  readonly sampleIds?: readonly string[];
}

export interface BatchCollectionDetectorVerdict {
  readonly detectorId: string;
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly latencyMs: number;
}

export interface BatchCollectionSampleResult {
  readonly sampleId: string;
  readonly title: string;
  readonly status: BatchCollectionSampleStatus;
  readonly detected?: boolean;
  readonly confidence?: number;
  readonly latencyMs?: number;
  readonly verdicts?: readonly BatchCollectionDetectorVerdict[];
  readonly reason?: string;
}

export interface BatchCollectionRunAggregate {
  readonly total: number;
  readonly ok: number;
  readonly failed: number;
  readonly skipped: number;
  readonly detected: number;
  readonly latencyP50Ms: number;
  readonly latencyP95Ms: number;
}

export interface BatchCollectionRunRejection {
  readonly reason: BatchCollectionRejectionReason;
  readonly detail: string;
}

interface BatchCollectionRunOutcomeBase {
  readonly inputHash: string;
  readonly aggregate: BatchCollectionRunAggregate;
  readonly results: readonly BatchCollectionSampleResult[];
}

export interface BatchCollectionRunCompleted extends BatchCollectionRunOutcomeBase {
  readonly status: 'completed';
}

export interface BatchCollectionRunRejected extends BatchCollectionRunOutcomeBase {
  readonly status: 'rejected';
  readonly rejection: BatchCollectionRunRejection;
}

/** JSON-safe result returned by the collections plugin request. */
export type BatchCollectionRunOutcome =
  | BatchCollectionRunCompleted
  | BatchCollectionRunRejected;
