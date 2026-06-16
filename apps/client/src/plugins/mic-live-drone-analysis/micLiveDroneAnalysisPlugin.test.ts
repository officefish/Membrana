import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AudioSampleFrame } from '@membrana/audio-engine-service';
import { buildBriefDroneDetectionReport, mapVerdictsToBrief } from '@membrana/detector-report';
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

vi.mock('@/plugins/mic-live-drone-analysis/analyzeSampleDetectorsBrief', () => ({
  analyzeSampleDetectorsBrief: vi.fn(),
}));

vi.mock('@/plugins/mic-live-drone-analysis/analyzeStreamDetectors', () => ({
  analyzeStreamDetectorsBrief: vi.fn(),
  syntheticStreamTrackId: vi.fn(
    (moduleId: string, reportId: string) => `stream:${moduleId}:${reportId}`,
  ),
}));

const frameHandlers: Array<(frame: AudioSampleFrame) => void> = [];
const mockFeed = {
  sourceKind: 'microphone' as const,
  subscribe: (handler: (frame: AudioSampleFrame) => void) => {
    frameHandlers.push(handler);
    return () => {
      const index = frameHandlers.indexOf(handler);
      if (index >= 0) frameHandlers.splice(index, 1);
    };
  },
  start: vi.fn(async () => {
    mockFeed.onStart?.();
  }),
  stop: vi.fn(async () => {
    mockFeed.onStop?.();
  }),
  onStart: undefined as (() => void) | undefined,
  onStop: undefined as (() => void) | undefined,
};

vi.mock('@/lib/audioAnalysis', () => ({
  createAnalysisFrameFeed: vi.fn((options: { onStart?: () => void; onStop?: () => void }) => {
    mockFeed.onStart = options.onStart;
    mockFeed.onStop = options.onStop;
    return mockFeed;
  }),
}));

import { analyzeSampleDetectorsBrief } from '@/plugins/mic-live-drone-analysis/analyzeSampleDetectorsBrief';
import { analyzeStreamDetectorsBrief } from '@/plugins/mic-live-drone-analysis/analyzeStreamDetectors';

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

function briefReport(reportId = 'report-live-1') {
  return buildBriefDroneDetectionReport({
    reportId,
    sample: {
      id: 'sample-live-1',
      title: 'mic-auto-5s',
      sampleRate: 48_000,
      durationSec: 5,
    },
    verdicts: mapVerdictsToBrief([
      {
        detectorName: 'harmonic',
        isDrone: true,
        confidence: 0.9,
      },
    ]),
    analysisMode: 'track-import',
  });
}

function streamBriefReport(reportId = 'report-stream-1') {
  return buildBriefDroneDetectionReport({
    reportId,
    sample: {
      id: `stream-${reportId}`,
      title: 'stream-auto-3s',
      sampleRate: 48_000,
      durationSec: 3,
    },
    verdicts: mapVerdictsToBrief([
      {
        detectorName: 'harmonic',
        isDrone: false,
        confidence: 0.2,
      },
    ]),
    analysisMode: 'stream-auto',
  });
}

function emitFrame(index: number): void {
  const frame: AudioSampleFrame = {
    samples: new Float32Array(2048),
    sampleRate: 48_000,
    timestamp: index * 100,
  };
  for (const handler of frameHandlers) {
    handler(frame);
  }
}

describe('mic-live-drone-analysis plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMediaLibraryHubForTests();
    resetDefaultLiveJournalServiceForTests();
    configureDefaultLiveJournalService(createMemoryJournalStorageBackend());
    micLiveDronePluginState.reset();
    frameHandlers.length = 0;
    vi.mocked(analyzeSampleDetectorsBrief).mockResolvedValue({
      verdicts: [],
      report: briefReport(),
    });
    vi.mocked(analyzeStreamDetectorsBrief).mockResolvedValue({
      verdicts: [],
      report: streamBriefReport(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    resetMediaLibraryHubForTests();
    resetDefaultLiveJournalServiceForTests();
    micLiveDronePluginState.reset();
    vi.mocked(analyzeSampleDetectorsBrief).mockReset();
    vi.mocked(analyzeStreamDetectorsBrief).mockReset();
  });

  it('appends brief linked report in track-import mode when journalTrackId present', async () => {
    const plugin = createMicLiveDroneAnalysisPlugin();
    const teardown = plugin.install({
      moduleId,
      config: { analysisMode: 'track-import' },
    } as never);

    publishMediaLibrarySampleImported(samplePayload);

    await vi.waitFor(() => {
      expect(analyzeSampleDetectorsBrief).toHaveBeenCalledWith('sample-live-1', 'mic-auto-5s');
    });

    await vi.waitFor(() => {
      expect(micLiveDronePluginState.getSnapshot().status).toBe('ready');
    });

    const items = getDefaultLiveJournalService().getSnapshot().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe('report');
    expect(items[0]?.report?.schema).toBe('drone-detection-brief/v1');
    expect(items[0]?.report?.trackId).toBe('track-live-1');

    teardown();
  });

  it('skips track-import analysis without journalTrackId', async () => {
    const plugin = createMicLiveDroneAnalysisPlugin();
    const teardown = plugin.install({
      moduleId,
      config: { analysisMode: 'track-import' },
    } as never);

    publishMediaLibrarySampleImported({
      ...samplePayload,
      journalTrackId: undefined,
    });

    await vi.advanceTimersByTimeAsync(20);

    expect(analyzeSampleDetectorsBrief).not.toHaveBeenCalled();
    expect(getDefaultLiveJournalService().getSnapshot().items).toHaveLength(0);

    teardown();
  });

  it('ignores imports from other modules', async () => {
    const plugin = createMicLiveDroneAnalysisPlugin();
    const teardown = plugin.install({
      moduleId,
      config: { analysisMode: 'track-import' },
    } as never);

    publishMediaLibrarySampleImported({
      ...samplePayload,
      moduleId: 'other-module',
    });

    await vi.advanceTimersByTimeAsync(20);

    expect(analyzeSampleDetectorsBrief).not.toHaveBeenCalled();

    teardown();
  });

  it('skips track-import when autoAnalyzeOnImport is disabled (legacy)', async () => {
    const plugin = createMicLiveDroneAnalysisPlugin();
    const teardown = plugin.install({
      moduleId,
      config: { analysisMode: 'track-import', autoAnalyzeOnImport: false },
    } as never);

    publishMediaLibrarySampleImported(samplePayload);
    await vi.advanceTimersByTimeAsync(20);

    expect(analyzeSampleDetectorsBrief).not.toHaveBeenCalled();
    expect(getDefaultLiveJournalService().getSnapshot().items).toHaveLength(0);

    teardown();
  });

  it('appends brief stream report after 3s window in stream-auto mode', async () => {
    const plugin = createMicLiveDroneAnalysisPlugin();
    const teardown = plugin.install({
      moduleId,
      config: {
        analysisMode: 'stream-auto',
        streamWindowSec: 3,
        streamPauseSec: 2,
      },
    } as never);

    await vi.waitFor(() => {
      expect(mockFeed.start).toHaveBeenCalled();
    });

    emitFrame(0);
    await vi.advanceTimersByTimeAsync(3000);
    emitFrame(1);

    await vi.waitFor(() => {
      expect(analyzeStreamDetectorsBrief).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(getDefaultLiveJournalService().getSnapshot().items).toHaveLength(1);
    });

    const report = getDefaultLiveJournalService().getSnapshot().items[0]?.report;
    expect(report?.schema).toBe('drone-detection-brief/v1');
    expect(report?.trackId).toBe(`stream:${moduleId}:report-stream-1`);

    teardown();
  });
});
