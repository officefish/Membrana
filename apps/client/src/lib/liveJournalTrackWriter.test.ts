import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  LIVE_JOURNAL_MODULE_NAME,
  TELEMETRY_TRACK_SCHEMA_VERSION,
  configureDefaultLiveJournalService,
  createMemoryJournalStorageBackend,
  getDefaultLiveJournalService,
  resetDefaultLiveJournalServiceForTests,
} from '@membrana/telemetry-journal-service';

import {
  appendLiveJournalTrackFromSampleImport,
  isLiveJournalTrackCaptureEnabled,
} from './liveJournalTrackWriter';
import { micBufferRecorderPluginState } from '@/plugins/mic-buffer-recorder/micBufferRecorderPluginState';
import { MIC_BUFFER_RECORDER_PLUGIN_ID } from '@/plugins/mic-buffer-recorder/types';

describe('liveJournalTrackWriter', () => {
  afterEach(() => {
    resetDefaultLiveJournalServiceForTests();
    micBufferRecorderPluginState.reset();
  });

  beforeEach(() => {
    resetDefaultLiveJournalServiceForTests();
  });

  it('gates writes when microphone stream is offline', async () => {
    const backend = createMemoryJournalStorageBackend();
    configureDefaultLiveJournalService(backend);

    expect(isLiveJournalTrackCaptureEnabled()).toBe(false);

    await appendLiveJournalTrackFromSampleImport({
      sampleId: 'sample-1',
      moduleId: 'mic-mod',
      sourcePluginId: MIC_BUFFER_RECORDER_PLUGIN_ID,
      captureMode: 'auto',
      reason: 'auto',
      title: 'mic-auto-5s',
      durationSec: 5,
      sampleRate: 48_000,
    });

    expect((await backend.listItems()).length).toBe(0);
  });

  it('appends track row when stream is live', async () => {
    const backend = createMemoryJournalStorageBackend();
    const service = configureDefaultLiveJournalService(backend);
    await service.init();

    micBufferRecorderPluginState.setStreamLive(true);

    await appendLiveJournalTrackFromSampleImport({
      sampleId: 'sample-2',
      moduleId: 'mic-mod',
      sourcePluginId: MIC_BUFFER_RECORDER_PLUGIN_ID,
      captureMode: 'auto',
      reason: 'auto',
      title: 'mic-auto-5s',
      durationSec: 5,
      sampleRate: 48_000,
    });

    const items = getDefaultLiveJournalService().getSnapshot().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe('track');
    expect(items[0]?.moduleName).toBe(LIVE_JOURNAL_MODULE_NAME);
    expect(items[0]?.track?.schema).toBe(TELEMETRY_TRACK_SCHEMA_VERSION);
    expect(items[0]?.track?.sampleId).toBe('sample-2');
    expect(items[0]?.track?.captureMode).toBe('auto');
  });
});
