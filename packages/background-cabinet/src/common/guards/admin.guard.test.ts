import { describe, expect, it } from 'vitest';

import { AdminGuard } from '../../common/guards/admin.guard';
import type { AuthenticatedRequest } from '../../common/guards/session.guard';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('allows admin role', () => {
    const req = { authUser: { id: '1', login: 'admin', role: 'admin' as const } } as AuthenticatedRequest;
    expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as never)).toBe(true);
  });

  it('rejects user role', () => {
    const req = { authUser: { id: '2', login: 'bob', role: 'user' as const } } as AuthenticatedRequest;
    expect(() =>
      guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as never),
    ).toThrow('Admin role required');
  });
});
