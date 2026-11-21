import {
  createMediaLibraryService,
  createServerStorageBackend,
  type MediaLibraryService,
} from '@membrana/media-library-service';

import type { MediaSession } from '@/api/sampleLibrary';
import { fetchMediaSession } from '@/api/sampleLibrary';
import { getApiBase } from '@/api/auth';
import { CABINET_MEDIA_DEVICES_PATH, cabinetSessionHeaders } from '@/lib/cabinetMediaAccess';

let sessionCache: MediaSession | null = null;
let service: MediaLibraryService | null = null;
let activeDeviceId: string | null = null;

export async function getMediaSession(force = false): Promise<MediaSession> {
  if (!force && sessionCache) return sessionCache;
  sessionCache = await fetchMediaSession();
  return sessionCache;
}

export async function getCabinetMediaLibrary(deviceId: string): Promise<MediaLibraryService> {
  const session = await getMediaSession();
  const allowed = session.devices.some((d) => d.deviceId === deviceId);
  if (!allowed) {
    throw new Error('Устройство не в области доступа сессии');
  }
  if (service && activeDeviceId === deviceId) {
    return service;
  }
  // Через сервер кабинета, сессией пользователя: прибор сверяется с мембраной на сервере.
  const backend = createServerStorageBackend({
    baseUrl: getApiBase(),
    deviceId,
    devicesPath: CABINET_MEDIA_DEVICES_PATH,
    requestHeaders: cabinetSessionHeaders,
  });
  service = createMediaLibraryService(backend);
  activeDeviceId = deviceId;
  await service.init();
  return service;
}

/** Drops cached service so the next request re-inits (e.g. after network error). */
export function invalidateCabinetMediaLibrary(): void {
  service = null;
  activeDeviceId = null;
}

/** Clears session + service cache (logout, switch membrane). */
export function resetCabinetMediaSession(): void {
  sessionCache = null;
  service = null;
  activeDeviceId = null;
}

export function resetCabinetMediaLibraryForTests(): void {
  resetCabinetMediaSession();
}
