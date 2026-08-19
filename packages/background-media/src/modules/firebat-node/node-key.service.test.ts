/**
 * Зубы ключа узла (b2 firebat-node-device, ADR-0027 Р3): сырой ключ один раз, на сервере только
 * хеш; один активный ключ на устройство; rotate отзывает прежний; чужое устройство — foreign_device,
 * отозванный — revoked; словарь вердиктов закрыт. Хранилище — память, Postgres в зубах нет.
 */
import { describe, expect, it } from 'vitest';

import { NODE_KEY_VERDICTS, NodeKeyService, hashNodeKey, type NodeKeyRow, type NodeKeyStore } from './node-key.service';

class MemoryStore implements NodeKeyStore {
  rows: NodeKeyRow[] = [];
  private seq = 0;
  async findActiveByDevice(deviceId: string) {
    return [...this.rows].reverse().find((r) => r.deviceId === deviceId && r.revokedAt === null) ?? null;
  }
  async findByHash(keyHash: string) {
    return this.rows.find((r) => r.keyHash === keyHash) ?? null;
  }
  async create(deviceId: string, keyHash: string) {
    const row: NodeKeyRow = { id: `k${++this.seq}`, deviceId, keyHash, createdAt: new Date('2026-08-19T12:00:00Z'), revokedAt: null, lastUsedAt: null };
    this.rows.push(row);
    return row;
  }
  async revoke(id: string, at: Date) {
    this.rows.find((r) => r.id === id)!.revokedAt = at;
  }
  async touch(id: string, at: Date) {
    this.rows.find((r) => r.id === id)!.lastUsedAt = at;
  }
}

const make = () => {
  const store = new MemoryStore();
  const now = new Date('2026-08-19T13:00:00Z');
  const svc = new NodeKeyService(null as never, store, () => now);
  return { store, svc, now };
};

describe('NodeKeyService', () => {
  it('словарь вердиктов закрыт — пять имён', () => {
    expect([...NODE_KEY_VERDICTS]).toEqual(['ok', 'missing', 'unknown', 'revoked', 'foreign_device']);
  });

  it('issue: сырой ключ отдаётся один раз, в хранилище только sha256-хеш', async () => {
    const { store, svc } = make();
    const res = await svc.issue('dev-1');
    expect(res.outcome).toBe('issued');
    if (res.outcome !== 'issued') return;
    expect(res.key.raw).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]!.keyHash).toBe(hashNodeKey(res.key.raw));
    expect(JSON.stringify(store.rows)).not.toContain(res.key.raw);
  });

  it('issue: второй ключ на устройство без rotate — already_active; с rotate — прежний отозван', async () => {
    const { store, svc, now } = make();
    const first = await svc.issue('dev-1');
    const again = await svc.issue('dev-1');
    expect(again).toEqual({ outcome: 'already_active', keyId: 'k1' });
    const rotated = await svc.issue('dev-1', { rotate: true });
    expect(rotated.outcome).toBe('issued');
    if (rotated.outcome !== 'issued' || first.outcome !== 'issued') return;
    expect(rotated.key.rotatedFrom).toBe('k1');
    expect(store.rows[0]!.revokedAt).toEqual(now);
    expect(await svc.verify(first.key.raw, 'dev-1')).toEqual({ verdict: 'revoked' });
    expect((await svc.verify(rotated.key.raw, 'dev-1')).verdict).toBe('ok');
  });

  it('verify: ok отмечает lastUsedAt; пустой — missing; выдуманный — unknown', async () => {
    const { store, svc, now } = make();
    const res = await svc.issue('dev-1');
    if (res.outcome !== 'issued') throw new Error('issue failed');
    expect(await svc.verify(res.key.raw, 'dev-1')).toEqual({ verdict: 'ok', keyId: 'k1', deviceId: 'dev-1' });
    expect(store.rows[0]!.lastUsedAt).toEqual(now);
    expect(await svc.verify(undefined, 'dev-1')).toEqual({ verdict: 'missing' });
    expect(await svc.verify('', 'dev-1')).toEqual({ verdict: 'missing' });
    expect(await svc.verify('not-a-key', 'dev-1')).toEqual({ verdict: 'unknown' });
  });

  it('verify: ключ привязан к одному устройству — чужой deviceId это foreign_device, не unknown', async () => {
    const { svc } = make();
    const res = await svc.issue('dev-1');
    if (res.outcome !== 'issued') throw new Error('issue failed');
    expect(await svc.verify(res.key.raw, 'dev-2')).toEqual({ verdict: 'foreign_device' });
  });

  it('revoke: мягкий — строка остаётся; повторный revoke — no_active_key', async () => {
    const { store, svc, now } = make();
    await svc.issue('dev-1');
    expect(await svc.revoke('dev-1')).toEqual({ outcome: 'revoked', keyId: 'k1' });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]!.revokedAt).toEqual(now);
    expect(await svc.revoke('dev-1')).toEqual({ outcome: 'no_active_key' });
  });
});
