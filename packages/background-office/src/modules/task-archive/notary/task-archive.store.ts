import type { StoredTaskClosureRecord, TaskClosureRecord } from '../contracts';

export type TaskArchivePutResult =
  | { status: 'created'; record: StoredTaskClosureRecord }
  | { status: 'existing_equiv'; record: StoredTaskClosureRecord }
  | { status: 'conflict'; existing: StoredTaskClosureRecord; incomingHash: string };

export interface TaskArchiveStore {
  putClosureRecord(record: TaskClosureRecord, recordHash: string, notarizedAt: string): Promise<TaskArchivePutResult>;
  listClosureRecords(): Promise<StoredTaskClosureRecord[]>;
  getClosureRecord(taskId: string): Promise<StoredTaskClosureRecord | null>;
}

export const TASK_ARCHIVE_STORE = Symbol('TASK_ARCHIVE_STORE');
