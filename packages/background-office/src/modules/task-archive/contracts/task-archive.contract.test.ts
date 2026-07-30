import { describe, expect, it } from 'vitest';

import {
  buildColdArchiveCheckpoint,
  buildTaskClosureIdempotencyKey,
  hashTaskClosureRecord,
  isTaskClosureProofSufficient,
  stableStringify,
  taskClosureRecordSchema,
  type StoredTaskClosureRecord,
  type TaskClosureRecord,
} from './task-archive.contract';

const baseRecord: TaskClosureRecord = {
  schemaVersion: 'task-closure-record/1',
  recordType: 'task_closure',
  taskId: 'cold-task-1',
  epic_id: 'archive-epic',
  status: 'closed',
  closedAt: '2026-07-30T15:00:00.000Z',
  actor: 'codex',
  taskSnapshot: {
    id: 'cold-task-1',
    title: 'Cold archive task',
    status: 'closed',
    epic_id: 'archive-epic',
  },
  proof: {
    prRef: 'PR #1519',
    commitSha: '0123456789abcdef0123456789abcdef01234567',
  },
};

describe('task archive contract', () => {
  it('uses stable canonical JSON independent of object insertion order', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
  });

  it('accepts only records with sufficient closure evidence', () => {
    expect(taskClosureRecordSchema.safeParse(baseRecord).success).toBe(true);
    expect(isTaskClosureProofSufficient({ commitSha: baseRecord.proof.commitSha, reviewRef: 'review.md' })).toBe(true);
    expect(isTaskClosureProofSufficient({ issueRef: '#1319', issueState: 'closed', reviewRef: 'review.md' })).toBe(true);

    const invalid = taskClosureRecordSchema.safeParse({
      ...baseRecord,
      proof: { issueRef: '#1319', issueState: 'closed' },
    });
    expect(invalid.success).toBe(false);
  });

  it('keeps task id and snapshot id bound together', () => {
    const invalid = taskClosureRecordSchema.safeParse({
      ...baseRecord,
      taskSnapshot: { ...baseRecord.taskSnapshot, id: 'other-task' },
    });
    expect(invalid.success).toBe(false);
  });

  it('builds deterministic record hashes and checkpoints', () => {
    const stored: StoredTaskClosureRecord = {
      ...baseRecord,
      recordHash: hashTaskClosureRecord(baseRecord),
      notarizedAt: '2026-07-30T15:01:00.000Z',
    };
    const checkpoint = buildColdArchiveCheckpoint([stored], '2026-07-30T16:00:00.000Z');

    expect(stored.recordHash).toHaveLength(64);
    expect(checkpoint.recordCount).toBe(1);
    expect(checkpoint.closedAtMin).toBe(baseRecord.closedAt);
    expect(checkpoint.closedAtMax).toBe(baseRecord.closedAt);
  });

  it('derives the procedure idempotency key from the task closure subject', () => {
    expect(buildTaskClosureIdempotencyKey('abc')).toBe('task_closure:abc');
  });
});
