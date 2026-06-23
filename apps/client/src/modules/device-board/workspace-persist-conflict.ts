/** Thrown when media rejects PUT due to stale `expectedUpdatedAt` (U11 S3). */
export class WorkspacePersistConflictError extends Error {
  readonly code = 'WORKSPACE_CONFLICT' as const;

  constructor(
    message: string,
    readonly currentUpdatedAt: string,
    readonly expectedUpdatedAt?: string,
  ) {
    super(message);
    this.name = 'WorkspacePersistConflictError';
  }
}

export function isWorkspacePersistConflictError(
  error: unknown,
): error is WorkspacePersistConflictError {
  return error instanceof WorkspacePersistConflictError;
}
