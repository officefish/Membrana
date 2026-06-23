import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

const LOCAL_DEVICE_ID_KEY = 'membrana.client.localDeviceId';

function readOrCreateLocalDeviceId(): string {
  if (typeof localStorage === 'undefined') {
    return 'local-anonymous';
  }
  const existing = localStorage.getItem(LOCAL_DEVICE_ID_KEY);
  if (existing !== null && existing.length > 0) {
    return existing;
  }
  const created =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `local-${crypto.randomUUID()}`
      : `local-${Date.now()}`;
  localStorage.setItem(LOCAL_DEVICE_ID_KEY, created);
  return created;
}

/** deviceId для IndexedDB workspace store: paired → cabinet id, иначе стабильный local. */
export function resolveDeviceBoardPersistDeviceId(
  pairing: PairedNodeCredentials | null,
): string {
  if (pairing !== null) {
    return pairing.deviceId;
  }
  return readOrCreateLocalDeviceId();
}
