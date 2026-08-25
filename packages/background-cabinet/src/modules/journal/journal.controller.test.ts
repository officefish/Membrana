import { describe, expect, it, vi } from 'vitest';

import { JournalController } from './journal.controller';

describe('JournalController.listJournalItems', () => {
  it('publishes DB timing headers for live journal measurement (#2113)', async () => {
    const journalService = {
      listJournalItems: vi.fn().mockResolvedValue({
        items: [],
        nextCursor: null,
        counts: { all: 0, tracks: 0, reports: 0, detections: 0 },
      }),
    };
    const controller = new JournalController(journalService as never);
    const header = vi.fn();

    const result = await controller.listJournalItems(
      { authUser: { id: 'user-1' } } as never,
      { limit: '50' },
      { header } as never,
    );

    expect(result.counts).toEqual({ all: 0, tracks: 0, reports: 0, detections: 0 });
    expect(header).toHaveBeenCalledWith('Server-Timing', expect.stringMatching(/^journal-db;dur=\d/u));
    expect(header).toHaveBeenCalledWith(
      'X-Membrana-Journal-Db-Duration-Ms',
      expect.stringMatching(/^\d+(?:\.\d)?$/u),
    );
  });
});
