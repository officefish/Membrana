/** Non-conflict failure when media rejects or cannot parse workspace PUT. */
export class WorkspacePersistError extends Error {
  readonly code = 'WORKSPACE_PERSIST_FAILED' as const;

  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'WorkspacePersistError';
  }
}

export function isWorkspacePersistError(error: unknown): error is WorkspacePersistError {
  return error instanceof WorkspacePersistError;
}
