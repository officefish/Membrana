import { getCabinetMediaLibrary } from '@/lib/cabinetMediaLibrary';

/** Fetch sample blob from media API (raw Blob — for decode/waveform). */
export async function fetchNodeTrackBlob(deviceId: string, sampleId: string): Promise<Blob> {
  const service = await getCabinetMediaLibrary(deviceId);
  return service.getSampleBlob(sampleId);
}

/** Fetch sample blob from media API and return an object URL for `<audio src>`. */
export async function fetchNodeTrackBlobUrl(deviceId: string, sampleId: string): Promise<string> {
  const blob = await fetchNodeTrackBlob(deviceId, sampleId);
  return URL.createObjectURL(blob);
}
