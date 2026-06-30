import type { MediaLibrarySampleImportedPayload } from '@membrana/media-library-service';

import { analyzeSampleDetectors } from '@/plugins/sample-library-drone-analysis/analyzeSampleDetectors';
import { appendLiveJournalReportFromDroneDetection } from '@/lib/liveJournalReportWriter';
import {
  appendLiveJournalTrackFromSampleImport,
  isLiveJournalTrackCaptureEnabled,
} from '@/lib/liveJournalTrackWriter';
import { MIC_BUFFER_RECORDER_PLUGIN_ID } from '@/plugins/mic-buffer-recorder/types';

/** Live mic clip → journal track + drone analysis report (TJ4). */
export async function runLiveJournalTrackAndDroneAnalysis(
  payload: MediaLibrarySampleImportedPayload,
): Promise<void> {
  if (payload.sourcePluginId !== MIC_BUFFER_RECORDER_PLUGIN_ID) return;
  if (!isLiveJournalTrackCaptureEnabled()) return;

  const trackResult = await appendLiveJournalTrackFromSampleImport(payload);
  if (!trackResult) return;

  try {
    const { report } = await analyzeSampleDetectors(payload.sampleId, payload.title);
    await appendLiveJournalReportFromDroneDetection({
      moduleId: payload.moduleId,
      trackId: trackResult.trackId,
      report,
    });
  } catch (err) {
    console.error('[liveJournalDronePipeline] drone analysis failed', err);
  }
}
