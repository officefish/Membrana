import { ServerStorageBackend, type SampleRefusal } from '@membrana/media-library-service';
import { isBufferOverflowRefusal } from '@membrana/plugin-contracts';

import { subscribeMediaLibraryBufferCleared } from '@/lib/mediaLibraryHub';

import { getDeviceOverflowHold } from './deviceOverflowHold';
import type { DeviceOverflowHold, OverflowRefusalSnapshot } from './types';

let installedFor: DeviceOverflowHold | null = null;
let uninstall: (() => void) | null = null;

/**
 * Сырой доменный отказ транспорта → снимок для носителя. Судит ИМПОРТИРОВАННЫЙ предикат словаря A
 * (`isBufferOverflowRefusal`, адаптер A-3 контракта интеграции): чужая причина (T15), дыра в
 * эпизоде или в осях → `null`, удержание «по серверу» не открывается — сервер обязан чеканить
 * эпизод целиком (M2). Своих строк словаря здесь нет.
 */
export function toOverflowRefusalSnapshot(refusal: SampleRefusal): OverflowRefusalSnapshot | null {
  if (!isBufferOverflowRefusal(refusal.raw)) return null;
  const body = refusal.raw;
  return {
    reason: body.reason,
    overflowId: body.overflowId,
    overflowAt: body.overflowAt,
    overflowPolicy: body.overflowPolicy,
    buffer: body.buffer,
    userStorage: body.userStorage,
  };
}

/**
 * Проводка носителя к пути отправки (M3 (б) главный источник + DoD 1):
 *  - доменный отказ сервера на POST пробы → `activateFromServer` (через словарь A);
 *  - шлюз отправки: при удержании `putSample` не делает fetch — 0 POST, 0 ретраев;
 *  - очистка буфера (`mediaLibrary.bufferCleared`) → `release('cleanup')`.
 * Идемпотентна: плагин, доска и мост состояния зовут её каждый — ставится один раз.
 */
export function installDeviceOverflowHoldWiring(
  hold: DeviceOverflowHold = getDeviceOverflowHold(),
): () => void {
  if (installedFor === hold && uninstall !== null) {
    return uninstall;
  }
  uninstall?.();

  ServerStorageBackend.setSampleUploadGate(() => hold.isHeld());
  const offRefusal = ServerStorageBackend.onSampleRefusal((refusal) => {
    const snapshot = toOverflowRefusalSnapshot(refusal);
    if (snapshot === null) return;
    hold.activateFromServer(snapshot);
  });
  const offCleared = subscribeMediaLibraryBufferCleared(() => {
    hold.release('cleanup');
  });

  installedFor = hold;
  uninstall = () => {
    offRefusal();
    offCleared();
    ServerStorageBackend.setSampleUploadGate(null);
    installedFor = null;
    uninstall = null;
  };
  return uninstall;
}

/** Тесты: снять проводку и очистить реестр бэкенда. */
export function resetDeviceOverflowHoldWiringForTests(): void {
  uninstall?.();
  ServerStorageBackend.resetSampleRefusalWiringForTests();
}
