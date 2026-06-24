import { describe, expect, it } from 'vitest';

import {
  tryParseWorkspaceQuotaFromResponseBody,
  WorkspaceQuotaExceededError,
} from './workspace-quota-error.js';

describe('WorkspaceQuotaExceededError', () => {
  it('parses NestJS ForbiddenException body', () => {
    const error = tryParseWorkspaceQuotaFromResponseBody({
      statusCode: 403,
      message: {
        code: 'WORKSPACE_QUOTA_EXCEEDED',
        maxUserWorkspaces: 3,
        used: 3,
      },
      error: 'Forbidden',
    });
    expect(error).toBeInstanceOf(WorkspaceQuotaExceededError);
    expect(error?.used).toBe(3);
    expect(error?.max).toBe(3);
    expect(error?.message).toContain('3/3');
  });
});
