/**
 * Зубы контракта отказа «места нет» (вердикт M2, #2307; блок A коворка
 * `cowork-buffer-full-stop`). Предмет — `SamplesService.uploadOrRefuse/upload/delete/move`
 * вместе с mapper'ом `buffer-overflow-refusal.ts` и реестром `OverflowEpisodeRegistry`.
 *
 * Инварианты M2 (сводка Математика): (1) транспорт не ошибка — промис РАЗРЕШАЕТСЯ, не
 * отвергается; (2) `ok === false`; (3) `reason` из закрытого набора; (4) четыре числа + политика +
 * `overflowId` (+ `overflowAt`); (5) `device_buffer_full` ⊥ `user_storage_full`.
 *
 * Порчи → красный: вернуть 413 на квоту (`rejects` вместо `resolves`); новый id на каждый отказ
 * (`Set.size === 1`); `release` не зовётся в `delete`/`move`/успехе (id не меняется, где должен);
 * буфер получает `user_storage_full`; в осях ответа утёк `backend`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BUFFER_OVERFLOW_REASONS } from '../../../../plugin-contracts/src/buffer-overflow/index.js';
import { OverflowEpisodeRegistry } from './overflow-episode-registry';
import { BufferOverflowRefusedException, SamplesService } from './samples.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const SAMPLE_BYTES = 100;

const BUFFER_COLLECTION = { id: 'col-buffer', kind: 'buffer' as const, systemKey: null };
const USER_COLLECTION = { id: 'col-user', kind: 'user' as const, systemKey: null };
const SYSTEM_COLLECTION = { id: 'col-sys', kind: 'system' as const, systemKey: 'journal' };

/**
 * Ответ `DevicesService.getQuota` так, как его отдаёт блок B после интеграции: поле
 * `bufferPolicy` — эффективная политика той же строки `Device` (backfill → `stop`).
 * `bufferPolicy` в фикстуре — сырое значение, чтобы порчи (дырявый S, чужой режим) дошли до
 * `overflowPolicyOf` и были прочитаны как `stop`.
 */
function quotaWith(input: { bufferUsed: number; userUsed: number; limit?: number; bufferPolicy?: unknown }) {
  const limit = input.limit ?? 1_000;
  return {
    buffer: { usedBytes: input.bufferUsed, limitBytes: limit, backend: 'server' as const },
    userStorage: { usedBytes: input.userUsed, limitBytes: limit, backend: 'server' as const },
    dataset: { catalogId: 'cat', sampleCount: 0 },
    userWorkspaces: { used: 0, limit: 3, backend: 'server' as const },
    bufferPolicy: input.bufferPolicy === undefined ? { mode: 'stop', params: null } : input.bufferPolicy,
  };
}

/** Буфер полон: следующая проба не влезает; хранилище — свободно. */
const BUFFER_FULL = quotaWith({ bufferUsed: 950, userUsed: 0 });
/** Хранилище полно, буфер свободен. */
const STORAGE_FULL = quotaWith({ bufferUsed: 0, userUsed: 950 });
const ROOMY = quotaWith({ bufferUsed: 0, userUsed: 0 });

function makeRow(collection: { id: string; kind: 'buffer' | 'user' | 'system'; systemKey: string | null }) {
  return {
    id: 'sample-1',
    deviceId: 'dev-1',
    collectionId: collection.id,
    title: 'clip',
    class: 'unclassified',
    label: 'unlabeled' as const,
    source: 'mic_recording' as const,
    durationSec: 1,
    sampleRate: 48_000,
    channels: 1,
    audioFormat: 'wav' as const,
    contentType: 'audio/wav',
    sizeBytes: SAMPLE_BYTES,
    storageRef: 'ref',
    notes: null,
    createdAt: new Date(0),
    collection: { ...collection, kind: collection.kind, systemKey: collection.systemKey },
  };
}

describe('SamplesService — доменный отказ «места нет» (M2)', () => {
  const prisma = {
    sample: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn(), update: vi.fn() },
  };
  const collections = { getOwned: vi.fn() };
  const devices = { getQuota: vi.fn() };
  const blobs = { buildStorageRef: vi.fn(), write: vi.fn(), delete: vi.fn(), createReadStream: vi.fn() };
  const audio = { parseUpload: vi.fn() };

  let clockCalls = 0;
  let service: SamplesService;
  let registry: OverflowEpisodeRegistry;

  const upload = (collectionId = BUFFER_COLLECTION.id) =>
    service.uploadOrRefuse('dev-1', collectionId, Buffer.from('wav'), 'audio/wav');

  beforeEach(() => {
    vi.clearAllMocks();
    clockCalls = 0;
    // Часы тикают на каждый вызов — если бы `overflowAt` чеканилось на каждый отказ, оно бы плыло.
    registry = new OverflowEpisodeRegistry(() => new Date(1_700_000_000_000 + clockCalls++ * 1_000));
    service = new SamplesService(
      prisma as never,
      collections as never,
      devices as never,
      blobs as never,
      audio as never,
      registry,
    );
    collections.getOwned.mockImplementation(async (_deviceId: string, collectionId: string) => {
      if (collectionId === BUFFER_COLLECTION.id) return BUFFER_COLLECTION;
      if (collectionId === USER_COLLECTION.id) return USER_COLLECTION;
      if (collectionId === SYSTEM_COLLECTION.id) return SYSTEM_COLLECTION;
      throw new Error(`unexpected collection ${collectionId}`);
    });
    audio.parseUpload.mockResolvedValue({
      durationSec: 1,
      sampleRate: 48_000,
      channels: 1,
      audioFormat: 'wav',
      contentType: 'audio/wav',
      sizeBytes: SAMPLE_BYTES,
    });
    blobs.buildStorageRef.mockReturnValue('dev/sample.wav');
    prisma.sample.create.mockImplementation(async ({ data }: { data: { collectionId: string } }) =>
      makeRow(
        data.collectionId === BUFFER_COLLECTION.id
          ? BUFFER_COLLECTION
          : data.collectionId === USER_COLLECTION.id
            ? USER_COLLECTION
            : SYSTEM_COLLECTION,
      ),
    );
  });

  describe('транспорт и форма (инварианты 1–4)', () => {
    it('полный буфер → промис РАЗРЕШАЕТСЯ отказом, не 413; тело — семь полей', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);

      const outcome = await upload();

      expect(outcome).toEqual({
        ok: false,
        reason: BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL,
        buffer: { usedBytes: 950, limitBytes: 1_000 },
        userStorage: { usedBytes: 0, limitBytes: 1_000 },
        overflowPolicy: 'stop',
        overflowId: expect.stringMatching(UUID_RE),
        overflowAt: expect.stringMatching(ISO_RE),
      });
      expect(Object.keys(outcome).sort()).toEqual(
        ['buffer', 'ok', 'overflowAt', 'overflowId', 'overflowPolicy', 'reason', 'userStorage'],
      );
      expect(blobs.write).not.toHaveBeenCalled();
      expect(prisma.sample.create).not.toHaveBeenCalled();
    });

    it('оси отказа — те же числа, что /quota, без `backend` и прочего', async () => {
      devices.getQuota.mockResolvedValue(STORAGE_FULL);
      const outcome = await upload(USER_COLLECTION.id);
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.buffer).toEqual({ usedBytes: 0, limitBytes: 1_000 });
      expect(outcome.userStorage).toEqual({ usedBytes: 950, limitBytes: 1_000 });
      expect('backend' in outcome.buffer).toBe(false);
    });

    it('в отказе нет транспортных полей — ни statusCode, ни message', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      const outcome = (await upload()) as Record<string, unknown>;
      expect(outcome['statusCode']).toBeUndefined();
      expect(outcome['message']).toBeUndefined();
      expect(outcome['error']).toBeUndefined();
    });

    it('проба ровно в лимит — влезает (used + size === limit не отказ)', async () => {
      devices.getQuota.mockResolvedValue(quotaWith({ bufferUsed: 900, userUsed: 0 }));
      const outcome = await upload();
      expect(outcome.ok).toBe(true);
      expect(blobs.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('два литерала различимы (инварианты 3, 5)', () => {
    it('буфер → device_buffer_full; пользовательская коллекция → user_storage_full', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      const bufferRefusal = await upload(BUFFER_COLLECTION.id);

      devices.getQuota.mockResolvedValue(STORAGE_FULL);
      const storageRefusal = await upload(USER_COLLECTION.id);

      expect(bufferRefusal.ok).toBe(false);
      expect(storageRefusal.ok).toBe(false);
      if (bufferRefusal.ok || storageRefusal.ok) return;
      expect(bufferRefusal.reason).toBe('device_buffer_full');
      expect(storageRefusal.reason).toBe('user_storage_full');
      expect(bufferRefusal.reason).not.toBe(storageRefusal.reason);
      // Разные субъекты — разные эпизоды.
      expect(bufferRefusal.overflowId).not.toBe(storageRefusal.overflowId);
    });

    it('системная коллекция (не тарифный датасет) считается по оси хранилища', async () => {
      devices.getQuota.mockResolvedValue(STORAGE_FULL);
      const outcome = await upload(SYSTEM_COLLECTION.id);
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.reason).toBe(BUFFER_OVERFLOW_REASONS.USER_STORAGE_FULL);
    });

    it('полный буфер НЕ мешает писать в хранилище, и наоборот', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      expect((await upload(USER_COLLECTION.id)).ok).toBe(true);
      devices.getQuota.mockResolvedValue(STORAGE_FULL);
      expect((await upload(BUFFER_COLLECTION.id)).ok).toBe(true);
    });

    it('в ответе никогда не бывает общего «квота» без субъекта', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      const outcome = await upload();
      if (outcome.ok) throw new Error('expected refusal');
      expect(outcome.reason).not.toMatch(/quota/iu);
      expect(Object.values(BUFFER_OVERFLOW_REASONS)).toContain(outcome.reason);
    });
  });

  describe('эпизод: один overflowId и одно overflowAt на серию отказов', () => {
    it('100 отказов подряд → один overflowId и одно overflowAt, хотя часы тикали', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      const ids = new Set<string>();
      const ats = new Set<string>();
      for (let i = 0; i < 100; i += 1) {
        const outcome = await upload();
        if (outcome.ok) throw new Error('expected refusal');
        ids.add(outcome.overflowId);
        ats.add(outcome.overflowAt);
      }
      expect(ids.size).toBe(1);
      expect(ats.size).toBe(1);
      expect([...ats][0]).toBe(new Date(1_700_000_000_000).toISOString());
      expect(clockCalls).toBe(1);
    });

    it('успешная загрузка в ось (место было) закрывает эпизод → следующий отказ = новый id и время', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      const first = await upload();
      if (first.ok) throw new Error('expected refusal');

      devices.getQuota.mockResolvedValue(ROOMY);
      expect((await upload()).ok).toBe(true);

      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      const second = await upload();
      if (second.ok) throw new Error('expected refusal');
      expect(second.overflowId).not.toBe(first.overflowId);
      expect(second.overflowAt).not.toBe(first.overflowAt);
    });

    it('удаление пробы из оси (сюда же приходит buffer-cleanup) закрывает эпизод', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      const first = await upload();
      if (first.ok) throw new Error('expected refusal');

      prisma.sample.findFirst.mockResolvedValue(makeRow(BUFFER_COLLECTION));
      await service.delete('dev-1', 'sample-1');

      const second = await upload();
      if (second.ok) throw new Error('expected refusal');
      expect(second.overflowId).not.toBe(first.overflowId);
    });

    it('удаление из ДРУГОЙ оси эпизод буфера не трогает', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      const first = await upload();
      if (first.ok) throw new Error('expected refusal');

      prisma.sample.findFirst.mockResolvedValue(makeRow(USER_COLLECTION));
      await service.delete('dev-1', 'sample-1');

      const second = await upload();
      if (second.ok) throw new Error('expected refusal');
      expect(second.overflowId).toBe(first.overflowId);
    });

    it('перенос пробы из оси-источника закрывает её эпизод', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      const first = await upload();
      if (first.ok) throw new Error('expected refusal');

      prisma.sample.findFirst.mockResolvedValue(makeRow(BUFFER_COLLECTION));
      prisma.sample.update.mockResolvedValue({ ...makeRow(USER_COLLECTION), source: 'move' });
      await service.move('dev-1', 'sample-1', USER_COLLECTION.id);

      const second = await upload();
      if (second.ok) throw new Error('expected refusal');
      expect(second.overflowId).not.toBe(first.overflowId);
    });

    it('эпизоды разных приборов независимы', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      const a = await service.uploadOrRefuse('dev-1', BUFFER_COLLECTION.id, Buffer.from('x'), 'audio/wav');
      const b = await service.uploadOrRefuse('dev-2', BUFFER_COLLECTION.id, Buffer.from('x'), 'audio/wav');
      if (a.ok || b.ok) throw new Error('expected refusals');
      expect(a.overflowId).not.toBe(b.overflowId);
    });
  });

  describe('вторая дверь upload() — совместимость для firebat-node', () => {
    it('успех — SampleDto как раньше', async () => {
      devices.getQuota.mockResolvedValue(ROOMY);
      const sample = await service.upload('dev-1', BUFFER_COLLECTION.id, Buffer.from('x'), 'audio/wav');
      expect(sample.id).toBe('sample-1');
    });

    it('отказ — BufferOverflowRefusedException со статусом 200 и телом отказа, НЕ 413', async () => {
      devices.getQuota.mockResolvedValue(BUFFER_FULL);
      const promise = service.upload('dev-1', BUFFER_COLLECTION.id, Buffer.from('x'), 'audio/wav');
      await expect(promise).rejects.toBeInstanceOf(BufferOverflowRefusedException);
      const err = await promise.catch((e: BufferOverflowRefusedException) => e);
      expect(err.getStatus()).toBe(200);
      expect(err.getResponse()).toEqual(err.refusal);
      expect(err.refusal.reason).toBe('device_buffer_full');
    });
  });

  /**
   * Smoke шва B→A (контракт интеграции `cowork-buffer-full-stop`, §6 п.1; адаптер A-1):
   * `overflowPolicy` ответа — эффективная политика той же строки `Device`, что и квота
   * (поле `bufferPolicy` ответа `getQuota`), прогнанная через `effectiveBufferPolicy` блока B.
   * Порчи → красный: вернуть константу `stop` (smart с полным S перестанет доезжать);
   * читать `quota.bufferPolicy.mode` напрямую (smart без S долетит до ответа; ⊥ уронит).
   */
  describe('overflowPolicy — из поля политики B на той же строке Device (A-1)', () => {
    const FULL_S = { thresholdPercent: 90, selection: 'oldest_first', protectLabeled: true };

    it('backfill stop → overflowPolicy: stop', async () => {
      devices.getQuota.mockResolvedValue(quotaWith({ bufferUsed: 950, userUsed: 0, bufferPolicy: { mode: 'stop', params: null } }));
      expect(await upload()).toMatchObject({ ok: false, overflowPolicy: 'stop' });
    });

    it('smart_cleanup с полным S → overflowPolicy: stop, пока гейт T12 закрыт (#2318, fail-closed на чтении)', async () => {
      // До #2318 здесь ждали `smart_cleanup`. Гейт D-1: пока `SMART_CLEANUP_AVAILABLE = false`,
      // эффективная политика прибора — `stop` даже при полном S, и в ответе отказа едет она же
      // (M3: гасится при `stop`; ответ не должен обещать прибору режим, которого у сервера нет).
      // Порча: снять fail-closed в `effectiveBufferPolicy` → красный. После переворота
      // переключателя в plugin-contracts ожидание меняется на `smart_cleanup` вместе с зеркалом.
      devices.getQuota.mockResolvedValue(
        quotaWith({ bufferUsed: 950, userUsed: 0, bufferPolicy: { mode: 'smart_cleanup', params: FULL_S } }),
      );
      expect(await upload()).toMatchObject({ ok: false, overflowPolicy: 'stop' });
    });

    it('smart_cleanup с пустым S, чужой режим, поле отсутствует → stop (effective(⊥) = stop, не падение)', async () => {
      for (const bufferPolicy of [{ mode: 'smart_cleanup', params: null }, { mode: 'auto-cleanup' }, null]) {
        devices.getQuota.mockResolvedValue(quotaWith({ bufferUsed: 950, userUsed: 0, bufferPolicy }));
        expect(await upload(), JSON.stringify(bufferPolicy)).toMatchObject({ ok: false, overflowPolicy: 'stop' });
      }
    });
  });
});
