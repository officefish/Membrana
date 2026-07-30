import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { MemoryTaskArchiveStore } from './memory-task-archive.store';
import { TaskArchiveService } from './task-archive.service';

const record = {
  schemaVersion: 'task-closure-record/1',
  recordType: 'task_closure',
  taskId: 'task-a',
  epic_id: 'archive',
  status: 'closed',
  closedAt: '2026-07-30T15:00:00.000Z',
  actor: 'codex',
  taskSnapshot: { id: 'task-a', status: 'closed', epic_id: 'archive' },
  proof: {
    prRef: 'PR #1519',
    commitSha: '0123456789abcdef0123456789abcdef01234567',
  },
} as const;

describe('TaskArchiveService', () => {
  it('notarizes equivalent task closure records idempotently', async () => {
    const service = new TaskArchiveService(new MemoryTaskArchiveStore());

    const first = await service.notarizeClosure(record);
    const second = await service.notarizeClosure(record);

    expect(first.status).toBe('created');
    expect(second.status).toBe('existing_equiv');
    expect(second.record.recordHash).toBe(first.record.recordHash);
  });

  it('rejects conflicting rewrites for an already closed task', async () => {
    const service = new TaskArchiveService(new MemoryTaskArchiveStore());

    await service.notarizeClosure(record);

    await expect(
      service.notarizeClosure({
        ...record,
        proof: {
          prRef: 'PR #1520',
          commitSha: 'fedcba9876543210fedcba9876543210fedcba98',
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
