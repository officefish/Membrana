import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  publishJournalCleared,
  publishJournalSnapshotUpdated,
  resetLiveJournalHubForTests,
  subscribeJournalCleared,
  subscribeJournalSnapshotUpdated,
} from './liveJournalHub';

describe('liveJournalHub', () => {
  afterEach(() => {
    resetLiveJournalHubForTests();
  });

  it('notifies journal snapshot subscribers', () => {
    const listener = vi.fn();
    const unsub = subscribeJournalSnapshotUpdated(listener);

    publishJournalSnapshotUpdated({ version: 2, itemCount: 3 });

    expect(listener).toHaveBeenCalledWith({ version: 2, itemCount: 3 });
    unsub();
  });

  it('notifies journal cleared subscribers (JS4)', () => {
    const listener = vi.fn();
    const unsub = subscribeJournalCleared(listener);

    publishJournalCleared({ filter: 'tracks', deletedCount: 4 });

    expect(listener).toHaveBeenCalledWith({ filter: 'tracks', deletedCount: 4 });
    unsub();
  });
});
