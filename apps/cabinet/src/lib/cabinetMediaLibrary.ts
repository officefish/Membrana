import {
  createMediaLibraryService,
  createServerStorageBackend,
  type MediaLibraryService,
} from '@membrana/media-library-service';

import type { MediaSession } from '@/api/sampleLibrary';
import { fetchMediaSession } from '@/api/sampleLibrary';

const DEFAULT_MEDIA_API_URL = 'https://media.membrana.space';

let sessionCache: MediaSession | null = null;
let service: MediaLibraryService | null = null;
let activeDeviceId: string | null = null;

/** Media API base: env override, session URL, or prod default. */
export function resolveCabinetMediaApiBase(urlFromSession: string): string {
  const fromEnv = import.meta.env.VITE_MEDIA_API_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  const trimmed = urlFromSession.replace(/\/$/, '');
  if (trimmed.length > 0) {
    return trimmed;
  }
  return DEFAULT_MEDIA_API_URL;
}

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
  const backend = createServerStorageBackend({
    baseUrl: resolveCabinetMediaApiBase(session.mediaApiUrl),
    deviceId,
    mediaToken: session.mediaToken,
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
