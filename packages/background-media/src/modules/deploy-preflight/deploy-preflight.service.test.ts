import { describe, expect, it, vi } from 'vitest';

import { DeployPreflightService } from './deploy-preflight.service';

describe('DeployPreflightService', () => {
  it('returns latest sample timestamp for live-session deploy guard', async () => {
    const prisma = {
      sample: {
        findFirst: vi.fn(async () => ({
          id: 'sample-1',
          deviceId: 'device-1',
          createdAt: new Date('2026-08-25T10:00:30.000Z'),
        })),
      },
    };
    const service = new DeployPreflightService(prisma as never);

    await expect(service.lastSample()).resolves.toEqual({
      lastSampleAt: '2026-08-25T10:00:30.000Z',
      sampleId: 'sample-1',
      deviceId: 'device-1',
    });
    expect(prisma.sample.findFirst).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      select: { id: true, deviceId: true, createdAt: true },
    });
  });
});
