import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { MediaDeviceAccessGuard } from './media-device-access.guard';

function context(headers: Record<string, string | undefined>, params = { deviceId: 'dev-1' }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, params }),
    }),
  } as unknown as ExecutionContext;
}

describe('MediaDeviceAccessGuard', () => {
  it('служебный X-Membrana-Token проходит через DeviceGuard', async () => {
    const deviceGuard = { canActivate: vi.fn(async () => true) };
    const keys = { verify: vi.fn() };
    const guard = new MediaDeviceAccessGuard(
      { API_INTERNAL_TOKEN: 'service-token' } as never,
      deviceGuard as never,
      keys as never,
    );

    await expect(
      guard.canActivate(context({ 'x-membrana-token': 'service-token' })),
    ).resolves.toBe(true);
    expect(deviceGuard.canActivate).toHaveBeenCalled();
    expect(keys.verify).not.toHaveBeenCalled();
  });

  it('client audience key проходит только для своего deviceId', async () => {
    const deviceGuard = { canActivate: vi.fn(async () => true) };
    const keys = { verify: vi.fn(async () => ({ verdict: 'ok', keyId: 'k1', deviceId: 'dev-1' })) };
    const guard = new MediaDeviceAccessGuard(
      { API_INTERNAL_TOKEN: 'service-token' } as never,
      deviceGuard as never,
      keys as never,
    );

    await expect(
      guard.canActivate(context({ 'x-membrana-token': 'client-token' })),
    ).resolves.toBe(true);
    expect(keys.verify).toHaveBeenCalledWith('client-token', 'dev-1', { audience: 'client' });
    expect(deviceGuard.canActivate).toHaveBeenCalled();
  });

  it('node audience key не принимается как client media key', async () => {
    const guard = new MediaDeviceAccessGuard(
      { API_INTERNAL_TOKEN: 'service-token' } as never,
      { canActivate: vi.fn() } as never,
      { verify: vi.fn(async () => ({ verdict: 'foreign_audience' })) } as never,
    );

    await expect(
      guard.canActivate(context({ 'x-membrana-token': 'node-key' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('отозванный client key даёт 401', async () => {
    const guard = new MediaDeviceAccessGuard(
      { API_INTERNAL_TOKEN: 'service-token' } as never,
      { canActivate: vi.fn() } as never,
      { verify: vi.fn(async () => ({ verdict: 'revoked' })) } as never,
    );

    await expect(
      guard.canActivate(context({ 'x-membrana-token': 'client-token' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
