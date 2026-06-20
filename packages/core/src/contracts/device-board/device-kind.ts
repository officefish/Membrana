/**
 * Тип прибора / клиента Membrana (канон device-board).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §6.1
 */

/** Поддерживаемые виды полевых клиентов. */
export const DEVICE_KINDS = [
  'microphone',
  'mic-array',
  'rf-antenna',
  'sonar',
  'thermal-camera',
  'optical-camera',
  'ads-b-receiver',
] as const;

/** Идентификатор вида прибора. */
export type DeviceKind = (typeof DEVICE_KINDS)[number];

/** Type guard для `DeviceKind`. */
export function isDeviceKind(value: string): value is DeviceKind {
  return (DEVICE_KINDS as readonly string[]).includes(value);
}
