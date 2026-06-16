import { describe, expect, it } from 'vitest';

import { CABINET_LIVE_JOURNAL_REFRESH_MS } from './useCabinetLiveJournal';

describe('useCabinetLiveJournal', () => {
  it('uses 1s refresh interval for cabinet journal (JE4)', () => {
    expect(CABINET_LIVE_JOURNAL_REFRESH_MS).toBe(1_000);
  });
});
