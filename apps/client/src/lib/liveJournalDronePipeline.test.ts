import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDroneDetectionReport } from '@membrana/detector-report';
import {
  configureDefaultLiveJournalService,
  createMemoryJournalStorageBackend,
  getDefaultLiveJournalService,
  resetDefaultLiveJournalServiceForTests,
} from '@membrana/telemetry-journal-service';

import { runLiveJournalTrackAndDroneAnalysis } from './liveJournalDronePipeline';
import { micBufferRecorderPluginState } from '@/plugins/mic-buffer-recorder/micBufferRecorderPluginState';
import { MIC_BUFFER_RECORDER_PLUGIN_ID } from '@/plugins/mic-buffer-recorder/types';

vi.mock('@/plugins/sample-library-drone-analysis/analyzeSampleDetectors', () => ({
  analyzeSampleDetectors: vi.fn(),
}));

import { analyzeSampleDetectors } from '@/plugins/sample-library-drone-analysis/analyzeSampleDetectors';

const samplePayload = {
  sampleId: 'sample-live-1',
  moduleId: 'mic-mod',
  sourcePluginId: MIC_BUFFER_RECORDER_PLUGIN_ID,
  captureMode: 'auto' as const,
  reason: 'auto' as const,
  title: 'mic-auto-5s',
  durationSec: 5,
  sampleRate: 48_000,
};

function sampleReport() {
  return buildDroneDetectionReport({
    reportId: 'report-live-1',
    sample: {
      id: 'sample-live-1',
      title: 'mic-auto-5s',
      sampleRate: 48_000,
      durationSec: 5,
    },
    verdicts: [
      {
        detectorName: 'harmonic',
        detectorFamily: 'dsp',
        isDrone: true,
        confidence: 0.9,
        breakdown: {
          kind: 'harmonic',
          aggregation: 'any-frame',
          frames: [],
        },
      },
    ],
  });
}

describe('runLiveJournalTrackAndDroneAnalysis', () => {
  beforeEach(() => {
    resetDefaultLiveJournalServiceForTests();
    configureDefaultLiveJournalService(createMemoryJournalStorageBackend());
    micBufferRecorderPluginState.setStreamLive(true);
    vi.mocked(analyzeSampleDetectors).mockResolvedValue({
      verdicts: [],
      report: sampleReport(),
    });
  });

  afterEach(() => {
    resetDefaultLiveJournalServiceForTests();
    micBufferRecorderPluginState.reset();
    vi.mocked(analyzeSampleDetectors).mockReset();
  });

  it('appends track and linked report after analysis', async () => {
    await runLiveJournalTrackAndDroneAnalysis(samplePayload);

    expect(analyzeSampleDetectors).toHaveBeenCalledWith('sample-live-1', 'mic-auto-5s');

    const items = getDefaultLiveJournalService().getSnapshot().items;
    expect(items).toHaveLength(2);

    const track = items.find((item) => item.kind === 'track');
    const report = items.find((item) => item.kind === 'report');
    expect(track?.track?.sampleId).toBe('sample-live-1');
    expect(report?.report?.trackId).toBe(track?.track?.trackId);
    expect(report?.report?.schema).toBe('drone-detection-report/v1');
    expect(report?.report?.isDetected).toBe(true);
  });

  it('skips when microphone stream is offline', async () => {
    micBufferRecorderPluginState.setStreamLive(false);

    await runLiveJournalTrackAndDroneAnalysis(samplePayload);

    expect(analyzeSampleDetectors).not.toHaveBeenCalled();
    expect(getDefaultLiveJournalService().getSnapshot().items).toHaveLength(0);
  });
});
