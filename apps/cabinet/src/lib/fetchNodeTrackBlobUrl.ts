import { getCabinetMediaLibrary } from '@/lib/cabinetMediaLibrary';

/** Fetch sample blob from media API and return an object URL for `<audio src>`. */
export async function fetchNodeTrackBlobUrl(deviceId: string, sampleId: string): Promise<string> {
  const service = await getCabinetMediaLibrary(deviceId);
  const blob = await service.getSampleBlob(sampleId);
  return URL.createObjectURL(blob);
}
