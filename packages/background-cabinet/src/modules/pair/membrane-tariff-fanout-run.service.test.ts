import { describe, expect, it, vi } from 'vitest';

import { MembraneTariffFanoutRunService } from './membrane-tariff-fanout-run.service';

describe('MembraneTariffFanoutRunService (#2333 v3)', () => {
  it('runs tariff context fanout for every membrane, not only the changed one', async () => {
    const prisma = { membrane: { findMany: vi.fn(async () => [{ id: 'm-1' }, { id: 'm-2' }]) } };
    const fanout = {
      syncAllNodes: vi.fn(async (id: string) => (id === 'm-1' ? { updated: 2, failed: 0 } : { updated: 1, failed: 1 })),
    };
    const service = new MembraneTariffFanoutRunService(prisma as never, fanout as never);
    await expect(service.syncAllMembranes()).resolves.toEqual({ membranes: 2, updated: 3, failed: 1 });
    expect(fanout.syncAllNodes).toHaveBeenCalledWith('m-1');
    expect(fanout.syncAllNodes).toHaveBeenCalledWith('m-2');
  });
});
