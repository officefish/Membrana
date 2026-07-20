/**
 * Снимок-контракт `linear-snapshot@1` (вердикт M3 `linear-egress-gear-wiring`, К3).
 *
 * Производитель — **media-NL** (batch-full-pull). Office — потребитель артефакта;
 * в `api.linear.app` office по этому тракту не ходит.
 *
 * Honest-шапка обязательна: вход без провенанса отвергается. Слово «кэш» в
 * подсистеме запрещено (паспорт LINEAR_TASKS_GEAR §6).
 *
 * Зеркало офлайн-потребителя: `scripts/lib/snapshot-contract.mjs` (+ `pullOk`).
 */

export const LINEAR_SNAPSHOT_FORMAT = 'linear-snapshot@1' as const;

/** Узел-производитель боевого pull (вердикт M1/M3). */
export const LINEAR_SNAPSHOT_PRODUCED_BY = 'media-NL' as const;

/** Регион egress (вердикт M2/M3). */
export const LINEAR_SNAPSHOT_EGRESS_REGION = 'NL' as const;

/** Режим захвата — полный pull-опрос (вердикт M1/M3). */
export const LINEAR_SNAPSHOT_MODE = 'batch-full-pull' as const;

/** Что попросило снять. Триггер НЕ является источником тела снимка. */
export type LinearSnapshotTrigger = 'webhook' | 'evening-signal' | 'manual' | 'office-trigger';

export interface LinearSnapshotHeader {
  format: typeof LINEAR_SNAPSHOT_FORMAT;
  /** Момент съёмки — часы производителя (media-NL), UTC ISO. */
  capturedAt: string;
  /** Курсор источника на момент съёмки (organization.updatedAt). */
  sourceRevision: string;
  /** Узел-производитель (заменяет устаревший `source: office-batch`). */
  producedBy: typeof LINEAR_SNAPSHOT_PRODUCED_BY;
  /** Регион, из которого выполнен egress к Linear. */
  egressRegion: typeof LINEAR_SNAPSHOT_EGRESS_REGION;
  /** Режим захвата. */
  mode: typeof LINEAR_SNAPSHOT_MODE;
  trigger: LinearSnapshotTrigger;
  /** Сверяется с `records.length` в `pullOk`. */
  recordCount: number;
  /** Опционально в `@1` — не гейт первого pull (M3). */
  contentDigest?: string;
  /** Опционально в `@1` — не гейт первого pull (M3). */
  keyFingerprint?: string;
}

/**
 * Слой ДВИЖЕНИЯ одной задачи. Содержание живёт в git и не дублируется.
 */
export interface LinearSnapshotRecord {
  linearId: string;
  state: string;
  stateType: string;
  assignee: string | null;
  /** Исполнитель-агент; до проверки живого API — null (не домысливаем). */
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
 * Порт источника: полный pull-опрос. Сеть живёт только здесь;
 * в тестах порт замещается фикстурами (сеть в тестах запрещена).
 */
export interface LinearSnapshotSourcePort {
  pullAllIssues(): Promise<LinearSnapshotRecord[]>;
  fetchSourceCursor(): Promise<string>;
}

export const LINEAR_SNAPSHOT_SOURCE = 'LINEAR_SNAPSHOT_SOURCE';

export interface FreshnessResult {
  fresh: boolean;
  snapshotRevision: string;
  sourceCursor: string;
}
