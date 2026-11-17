/**
 * Зубы уборки холодного архива (#2588 b5, порча P21–P24 плана `docs/sprint/cut/cold-archive-retention-2588.json`).
 *
 * Без живой базы: хранилище блока 1 и Prisma — стабы на `vi.fn`, blob-storage — подставной с одним
 * «гнилым» файлом. Красные на стволе c5c01a65: сервиса нет — import падает; `store.purgeExpired`
 * без dryRun отвечает `purge_not_implemented`.
 *
 * Порчи после реализации: P22 dryRun зовёт markPurged/blob → красный (вызовы 0 ожидаются); P23 файлы
 * удалять ДО markPurged → красный (порядок вызовов); не читать storageRef до markPurged → красный
 * (после удаления строк адресов нет); P24 count ≠ 1 трактовать как успех → красный (refused ожидается,
 * blob 0); сбой файла откатывать партию → красный (partija в purged, blobs.failed = 1).
 */
import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PurgeCandidate } from './downgrade-archive.store';
import { DowngradeArchivePurgeService, frozenBytesOf } from './downgrade-archive-purge.service';

const NOW = new Date('2026-10-06T12:00:00.000Z');
const B1 = '00000000-0000-4000-8000-00000000b001';
const B2 = '00000000-0000-4000-8000-00000000b002';
const CANDIDATES: PurgeCandidate[] = [
  { batchId: B1, deviceId: 'd-1', expiresAt: new Date('2026-10-05T10:00:00.000Z'), sampleCount: 2, frozenBytes: 1000 },
  { batchId: B2, deviceId: 'd-2', expiresAt: new Date('2026-10-06T11:00:00.000Z'), sampleCount: 1, frozenBytes: 24 },
];

afterEach(() => vi.restoreAllMocks());

function make(opts: { candidates?: PurgeCandidate[]; markFails?: Set<string>; rottenRef?: string } = {}) {
  const calls: string[] = [];
  const candidates = opts.candidates ?? CANDIDATES;
  const rowsByBatch: Record<string, { storageRef: string }[]> = {
    [B1]: [{ storageRef: 'd-1/s-1.wav' }, { storageRef: 'd-1/s-2.wav' }],
    [B2]: [{ storageRef: 'd-2/s-3.wav' }],
  };
  const store = {
    purgeExpired: vi.fn(async (_now: Date, o: { dryRun: boolean }) => {
      calls.push(`store.purgeExpired(${o.dryRun})`);
      return { dryRun: o.dryRun, now: NOW, candidates, purged: [], refusal: o.dryRun ? null : { reason: 'purge_not_implemented', detail: 'b2' } };
    }),
    markPurged: vi.fn(async (batchId: string) => {
      calls.push(`markPurged(${batchId.slice(-4)})`);
      if (opts.markFails?.has(batchId)) return { ok: false as const, refusal: { reason: 'batch_not_frozen' as const, detail: `партия ${batchId} не frozen — обновлено 0 строк` } };
      // строки партии удалены транзакцией хранилища
      rowsByBatch[batchId] = [];
      return { ok: true as const, deletedRows: 2 };
    }),
  };
  const prisma = {
    downgradeArchivedSample: {
      findMany: vi.fn(async ({ where }: { where: { batchId: string } }) => {
        calls.push(`rows(${where.batchId.slice(-4)})`);
        return rowsByBatch[where.batchId] ?? [];
      }),
    },
  };
  const blobs = {
    delete: vi.fn(async (ref: string) => {
      calls.push(`blob(${ref})`);
      if (ref === opts.rottenRef) throw Object.assign(new Error(`EACCES: permission denied, unlink '/data/blobs/${ref}'`), { name: 'Error' });
    }),
  };
  const service = new DowngradeArchivePurgeService(store as never, prisma as never, blobs as never);
  return { service, store, prisma, blobs, calls };
}

describe('frozenBytesOf', () => {
  it('сумма байт кандидатов; NaN не ломает сумму', () => {
    expect(frozenBytesOf(CANDIDATES)).toBe(1024);
    expect(frozenBytesOf([{ ...CANDIDATES[0]!, frozenBytes: Number.NaN }])).toBe(0);
    expect(frozenBytesOf([])).toBe(0);
  });
});

describe('purgeExpired — P22 dryRun без побочных эффектов', () => {
  it('отчёт несёт кандидатов и байты; markPurged, чтение строк и blob — 0 вызовов; хранилище спрошено только dryRun', async () => {
    const { service, store, prisma, blobs } = make();
    const report = await service.purgeExpired(NOW, { dryRun: true });
    expect(report).toEqual({
      dryRun: true,
      now: NOW,
      candidates: CANDIDATES,
      frozenBytes: 1024,
      purged: [],
      purgedIds: [],
      refused: [],
      blobs: { deleted: 0, failed: 0 },
      refusal: null,
    });
    expect(store.purgeExpired).toHaveBeenCalledTimes(1);
    expect(store.purgeExpired).toHaveBeenCalledWith(NOW, { dryRun: true });
    expect(store.markPurged).toHaveBeenCalledTimes(0);
    expect(prisma.downgradeArchivedSample.findMany).toHaveBeenCalledTimes(0);
    expect(blobs.delete).toHaveBeenCalledTimes(0);
  });

  it('P21: кандидатов нет → пустой отчёт в обоих режимах (restored/deleted/failed отсечены предикатом хранилища)', async () => {
    const { service, store, blobs } = make({ candidates: [] });
    expect((await service.purgeExpired(NOW, { dryRun: false })).purged).toEqual([]);
    expect(store.markPurged).toHaveBeenCalledTimes(0);
    expect(blobs.delete).toHaveBeenCalledTimes(0);
    // кандидаты берутся ТОЛЬКО через dryRun хранилища — боевой вызов store.purgeExpired(false) с его purge_not_implemented не используется
    for (const call of store.purgeExpired.mock.calls) expect(call[1]).toEqual({ dryRun: true });
  });
});

describe('purgeExpired — P23 боевой: строки → метка → файлы, идемпотентность', () => {
  it('по каждой партии: storageRef читаются ДО markPurged, файлы удаляются ПОСЛЕ; обе партии purged, все файлы удалены', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { service, store, blobs, calls } = make();
    const report = await service.purgeExpired(NOW, { dryRun: false });
    expect(report.dryRun).toBe(false);
    expect(report.purged).toEqual([B1, B2]);
    expect(report.purgedIds).toEqual([B1, B2]);
    expect(report.refused).toEqual([]);
    expect(report.blobs).toEqual({ deleted: 3, failed: 0 });
    expect(report.frozenBytes).toBe(1024);
    expect(report.refusal).toBeNull();
    expect(store.markPurged).toHaveBeenNthCalledWith(1, B1, NOW);
    expect(store.markPurged).toHaveBeenNthCalledWith(2, B2, NOW);
    expect(blobs.delete.mock.calls.map((c) => c[0])).toEqual(['d-1/s-1.wav', 'd-1/s-2.wav', 'd-2/s-3.wav']);
    expect(calls).toEqual([
      'store.purgeExpired(true)',
      'rows(b001)', 'markPurged(b001)', 'blob(d-1/s-1.wav)', 'blob(d-1/s-2.wav)',
      'rows(b002)', 'markPurged(b002)', 'blob(d-2/s-3.wav)',
    ]);
  });

  it('идемпотентность: повтор, когда хранилище кандидатов не находит, → purged: [], ни одного markPurged/blob', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { service, store, blobs } = make({ candidates: [] });
    const again = await service.purgeExpired(NOW, { dryRun: false });
    expect(again.purged).toEqual([]);
    expect(again.candidates).toEqual([]);
    expect(store.markPurged).toHaveBeenCalledTimes(0);
    expect(blobs.delete).toHaveBeenCalledTimes(0);
  });

  it('сбой удаления файла не откатывает партию: партия в purged, blobs.failed=1, остальные файлы удалены, warn без пути файла', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { service } = make({ rottenRef: 'd-1/s-2.wav' });
    const report = await service.purgeExpired(NOW, { dryRun: false });
    expect(report.purged).toEqual([B1, B2]);
    expect(report.blobs).toEqual({ deleted: 2, failed: 1 });
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(warn.mock.calls[0]);
    expect(logged).toContain(B1);
    expect(logged).not.toContain('/data/blobs'); // путь из сообщения ОС в лог не уезжает — только класс ошибки и партия
    expect(logged).not.toContain('s-2.wav');
  });
});

describe('purgeExpired — P24 гонка с разморозкой', () => {
  it('markPurged count≠1 → партия в refused с причиной хранилища, её файлы НЕ тронуты; соседняя партия убрана', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { service, blobs } = make({ markFails: new Set([B1]) });
    const report = await service.purgeExpired(NOW, { dryRun: false });
    expect(report.purged).toEqual([B2]);
    expect(report.refused).toEqual([{ batchId: B1, refusal: { reason: 'batch_not_frozen', detail: `партия ${B1} не frozen — обновлено 0 строк` } }]);
    expect(blobs.delete.mock.calls.map((c) => c[0])).toEqual(['d-2/s-3.wav']); // файлы B1 целы
    expect(report.blobs).toEqual({ deleted: 1, failed: 0 });
    // кандидаты в отчёте — как были прочитаны: B1 остаётся в candidates, но не в purged
    expect(report.candidates.map((c) => c.batchId)).toEqual([B1, B2]);
  });
});
