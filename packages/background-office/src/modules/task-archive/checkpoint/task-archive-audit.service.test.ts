import { describe, expect, it } from 'vitest';

import { MemoryTaskArchiveStore } from '../notary/memory-task-archive.store';
import { TaskArchiveService } from '../notary/task-archive.service';
import { TaskArchiveAuditService } from './task-archive-audit.service';
import { TaskArchiveCheckpointService } from './task-archive-checkpoint.service';

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

describe('TaskArchiveAuditService', () => {
  it('reports converged when checkpoint matches current records', async () => {
    const archive = new TaskArchiveService(new MemoryTaskArchiveStore());
    await archive.notarizeClosure(record);

    const checkpoint = await new TaskArchiveCheckpointService(archive).currentCheckpoint('2026-07-30T16:00:00.000Z');
    const audit = await new TaskArchiveAuditService(archive).auditAgainst(checkpoint, checkpoint.checkpointAt);

    expect(audit.verdict).toBe('converged');
  });

  it('reports missing checkpoint separately from mismatches', async () => {
    const archive = new TaskArchiveService(new MemoryTaskArchiveStore());
    const audit = await new TaskArchiveAuditService(archive).auditPresence(null, '2026-07-30T16:00:00.000Z');

    expect(audit.verdict).toBe('missing_checkpoint');
    expect(audit.actual.recordCount).toBe(0);
  });
});
