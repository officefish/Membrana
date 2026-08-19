/**
 * Ключ полевого узла (ADR-0027 Р3; блок b2 спринта firebat-node-device, #1998).
 *
 * Ключ — отдельная сущность жизненного цикла: выдать · сменить · отозвать. На сервере живёт
 * ТОЛЬКО sha256-хеш; сырой ключ отдаётся один раз при выдаче. Ключ привязан к одному
 * устройству и даёт права только на ручки узла этого устройства (guard рядом). Ключ ≠ nodeId
 * наблюдения: секрет в данные записи не попадает.
 *
 * Хранилище вынесено за интерфейс, чтобы зубы шли без Postgres (класс зубов
 * plugin-results-bridge: подмена параметром, не моком модуля).
 */
import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service';

export const NODE_KEY_HEADER = 'x-membrana-node-key';
/** Длина сырого ключа в байтах до base64url. */
export const NODE_KEY_BYTES = 32;

/** Закрытый словарь исходов проверки ключа — единые имена для guard, лога и приёмки. */
export const NODE_KEY_VERDICTS = ['ok', 'missing', 'unknown', 'revoked', 'foreign_device'] as const;
export type NodeKeyVerdict = (typeof NODE_KEY_VERDICTS)[number];

export interface NodeKeyRow {
  id: string;
  deviceId: string;
  keyHash: string;
  createdAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}

/** Минимальный контракт хранилища: ровно то, что нужно жизненному циклу ключа. */
export interface NodeKeyStore {
  findActiveByDevice(deviceId: string): Promise<NodeKeyRow | null>;
  findByHash(keyHash: string): Promise<NodeKeyRow | null>;
  create(deviceId: string, keyHash: string): Promise<NodeKeyRow>;
  revoke(id: string, at: Date): Promise<void>;
  touch(id: string, at: Date): Promise<void>;
}

export interface IssuedNodeKey {
  /** Сырой ключ — показывается один раз, сервер его не хранит. */
  raw: string;
  keyId: string;
  deviceId: string;
  createdAt: Date;
  /** Ключ, отозванный при `rotate` (id), либо null. */
  rotatedFrom: string | null;
}

export type IssueOutcome =
  | { outcome: 'issued'; key: IssuedNodeKey }
  | { outcome: 'already_active'; keyId: string };

export type RevokeOutcome = { outcome: 'revoked'; keyId: string } | { outcome: 'no_active_key' };

export type VerifyOutcome =
  | { verdict: 'ok'; keyId: string; deviceId: string }
  | { verdict: Exclude<NodeKeyVerdict, 'ok'> };

export const hashNodeKey = (raw: string): string => createHash('sha256').update(raw, 'utf8').digest('hex');

const hexEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

/** Хранилище поверх Prisma — единственный писатель таблицы NodeKey. */
export class PrismaNodeKeyStore implements NodeKeyStore {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByDevice(deviceId: string): Promise<NodeKeyRow | null> {
    return this.prisma.nodeKey.findFirst({ where: { deviceId, revokedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  findByHash(keyHash: string): Promise<NodeKeyRow | null> {
    return this.prisma.nodeKey.findUnique({ where: { keyHash } });
  }

  create(deviceId: string, keyHash: string): Promise<NodeKeyRow> {
    return this.prisma.nodeKey.create({ data: { deviceId, keyHash } });
  }

  async revoke(id: string, at: Date): Promise<void> {
    await this.prisma.nodeKey.update({ where: { id }, data: { revokedAt: at } });
  }

  async touch(id: string, at: Date): Promise<void> {
    await this.prisma.nodeKey.update({ where: { id }, data: { lastUsedAt: at } });
  }
}

@Injectable()
export class NodeKeyService {
  private readonly store: NodeKeyStore;

  constructor(prisma: PrismaService, store?: NodeKeyStore, private readonly now: () => Date = () => new Date()) {
    this.store = store ?? new PrismaNodeKeyStore(prisma);
  }

  /** Выдать ключ устройству. Один активный ключ на устройство — инвариант; `rotate` отзывает прежний. */
  async issue(deviceId: string, opts: { rotate?: boolean } = {}): Promise<IssueOutcome> {
    const active = await this.store.findActiveByDevice(deviceId);
    let rotatedFrom: string | null = null;
    if (active) {
      if (!opts.rotate) return { outcome: 'already_active', keyId: active.id };
      await this.store.revoke(active.id, this.now());
      rotatedFrom = active.id;
    }
    const raw = randomBytes(NODE_KEY_BYTES).toString('base64url');
    const row = await this.store.create(deviceId, hashNodeKey(raw));
    return { outcome: 'issued', key: { raw, keyId: row.id, deviceId, createdAt: row.createdAt, rotatedFrom } };
  }

  /** Мягкий отзыв активного ключа (revokedAt) — строка остаётся для аудита. */
  async revoke(deviceId: string): Promise<RevokeOutcome> {
    const active = await this.store.findActiveByDevice(deviceId);
    if (!active) return { outcome: 'no_active_key' };
    await this.store.revoke(active.id, this.now());
    return { outcome: 'revoked', keyId: active.id };
  }

  /**
   * Проверить сырой ключ против устройства из пути. Чужое устройство — `foreign_device`
   * (не «unknown»: ключ настоящий, но не на этот адрес). Успех отмечает lastUsedAt.
   */
  async verify(raw: string | undefined, deviceId: string): Promise<VerifyOutcome> {
    if (typeof raw !== 'string' || raw === '') return { verdict: 'missing' };
    const hash = hashNodeKey(raw);
    const row = await this.store.findByHash(hash);
    if (!row || !hexEqual(row.keyHash, hash)) return { verdict: 'unknown' };
    if (row.revokedAt) return { verdict: 'revoked' };
    if (row.deviceId !== deviceId) return { verdict: 'foreign_device' };
    await this.store.touch(row.id, this.now());
    return { verdict: 'ok', keyId: row.id, deviceId: row.deviceId };
  }
}
