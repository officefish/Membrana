import type { DeviceCaptureView } from '@/api/deviceCapture';

/**
 * CX2: авторитетный снапшот захватов с сервера → карта по deviceId.
 * Семантика — полная замена (как presence-снапшот PL1): устройства, которых
 * нет в снапшоте, считаются отпущенными; локальные остатки не мерджим.
 */
export function capturesByDeviceId(
  list: readonly DeviceCaptureView[],
): Record<string, DeviceCaptureView> {
  return Object.fromEntries(list.map((capture) => [capture.deviceId, capture]));
}
