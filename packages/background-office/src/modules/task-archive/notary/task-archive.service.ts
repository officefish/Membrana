import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';

import {
  buildTaskClosureIdempotencyKey,
  hashTaskClosureRecord,
  taskClosureRecordSchema,
  type StoredTaskClosureRecord,
} from '../contracts';
import { TASK_ARCHIVE_STORE, type TaskArchiveStore } from './task-archive.store';

@Injectable()
export class TaskArchiveService {
  constructor(@Inject(TASK_ARCHIVE_STORE) private readonly store: TaskArchiveStore) {}

  async notarizeClosure(raw: unknown): Promise<{ status: 'created' | 'existing_equiv'; record: StoredTaskClosureRecord }> {
    const parsed = taskClosureRecordSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const record = {
      ...parsed.data,
      idempotencyKey: parsed.data.idempotencyKey ?? buildTaskClosureIdempotencyKey(parsed.data.taskId),
    };
    const expectedKey = buildTaskClosureIdempotencyKey(record.taskId);
    if (record.idempotencyKey !== expectedKey) {
      throw new BadRequestException({
        fieldErrors: {
          idempotencyKey: [`idempotencyKey must be ${expectedKey}`],
        },
      });
    }

    const recordHash = hashTaskClosureRecord(record);
    const result = await this.store.putClosureRecord(record, recordHash, new Date().toISOString());
    if (result.status === 'conflict') {
      throw new ConflictException({
        code: 'TASK_ARCHIVE_RECORD_CONFLICT',
        taskId: record.taskId,
        existingHash: result.existing.recordHash,
        incomingHash: result.incomingHash,
      });
    }
    return result;
  }

  async listClosures(): Promise<StoredTaskClosureRecord[]> {
    return this.store.listClosureRecords();
  }

  async getClosure(taskId: string): Promise<StoredTaskClosureRecord | null> {
    return this.store.getClosureRecord(taskId);
  }
}
