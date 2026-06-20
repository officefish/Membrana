import { describe, expect, it, vi, afterEach } from 'vitest';

import { handleSamplePlaybackEscapeKey } from './hooks';
import * as service from './service';

describe('handleSamplePlaybackEscapeKey', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls stopSamplePlayback on Escape when sample is playing', () => {
    vi.spyOn(service, 'getSamplePlaybackSnapshot').mockReturnValue({
      selectedSampleId: 'sample-1',
      selectedTitle: 'Test',
      selectedCollectionId: 'buf',
      status: 'playing',
      currentTimeSec: 1,
      durationSec: 10,
      waveform: [],
      errorMessage: null,
    });
    const stop = vi.spyOn(service, 'stopSamplePlayback').mockResolvedValue();

    handleSamplePlaybackEscapeKey({ key: 'Escape', defaultPrevented: false });

    expect(stop).toHaveBeenCalledOnce();
  });

  it('does not stop when no sample is selected', () => {
    vi.spyOn(service, 'getSamplePlaybackSnapshot').mockReturnValue({
      selectedSampleId: null,
      selectedTitle: null,
      selectedCollectionId: null,
      status: 'idle',
      currentTimeSec: 0,
      durationSec: 0,
      waveform: [],
      errorMessage: null,
    });
    const stop = vi.spyOn(service, 'stopSamplePlayback').mockResolvedValue();

    handleSamplePlaybackEscapeKey({ key: 'Escape', defaultPrevented: false });

    expect(stop).not.toHaveBeenCalled();
  });
});
