import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BUFFER_COLLECTION_ID,
  createMediaLibraryService,
  getDefaultMediaLibraryService,
  MemoryStorageBackend,
  resetDefaultMediaLibraryServiceForTests,
  setDefaultMediaLibraryServiceForTests,
} from '@membrana/media-library-service';
import {
  configureDefaultLiveJournalService,
  createMemoryJournalStorageBackend,
  getDefaultLiveJournalService,
  resetDefaultLiveJournalServiceForTests,
} from '@membrana/telemetry-journal-service';

import {
  publishMediaLibraryCaptureStop,
  resetMediaLibraryHubForTests,
  subscribeMediaLibraryBufferCleared,
  subscribeMediaLibrarySampleImported,
} from './mediaLibraryHub';
import {
  initMediaLibraryHubBridge,
  requestClearMediaLibraryBuffer,
  resetMediaLibraryHubBridgeForTests,
  tryUpgradeMediaLibraryToRemote,
} from './mediaLibraryHubBridge';
import { resolveMediaLibraryBackend } from './resolveMediaLibraryBackend';
import { micBufferRecorderPluginState } from '@/plugins/mic-buffer-recorder/micBufferRecorderPluginState';

vi.mock('./resolveMediaLibraryBackend', () => ({
  resolveMediaLibraryBackend: vi.fn(),
}));

describe('mediaLibraryHubBridge', () => {
  afterEach(() => {
    micBufferRecorderPluginState.reset();
    resetMediaLibraryHubForTests();
    resetMediaLibraryHubBridgeForTests();
    resetDefaultMediaLibraryServiceForTests();
    resetDefaultLiveJournalServiceForTests();
    vi.mocked(resolveMediaLibraryBackend).mockReset();
  });

  it('imports blob into buffer on capture.stop', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 1024 * 1024 });
    vi.mocked(resolveMediaLibraryBackend).mockResolvedValue(backend);
    const svc = createMediaLibraryService(backend);
    setDefaultMediaLibraryServiceForTests(svc);

    initMediaLibraryHubBridge();
    await svc.init();

    publishMediaLibraryCaptureStop({
      reason: 'user',
      sourcePluginId: 'mic-buffer-recorder',
      blob: new Blob(['wav-data'], { type: 'audio/wav' }),
      meta: {
        title: 'clip',
        class: 'unlabeled',
        label: 'unlabeled',
        durationSec: 1.5,
        sampleRate: 48_000,
        channels: 1,
      },
    });

    await vi.waitFor(() => {
      const active = getDefaultMediaLibraryService();
      const samples = active.getSnapshot().samplesByCollection[BUFFER_COLLECTION_ID] ?? [];
      expect(samples.length).toBe(1);
    });

    const sample = getDefaultMediaLibraryService().getSnapshot().samplesByCollection[BUFFER_COLLECTION_ID]?.[0];
    expect(sample?.title).toBe('clip');
    expect(sample?.source).toBe('mic-recording');
  });

  it('clears buffer and publishes bufferCleared hub event', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 1024 * 1024 });
    vi.mocked(resolveMediaLibraryBackend).mockResolvedValue(backend);
    const svc = createMediaLibraryService(backend);
    setDefaultMediaLibraryServiceForTests(svc);

    initMediaLibraryHubBridge();
    await svc.init();

    publishMediaLibraryCaptureStop({
      reason: 'user',
      sourcePluginId: 'mic-buffer-recorder',
      blob: new Blob(['wav-data'], { type: 'audio/wav' }),
      meta: {
        title: 'clip',
        class: 'unlabeled',
        label: 'unlabeled',
        durationSec: 1.5,
        sampleRate: 48_000,
        channels: 1,
      },
    });

    await vi.waitFor(() => {
      expect(
        getDefaultMediaLibraryService().getSnapshot().samplesByCollection[BUFFER_COLLECTION_ID]?.length,
      ).toBe(1);
    });

    let bufferCleared = false;
    subscribeMediaLibraryBufferCleared(() => {
      bufferCleared = true;
    });

    await requestClearMediaLibraryBuffer();

    expect(bufferCleared).toBe(true);
    const samples =
      getDefaultMediaLibraryService().getSnapshot().samplesByCollection[BUFFER_COLLECTION_ID] ?? [];
    expect(samples.length).toBe(0);
  });

  it('publishes sampleImported with linked journal track id', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 1024 * 1024 });
    vi.mocked(resolveMediaLibraryBackend).mockResolvedValue(backend);
    const svc = createMediaLibraryService(backend);
    setDefaultMediaLibraryServiceForTests(svc);
    configureDefaultLiveJournalService(createMemoryJournalStorageBackend());
    micBufferRecorderPluginState.setStreamLive(true);

    initMediaLibraryHubBridge();
    await svc.init();

    let importedTrackId: string | undefined;
    const unsub = subscribeMediaLibrarySampleImported((payload) => {
      importedTrackId = payload.journalTrackId;
    });

    publishMediaLibraryCaptureStop({
      reason: 'auto',
      sourcePluginId: 'mic-buffer-recorder',
      moduleId: 'microphone',
      captureMode: 'auto',
      blob: new Blob(['wav-data'], { type: 'audio/wav' }),
      meta: {
        title: 'clip-auto',
        class: 'unlabeled',
        label: 'unlabeled',
        durationSec: 1.5,
        sampleRate: 48_000,
        channels: 1,
      },
    });

    await vi.waitFor(() => {
      expect(importedTrackId).toBeTruthy();
    });
    const trackId = importedTrackId as string;
    const trackItems = getDefaultLiveJournalService()
      .getSnapshot()
      .items.filter((item) => item.kind === 'track');
    expect(trackItems).toHaveLength(1);
    expect(trackItems[0]?.track?.trackId).toBe(trackId);
    unsub();
  });
});

/**
 * #2538, porcha P2 (красная на стволе d364ef64): тик связанного режима при ЖИВОМ серверном
 * бэкенде обязан перечитать предел прибора — лёгким refreshQuota(), без списков. На стволе
 * tryUpgradeMediaLibraryToRemote при server+reachable не делал ничего, и смена тарифа на сервере
 * до прибора не доезжала.
 */
describe('tryUpgradeMediaLibraryToRemote — предел перечитывается тиком (#2538)', () => {
  const PAIRING = {
    token: 't',
    expiresAt: '2027-01-01T00:00:00.000Z',
    deviceId: 'dev',
    mediaToken: 'm',
    mediaApiUrl: 'https://media.test',
    membraneId: 'mem',
    nodeId: 'node',
    nodeLabel: 'node',
  };

  afterEach(() => {
    resetDefaultMediaLibraryServiceForTests();
    resetMediaLibraryHubBridgeForTests();
  });

  it('P2: живой серверный бэкенд → один getQuota, списки не трогаются, новый предел в снимке', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 512, backend: 'server', serverReachable: true });
    const svc = createMediaLibraryService(backend);
    setDefaultMediaLibraryServiceForTests(svc);
    await svc.refresh();
    const getQuota = vi.spyOn(backend, 'getQuota').mockResolvedValue({
      usedBytes: 486,
      limitBytes: 2048,
      backend: 'server',
      serverReachable: true,
      bufferUsedBytes: 486,
      bufferLimitBytes: 2048,
    });
    const listCollections = vi.spyOn(backend, 'listCollections');

    await tryUpgradeMediaLibraryToRemote('paired', PAIRING);

    expect(getQuota).toHaveBeenCalledTimes(1);
    expect(listCollections).not.toHaveBeenCalled();
    expect(svc.getSnapshot().quota.bufferLimitBytes).toBe(2048);
  });

  it('сервер был недоступен → прежний путь восстановления: полный refresh()', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 512, backend: 'server', serverReachable: false });
    const svc = createMediaLibraryService(backend);
    setDefaultMediaLibraryServiceForTests(svc);
    await svc.refresh();
    const refresh = vi.spyOn(svc, 'refresh');
    const refreshQuota = vi.spyOn(svc, 'refreshQuota');

    await tryUpgradeMediaLibraryToRemote('paired', PAIRING);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refreshQuota).not.toHaveBeenCalled();
  });

  it('не связан → ничего не читает', async () => {
    const backend = new MemoryStorageBackend({ limitBytes: 512, backend: 'server', serverReachable: true });
    const svc = createMediaLibraryService(backend);
    setDefaultMediaLibraryServiceForTests(svc);
    const getQuota = vi.spyOn(backend, 'getQuota');
    await tryUpgradeMediaLibraryToRemote('autonomous', null);
    expect(getQuota).not.toHaveBeenCalled();
  });
});
