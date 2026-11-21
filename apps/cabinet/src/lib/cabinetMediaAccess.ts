/**
 * Доступ кабинета к библиотеке прибора — через сервер кабинета (`/v1/media/devices/:deviceId/*`),
 * сессией пользователя. Ключа media у браузера кабинета нет: сервер кабинета сам проверяет, что
 * прибор принадлежит мембране пользователя, и сам ходит в media.
 *
 * Один дом для адреса и заголовков: библиотека (`cabinetMediaLibrary.ts`), сценарий доски
 * (`cabinetDeviceScenario.ts`) и срок ключей треков (`api/sampleLibrary.ts`).
 */
import { getApiBase } from '@/api/auth';

/** Путь двери кабинета, под которым живут ручки библиотеки прибора. */
export const CABINET_MEDIA_DEVICES_PATH = '/v1/media/devices';

const SESSION_STORAGE_KEY = 'membrana.cabinet.sessionToken';

/** Заголовки сессии пользователя — читаются на каждый запрос (сессия может смениться). */
export function cabinetSessionHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(SESSION_STORAGE_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Адрес ручки библиотеки прибора на сервере кабинета; `path` — от `/v1/devices/:deviceId`. */
export function cabinetDeviceUrl(deviceId: string, path: string): string {
  return `${getApiBase()}${CABINET_MEDIA_DEVICES_PATH}/${encodeURIComponent(deviceId)}${path}`;
}
