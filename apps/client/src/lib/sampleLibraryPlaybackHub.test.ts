import { describe, expect, it } from 'vitest';

import {
  getSamplePlaybackSnapshot,
  resetSamplePlaybackHubForTests,
  selectSample,
  subscribeSamplePlayback,
} from './sampleLibraryPlaybackHub';

describe('sampleLibraryPlaybackHub', () => {
  it('updates snapshot when sample is cleared', async () => {
    resetSamplePlaybackHubForTests();
    const seen: string[] = [];
    const unsub = subscribeSamplePlayback(() => {
      seen.push(getSamplePlaybackSnapshot().status);
    });

    await selectSample(null);
    unsub();

    expect(getSamplePlaybackSnapshot().selectedSampleId).toBeNull();
    expect(getSamplePlaybackSnapshot().status).toBe('idle');
    expect(seen.length).toBeGreaterThan(0);
  });
});
