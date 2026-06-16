import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDroneDetectionReport } from '@membrana/detector-report';
import {
  configureDefaultLiveJournalService,
  createMemoryJournalStorageBackend,
  getDefaultLiveJournalService,
  resetDefaultLiveJournalServiceForTests,
} from '@membrana/telemetry-journal-service';

import { publishMediaLibrarySampleImported, resetMediaLibraryHubForTests } from '@/lib/mediaLibraryHub';
import { createMicLiveDroneAnalysisPlugin } from '@/plugins/mic-live-drone-analysis/micLiveDroneAnalysisPlugin';
import { micLiveDronePluginState } from '@/plugins/mic-live-drone-analysis/micLiveDronePluginState';
import { MIC_BUFFER_RECORDER_PLUGIN_ID } from '@/plugins/mic-buffer-recorder/types';

vi.mock('@/plugins/sample-library-drone-analysis/analyzeSampleDetectors', () => ({
  analyzeSampleDetectors: vi.fn(),
}));

import { analyzeSampleDetectors } from '@/plugins/sample-library-drone-analysis/analyzeSampleDetectors';

const moduleId = 'microphone-mod-1';

const samplePayload = {
  sampleId: 'sample-live-1',
  moduleId,
  sourcePluginId: MIC_BUFFER_RECORDER_PLUGIN_ID,
  captureMode: 'auto' as const,
  reason: 'auto' as const,
  title: 'mic-auto-5s',
  durationSec: 5,
  sampleRate: 48_000,
  journalTrackId: 'track-live-1',
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

describe('mic-live-drone-analysis plugin', () => {
  beforeEach(() => {
    resetMediaLibraryHubForTests();
    resetDefaultLiveJournalServiceForTests();
    configureDefaultLiveJournalService(createMemoryJournalStorageBackend());
    micLiveDronePluginState.reset();
    vi.mocked(analyzeSampleDetectors).mockResolvedValue({
      verdicts: [],
      report: sampleReport(),
    });
  });

  afterEach(() => {
    resetMediaLibraryHubForTests();
    resetDefaultLiveJournalServiceForTests();
    micLiveDronePluginState.reset();
    vi.mocked(analyzeSampleDetectors).mockReset();
  });

  it('appends linked report when plugin is active and journalTrackId present', async () => {
    const plugin = createMicLiveDroneAnalysisPlugin();
    const teardown = plugin.install({
      moduleId,
      config: { autoAnalyzeOnImport: true },
    } as never);

    publishMediaLibrarySampleImported(samplePayload);

    await vi.waitFor(() => {
      expect(analyzeSampleDetectors).toHaveBeenCalledWith('sample-live-1', 'mic-auto-5s');
    });

    await vi.waitFor(() => {
      expect(micLiveDronePluginState.getSnapshot().status).toBe('ready');
    });

    const items = getDefaultLiveJournalService().getSnapshot().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe('report');
    expect(items[0]?.report?.trackId).toBe('track-live-1');

    teardown();
  });

  it('skips analysis without journalTrackId', async () => {
    const plugin = createMicLiveDroneAnalysisPlugin();
    const teardown = plugin.install({
      moduleId,
      config: { autoAnalyzeOnImport: true },
    } as never);

    publishMediaLibrarySampleImported({
      ...samplePayload,
      journalTrackId: undefined,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(analyzeSampleDetectors).not.toHaveBeenCalled();
    expect(getDefaultLiveJournalService().getSnapshot().items).toHaveLength(0);

    teardown();
  });

  it('ignores imports from other modules', async () => {
    const plugin = createMicLiveDroneAnalysisPlugin();
    const teardown = plugin.install({
      moduleId,
      config: { autoAnalyzeOnImport: true },
    } as never);

    publishMediaLibrarySampleImported({
      ...samplePayload,
      moduleId: 'other-module',
    });

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(analyzeSampleDetectors).not.toHaveBeenCalled();

    teardown();
  });

  it('skips analysis when autoAnalyzeOnImport is disabled', async () => {
    const plugin = createMicLiveDroneAnalysisPlugin();
    const teardown = plugin.install({
      moduleId,
      config: { autoAnalyzeOnImport: false },
    } as never);

    publishMediaLibrarySampleImported(samplePayload);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(analyzeSampleDetectors).not.toHaveBeenCalled();
    expect(getDefaultLiveJournalService().getSnapshot().items).toHaveLength(0);

    teardown();
  });
});
