import type { Entity, Timestamp } from '@membrana/core';

/** Тип устройства. */
export type DeviceKind = 'sensor' | 'thermostat' | 'switch' | 'camera' | 'other';

/** Статус подключения устройства. */
export type DeviceStatus = 'online' | 'offline' | 'unknown';

/** Устройство в системе. */
export interface Device extends Entity {
  readonly name: string;
  readonly kind: DeviceKind;
  readonly status: DeviceStatus;
  readonly lastSeenAt?: Timestamp;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

/** Данные для регистрации устройства. */
export interface RegisterDeviceInput {
  readonly name: string;
  readonly kind: DeviceKind;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}
