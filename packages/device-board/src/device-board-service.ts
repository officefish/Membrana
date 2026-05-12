import {
  type Id,
  type Result,
  ok,
  err,
  generateId,
  NotFoundError,
  ValidationError,
  type DomainError,
} from '@membrana/core';

import type { Device, DeviceStatus, RegisterDeviceInput } from './types.js';

/**
 * In-memory сервис управления устройствами.
 * Заменяется на реализацию с реальным хранилищем в проде.
 */
export class DeviceBoardService {
  private readonly devices = new Map<Id, Device>();

  register(input: RegisterDeviceInput): Result<Device, DomainError> {
    if (input.name.trim().length === 0) {
      return err(new ValidationError('name не может быть пустым', 'name'));
    }

    const now = Date.now();
    const device: Device = {
      id: generateId(),
      name: input.name,
      kind: input.kind,
      status: 'unknown',
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.devices.set(device.id, device);
    return ok(device);
  }

  updateStatus(
    id: Id,
    status: DeviceStatus,
  ): Result<Device, DomainError> {
    const device = this.devices.get(id);
    if (device === undefined) {
      return err(new NotFoundError('Device', id));
    }

    const updated: Device = {
      ...device,
      status,
      lastSeenAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.devices.set(id, updated);
    return ok(updated);
  }

  findById(id: Id): Result<Device, DomainError> {
    const device = this.devices.get(id);
    if (device === undefined) {
      return err(new NotFoundError('Device', id));
    }
    return ok(device);
  }

  list(): readonly Device[] {
    return Array.from(this.devices.values());
  }
}
