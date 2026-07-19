/**
 * Снимок-контракт `linear-snapshot@1` (Р2, вердикт M2 registry-relocation).
 *
 * Снимок — адресуемый, версионированный артефакт с провенансом
 * `(capturedAt, sourceRevision)`. Вход гейтов — снимок, не сеть; его
 * молчаливое устаревание — нарушение контракта.
 *
 * Зеркало офлайн-потребителя: scripts/lib/snapshot-contract.mjs (тот же формат;
 * сведение форм — Interface Consilium).
 */

export const LINEAR_SNAPSHOT_FORMAT = 'linear-snapshot@1';

/** Что попросило снять. Триггер НЕ является источником тела снимка (M2). */
export type LinearSnapshotTrigger = 'webhook' | 'evening-signal' | 'manual';

export interface LinearSnapshotHeader {
  format: typeof LINEAR_SNAPSHOT_FORMAT;
  /** Момент съёмки — часы производителя (office), UTC ISO. */
  capturedAt: string;
  /** Курсор источника на момент съёмки (допущение A6: organization.updatedAt). */
  sourceRevision: string;
  /** Производитель — всегда office-батч. */
  source: 'office-batch';
  trigger: LinearSnapshotTrigger;
  recordCount: number;
}

/**
 * Слой ДВИЖЕНИЯ одной задачи. Содержание живёт в git и не дублируется (M2:
 * расслоение по шву git/Linear).
 */
export interface LinearSnapshotRecord {
  linearId: string;
  state: string;
  stateType: string;
  /** Ответственная персона (двухслойность A3); имена не склеиваются (M1). */
  assignee: string | null;
  /** Исполнитель-агент, если источник его отдаёт (A3). */
  delegatedAgent: string | null;
  parentId: string | null;
  /** Из GraphQL; вебхуками эти отношения не приходят (A2). */
  blockedBy: string[];
  blocking: string[];
  /** Паспорта: номера GitHub-issue из attachment'ов/связей (биекция M1). */
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
 * Порт источника: полный pull-опрос за стабом API. Сеть живёт только здесь;
 * в тестах порт замещается фикстурами (сеть в тестах запрещена — M2).
 */
export interface LinearSnapshotSourcePort {
  /** Полный pull всех задач (пагинация внутри). */
  pullAllIssues(): Promise<LinearSnapshotRecord[]>;
  /** Один дешёвый запрос курсора источника, O(1). */
  fetchSourceCursor(): Promise<string>;
}

export const LINEAR_SNAPSHOT_SOURCE = 'LINEAR_SNAPSHOT_SOURCE';

export interface FreshnessResult {
  fresh: boolean;
  snapshotRevision: string;
  sourceCursor: string;
}
