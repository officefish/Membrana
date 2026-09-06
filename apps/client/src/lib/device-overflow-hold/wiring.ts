import { ServerStorageBackend } from '@membrana/media-library-service';

import { subscribeMediaLibraryBufferCleared } from '@/lib/mediaLibraryHub';

import { getDeviceOverflowHold } from './deviceOverflowHold';
import { toOverflowRefusalSnapshotStub } from './stubs/refusal-contract.stub';
import type { DeviceOverflowHold } from './types';

let installedFor: DeviceOverflowHold | null = null;
let uninstall: (() => void) | null = null;

/**
 * Проводка носителя к пути отправки (M3 (б) главный источник + DoD 1):
 *  - доменный отказ сервера на POST пробы → `activateFromServer` (через стаб словаря A);
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
    const snapshot = toOverflowRefusalSnapshotStub(refusal);
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
