/**
 * Снимок-контракт `linear-snapshot@1` — зеркало потребителя office
 * (вердикт M3 `linear-egress-gear-wiring`). Производитель — media-NL;
 * office хранит/читает артефакт и шлёт trigger, в GraphQL Linear не ходит.
 *
 * Канон типов производителя: `@membrana/background-media` → `linear-snapshot/`.
 */

export const LINEAR_SNAPSHOT_FORMAT = 'linear-snapshot@1' as const;
export const LINEAR_SNAPSHOT_PRODUCED_BY = 'media-NL' as const;
export const LINEAR_SNAPSHOT_EGRESS_REGION = 'NL' as const;
export const LINEAR_SNAPSHOT_MODE = 'batch-full-pull' as const;

export type LinearSnapshotTrigger =
  | 'webhook'
  | 'evening-signal'
  | 'manual'
  | 'office-trigger';

export interface LinearSnapshotHeader {
  format: typeof LINEAR_SNAPSHOT_FORMAT;
  capturedAt: string;
  sourceRevision: string;
  producedBy: typeof LINEAR_SNAPSHOT_PRODUCED_BY;
  egressRegion: typeof LINEAR_SNAPSHOT_EGRESS_REGION;
  mode: typeof LINEAR_SNAPSHOT_MODE;
  trigger: LinearSnapshotTrigger;
  recordCount: number;
  contentDigest?: string;
  keyFingerprint?: string;
}

export interface LinearSnapshotRecord {
  linearId: string;
  state: string;
  stateType: string;
  assignee: string | null;
  delegatedAgent: string | null;
  parentId: string | null;
  blockedBy: string[];
  blocking: string[];
  githubIssueRefs: number[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface LinearSnapshot {
  header: LinearSnapshotHeader;
  records: LinearSnapshotRecord[];
}

/**
 * Порт съёмки для office: либо удалённый media trigger, либо фикстура в тестах.
 * GraphQL Linear на office запрещён (M1).
 */
export interface LinearSnapshotCapturePort {
  capture(trigger: LinearSnapshotTrigger): Promise<LinearSnapshot>;
}

export const LINEAR_SNAPSHOT_CAPTURE = 'LINEAR_SNAPSHOT_CAPTURE';

export interface FreshnessResult {
  fresh: boolean;
  snapshotRevision: string;
  sourceCursor: string;
}
