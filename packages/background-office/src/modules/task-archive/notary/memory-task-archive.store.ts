import { Injectable } from '@nestjs/common';

import type { StoredTaskClosureRecord, TaskClosureRecord } from '../contracts';
import type { TaskArchivePutResult, TaskArchiveStore } from './task-archive.store';

@Injectable()
export class MemoryTaskArchiveStore implements TaskArchiveStore {
  private readonly records = new Map<string, StoredTaskClosureRecord>();

  async putClosureRecord(
    record: TaskClosureRecord,
    recordHash: string,
    notarizedAt: string,
  ): Promise<TaskArchivePutResult> {
    const existing = this.records.get(record.taskId);
    if (existing) {
      return existing.recordHash === recordHash
        ? { status: 'existing_equiv', record: existing }
        : { status: 'conflict', existing, incomingHash: recordHash };
    }

    const stored: StoredTaskClosureRecord = { ...record, recordHash, notarizedAt };
    this.records.set(record.taskId, stored);
    return { status: 'created', record: stored };
  }

  async listClosureRecords(): Promise<StoredTaskClosureRecord[]> {
    return [...this.records.values()];
  }

  async getClosureRecord(taskId: string): Promise<StoredTaskClosureRecord | null> {
    return this.records.get(taskId) ?? null;
  }
}
