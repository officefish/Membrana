import { createHash } from 'node:crypto';
import { z } from 'zod';

export const taskClosureRecordType = 'task_closure' as const;
export const taskClosureSchemaVersion = 'task-closure-record/1' as const;
export const coldArchiveCheckpointSchemaVersion = 'cold-archive-checkpoint/1' as const;
export const coldArchiveCanonicalization = 'json-stable-stringify/v1' as const;
export const coldArchiveHashAlg = 'sha256' as const;
export const taskArchiveHome = 'background-office/mongodb' as const;

const isoDateTimeSchema = z.string().datetime({ offset: true });
const commitShaSchema = z.string().regex(/^[0-9a-f]{40}$/i, 'commitSha must be a full 40-char hex SHA');
const nonEmptyStringSchema = z.string().min(1);

export const terminalIssueStateSchema = z.enum(['closed', 'completed', 'done']);

export const taskClosureProofSchema = z
  .object({
    prRef: nonEmptyStringSchema.optional(),
    commitSha: commitShaSchema.optional(),
    reviewRef: nonEmptyStringSchema.optional(),
    issueRef: nonEmptyStringSchema.optional(),
    issueState: terminalIssueStateSchema.optional(),
  })
  .strict();

export const taskClosureSnapshotSchema = z
  .object({
    id: nonEmptyStringSchema,
    title: nonEmptyStringSchema.optional(),
    status: nonEmptyStringSchema,
    epic_id: nonEmptyStringSchema.optional(),
    issue: nonEmptyStringSchema.optional(),
    notes: nonEmptyStringSchema.optional(),
  })
  .catchall(z.unknown());

const taskClosureRecordBaseSchema = z
  .object({
    schemaVersion: z.literal(taskClosureSchemaVersion),
    recordType: z.literal(taskClosureRecordType),
    taskId: nonEmptyStringSchema,
    epic_id: nonEmptyStringSchema,
    status: z.literal('closed'),
    closedAt: isoDateTimeSchema,
    actor: nonEmptyStringSchema,
    idempotencyKey: nonEmptyStringSchema.optional(),
    taskSnapshot: taskClosureSnapshotSchema,
    proof: taskClosureProofSchema,
    notes: nonEmptyStringSchema.optional(),
  })
  .strict();

export const taskClosureRecordSchema = taskClosureRecordBaseSchema.superRefine((record, ctx) => {
    if (record.taskSnapshot.id !== record.taskId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['taskSnapshot', 'id'],
        message: 'taskSnapshot.id must match taskId',
      });
    }
    if (record.taskSnapshot.epic_id && record.taskSnapshot.epic_id !== record.epic_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['taskSnapshot', 'epic_id'],
        message: 'taskSnapshot.epic_id must match epic_id',
      });
    }
    if (!isTaskClosureProofSufficient(record.proof)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proof'],
        message: 'proof must contain PR+commit, commit+review, or terminal issue+review',
      });
    }
  });

export const storedTaskClosureRecordSchema = taskClosureRecordBaseSchema.extend({
  recordHash: z.string().regex(/^[0-9a-f]{64}$/i),
  notarizedAt: isoDateTimeSchema,
});

export const coldArchiveCheckpointSchema = z
  .object({
    schemaVersion: z.literal(coldArchiveCheckpointSchemaVersion),
    archiveHome: z.literal(taskArchiveHome),
    recordType: z.literal(taskClosureRecordType),
    recordCount: z.number().int().nonnegative(),
    hashAlg: z.literal(coldArchiveHashAlg),
    canonicalization: z.literal(coldArchiveCanonicalization),
    contentHash: z.string().regex(/^[0-9a-f]{64}$/i),
    checkpointAt: isoDateTimeSchema,
    closedAtMin: isoDateTimeSchema.optional(),
    closedAtMax: isoDateTimeSchema.optional(),
  })
  .strict();

export type TaskClosureProof = z.infer<typeof taskClosureProofSchema>;
export type TaskClosureRecord = z.infer<typeof taskClosureRecordSchema>;
export type StoredTaskClosureRecord = z.infer<typeof storedTaskClosureRecordSchema>;
export type ColdArchiveCheckpoint = z.infer<typeof coldArchiveCheckpointSchema>;

export function isTaskClosureProofSufficient(proof: TaskClosureProof): boolean {
  const hasCommit = Boolean(proof.commitSha);
  const hasReview = Boolean(proof.reviewRef);
  const hasTerminalIssue = Boolean(proof.issueRef && proof.issueState);
  return Boolean((proof.prRef && hasCommit) || (hasCommit && hasReview) || (hasTerminalIssue && hasReview));
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const object = value as Record<string, unknown>;
  const entries = Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`);
  return `{${entries.join(',')}}`;
}

export function sha256Hex(payload: string): string {
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function hashTaskClosureRecord(record: TaskClosureRecord): string {
  return sha256Hex(stableStringify(record));
}

export function buildTaskClosureIdempotencyKey(taskId: string): string {
  return `${taskClosureRecordType}:${taskId}`;
}

export function buildColdArchiveCheckpoint(
  records: StoredTaskClosureRecord[],
  checkpointAt: string,
): ColdArchiveCheckpoint {
  const ordered = [...records].sort((a, b) => {
    const closedDiff = a.closedAt.localeCompare(b.closedAt);
    return closedDiff || a.taskId.localeCompare(b.taskId);
  });
  const closedAtValues = ordered.map((record) => record.closedAt).sort();
  const contentHash = sha256Hex(stableStringify(ordered));

  return {
    schemaVersion: coldArchiveCheckpointSchemaVersion,
    archiveHome: taskArchiveHome,
    recordType: taskClosureRecordType,
    recordCount: ordered.length,
    hashAlg: coldArchiveHashAlg,
    canonicalization: coldArchiveCanonicalization,
    contentHash,
    checkpointAt,
    closedAtMin: closedAtValues[0],
    closedAtMax: closedAtValues.at(-1),
  };
}
