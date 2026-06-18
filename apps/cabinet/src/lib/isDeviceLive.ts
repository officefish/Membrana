/** Подсказка для disabled-кнопки «Пуск» при офлайн-устройстве (DBR6). */
export const DEVICE_OFFLINE_RUN_HINT = 'нет связи с устройством';

/**
 * Критерий «связь жива» для gating Пуска в кабинете (DBR6).
 * Устройство должно быть сопряжено и присутствовать в online-presence map.
 */
export function isDeviceLive(
  deviceId: string | null | undefined,
  onlineDeviceIds: ReadonlySet<string>,
): boolean {
  if (deviceId === null || deviceId === undefined || deviceId.length === 0) {
    return false;
  }
  return onlineDeviceIds.has(deviceId);
}
