import type { MediaLibrarySampleImportedPayload } from '@membrana/media-library-service';
import {
  LIVE_JOURNAL_MODULE_NAME,
  TELEMETRY_TRACK_SCHEMA_VERSION,
  getDefaultLiveJournalService,
  liveJournalTrackClientEntryId,
} from '@membrana/telemetry-journal-service';

import { micBufferRecorderPluginState } from '@/plugins/mic-buffer-recorder/micBufferRecorderPluginState';
import { MIC_BUFFER_RECORDER_PLUGIN_ID } from '@/plugins/mic-buffer-recorder/types';

function createTrackId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** Live journal writes only while microphone stream is active (TJ3 gate). */
export function isLiveJournalTrackCaptureEnabled(): boolean {
  return micBufferRecorderPluginState.getSnapshot().streamLive;
}

/** Append telemetry-track/v1 row after mic clip import (TJ3). */
export async function appendLiveJournalTrackFromSampleImport(
  payload: MediaLibrarySampleImportedPayload,
): Promise<void> {
  if (payload.sourcePluginId !== MIC_BUFFER_RECORDER_PLUGIN_ID) return;
  if (!isLiveJournalTrackCaptureEnabled()) return;

  const trackId = createTrackId();
  const createdAtIso = new Date().toISOString();

  await getDefaultLiveJournalService().appendTrack({
    clientEntryId: liveJournalTrackClientEntryId(trackId),
    moduleId: payload.moduleId,
    moduleName: LIVE_JOURNAL_MODULE_NAME,
    track: {
      schema: TELEMETRY_TRACK_SCHEMA_VERSION,
      trackId,
      sampleId: payload.sampleId,
      title: payload.title,
      durationSec: payload.durationSec,
      sampleRate: payload.sampleRate,
      captureMode: payload.captureMode === 'manual' ? 'manual' : 'auto',
      createdAtIso,
    },
  });
}
