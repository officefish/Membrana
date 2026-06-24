import { formatWorkspaceQuotaMessage } from './workspace-tariff.js';

/** Media rejected new workspace because tariff slot quota is full (STE v1). */
export class WorkspaceQuotaExceededError extends Error {
  readonly code = 'WORKSPACE_QUOTA_EXCEEDED' as const;

  constructor(
    readonly used: number,
    readonly max: number,
  ) {
    super(formatWorkspaceQuotaMessage(used, max));
    this.name = 'WorkspaceQuotaExceededError';
  }
}

export function isWorkspaceQuotaExceededError(error: unknown): error is WorkspaceQuotaExceededError {
  return error instanceof WorkspaceQuotaExceededError;
}

/** NestJS ForbiddenException body: message may be object with quota fields. */
export function tryParseWorkspaceQuotaFromResponseBody(body: unknown): WorkspaceQuotaExceededError | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const message = record.message;
  const payload =
    typeof message === 'object' && message !== null
      ? (message as Record<string, unknown>)
      : record;
  if (payload.code !== 'WORKSPACE_QUOTA_EXCEEDED') {
    return null;
  }
  const used = typeof payload.used === 'number' ? payload.used : 0;
  const max =
    typeof payload.maxUserWorkspaces === 'number'
      ? payload.maxUserWorkspaces
      : typeof payload.limit === 'number'
        ? payload.limit
        : 3;
  return new WorkspaceQuotaExceededError(used, max);
}
