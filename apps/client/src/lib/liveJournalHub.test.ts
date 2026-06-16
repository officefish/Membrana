import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  publishJournalSnapshotUpdated,
  resetLiveJournalHubForTests,
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
});
