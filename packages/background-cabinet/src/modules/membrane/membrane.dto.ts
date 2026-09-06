import type { NodeAccessKeyDuration } from '../../prisma/client';

export interface CreateAccessKeyDto {
  duration: NodeAccessKeyDuration;
}

export interface CreateNodeDto {
  label?: string;
}

/**
 * Политика переполнения (#2308). Тело принимается СЫРЫМ (`unknown`): гейт параметров судит
 * домен (`parseBufferPolicy`) причиной из закрытого списка, а не форма DTO статусом 400.
 */
export interface SetBufferPolicyDto {
  mode?: unknown;
  params?: unknown;
}

/** Галочка-привязка. `confirmed: true` обязателен при включении — подтверждение живёт и на сервере. */
export interface SetBufferPolicyBindingDto {
  applyToAll?: unknown;
  confirmed?: unknown;
}
