/**
 * Зубы возврата из архива понижения (#2619): партии по узлам мембраны, принадлежность партии,
 * отказы media как есть, недоступность media — значением. На стволе сервиса нет — импорт красный.
 */
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { MediaArchiveBatchRow } from '../pair/media-downgrade-archive.port';

import { TariffArchiveService } from './tariff-archive.service';

const MINE = 'm-1';

function row(batchId: string, over: Partial<MediaArchiveBatchRow> = {}): MediaArchiveBatchRow {
  return {
    batchId,
    state: 'frozen',
    frozenAt: '2026-10-07T10:00:00.000Z',
    expiresAt: '2026-10-21T10:00:00.000Z',
    frozenBytes: 2048,
    keptBytes: 512,
    sampleCount: 7,
    membraneId: MINE,
    retentionDays: 14,
    fromTariffId: 'sensor-v1',
    toTariffId: 'free-v1',
    ...over,
  };
}

function harness(batchesByDevice: Record<string, MediaArchiveBatchRow[] | Error>) {
  const prisma = {
    device: {
      findMany: vi.fn(async () => [
        { mediaDeviceId: 'dev-a', nodeId: 'node-a' },
        { mediaDeviceId: 'dev-b', nodeId: 'node-b' },
      ]),
    },
  };
  const media = {
    listBatches: vi.fn(async (deviceId: string) => {
      const v = batchesByDevice[deviceId] ?? [];
      if (v instanceof Error) throw v;
      return v;
    }),
    restore: vi.fn(async (_deviceId: string, batchId: string) => ({ ok: true as const, batch: row(batchId, { state: 'restored' }), restored: ['s1', 's2'] })),
  };
  return { svc: new TariffArchiveService(prisma as never, media as never), prisma, media };
}

describe('TariffArchiveService.list', () => {
  it('партии по узлам мембраны с датой удаления; чужие партии на приборе (прибор сменил владельца) отсеяны', async () => {
    const { svc, prisma } = harness({ 'dev-a': [row('b-1'), row('b-old', { membraneId: 'm-prev' })], 'dev-b': [] });
    const out = await svc.list(MINE);
    expect(prisma.device.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { node: { membraneId: MINE } } }));
    expect(out.nodes).toEqual([
      { nodeId: 'node-a', batches: [{ batchId: 'b-1', state: 'frozen', frozenAt: '2026-10-07T10:00:00.000Z', expiresAt: '2026-10-21T10:00:00.000Z', frozenBytes: 2048, sampleCount: 7 }] },
      { nodeId: 'node-b', batches: [] },
    ]);
  });

  it('media не ответила по одному узлу — узел помечен unavailable, остальные показаны', async () => {
    const { svc } = harness({ 'dev-a': new ServiceUnavailableException('Media server unreachable: x'), 'dev-b': [row('b-2')] });
    const out = await svc.list(MINE);
    expect(out.nodes[0]).toEqual({ nodeId: 'node-a', unavailable: 'Media server unreachable: x' });
    expect(out.nodes[1]).toMatchObject({ nodeId: 'node-b', batches: [{ batchId: 'b-2' }] });
  });
});

describe('TariffArchiveService.restore', () => {
  it('своя партия — restore уходит на прибор её узла; ответ: узел, партия, число возвращённых', async () => {
    const { svc, media } = harness({ 'dev-a': [], 'dev-b': [row('b-2')] });
    const out = await svc.restore(MINE, 'b-2');
    expect(media.restore).toHaveBeenCalledWith('dev-b', 'b-2');
    expect(out).toMatchObject({ ok: true, nodeId: 'node-b', batch: { batchId: 'b-2', state: 'restored' }, restored: 2 });
  });

  it('ПРИНАДЛЕЖНОСТЬ: партия прежнего владельца на приборе этой мембраны и партия, которой нет, — batch_not_found; restore в media не зовётся', async () => {
    const { svc, media } = harness({ 'dev-a': [row('b-old', { membraneId: 'm-prev' })] });
    expect(await svc.restore(MINE, 'b-old')).toMatchObject({ ok: false, reason: 'batch_not_found' });
    expect(await svc.restore(MINE, 'b-none')).toMatchObject({ ok: false, reason: 'batch_not_found' });
    expect(media.restore).not.toHaveBeenCalled();
  });

  it.each(['archive_expired', 'batch_not_frozen', 'insufficient_quota', 'batch_not_found'])('отказ media %s — наружу как есть', async (reason) => {
    const { svc, media } = harness({ 'dev-a': [row('b-1')] });
    media.restore.mockResolvedValueOnce({ ok: false, reason, detail: `media: ${reason}` } as never);
    expect(await svc.restore(MINE, 'b-1')).toEqual({ ok: false, reason, detail: `media: ${reason}` });
  });

  it('media недоступна — значение media_unavailable, не исключение', async () => {
    const { svc, media } = harness({ 'dev-a': [row('b-1')] });
    media.restore.mockRejectedValueOnce(new ServiceUnavailableException('Media server unreachable: down'));
    expect(await svc.restore(MINE, 'b-1')).toEqual({ ok: false, reason: 'media_unavailable', detail: 'Media server unreachable: down' });
  });
});
