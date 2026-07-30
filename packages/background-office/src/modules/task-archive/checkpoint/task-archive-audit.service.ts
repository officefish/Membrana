import { Injectable } from '@nestjs/common';

import {
  buildColdArchiveCheckpoint,
  coldArchiveCheckpointSchema,
  type ColdArchiveCheckpoint,
} from '../contracts';
import { TaskArchiveService } from '../notary/task-archive.service';

export type TaskArchiveAuditVerdict =
  | 'converged'
  | 'missing_checkpoint'
  | 'count_mismatch'
  | 'hash_mismatch'
  | 'canonicalization_error'
  | 'audit_blocked';

export type TaskArchiveAuditReport = {
  verdict: TaskArchiveAuditVerdict;
  expected?: ColdArchiveCheckpoint;
  actual: ColdArchiveCheckpoint;
  notes: string[];
};

@Injectable()
export class TaskArchiveAuditService {
  constructor(private readonly archive: TaskArchiveService) {}

  async auditAgainst(rawCheckpoint: unknown, auditedAt = new Date().toISOString()): Promise<TaskArchiveAuditReport> {
    const records = await this.archive.listClosures();
    const actual = buildColdArchiveCheckpoint(records, auditedAt);
    const parsed = coldArchiveCheckpointSchema.safeParse(rawCheckpoint);
    if (!parsed.success) {
      return {
        verdict: 'canonicalization_error',
        actual,
        notes: ['checkpoint does not satisfy cold-archive-checkpoint/1 schema'],
      };
    }

    const expected = parsed.data;
    if (expected.recordCount !== actual.recordCount) {
      return {
        verdict: 'count_mismatch',
        expected,
        actual,
        notes: [`checkpoint count=${expected.recordCount}; office count=${actual.recordCount}`],
      };
    }
    if (expected.contentHash !== actual.contentHash) {
      return {
        verdict: 'hash_mismatch',
        expected,
        actual,
        notes: ['checkpoint contentHash differs from current office canonical hash'],
      };
    }

    return {
      verdict: 'converged',
      expected,
      actual,
      notes: ['checkpoint matches current task closure cold archive'],
    };
  }

  async auditPresence(rawCheckpoint: unknown | null, auditedAt = new Date().toISOString()): Promise<TaskArchiveAuditReport> {
    if (!rawCheckpoint) {
      const records = await this.archive.listClosures();
      return {
        verdict: 'missing_checkpoint',
        actual: buildColdArchiveCheckpoint(records, auditedAt),
        notes: ['repo checkpoint is absent; cold archive remains office-owned but recovery evidence is incomplete'],
      };
    }
    return this.auditAgainst(rawCheckpoint, auditedAt);
  }
}
