/**
 * Зубы серверной уборки (#2204, часть 2/4).
 *
 * Ядро отбора проверено у себя (#2207); здесь проверяется ровно то, что добавляет сервер:
 * необратимость под контролем списка, вторая проверка защиты на исполнении и честный ответ
 * о том, кого не тронули.
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { BufferCleanupService } from './buffer-cleanup.service';

const MB = 1048576;

function row(over: Partial<Record<string, unknown>> & { id: string }) {
  return {
    collectionId: 'buffer',
    title: over.id,
    class: 'unknown',
    label: 'unlabeled',
    durationSec: 10,
    sampleRate: 48000,
    channels: 1,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    storageRef: `ref/${over.id}`,
    notes: null,
    sizeBytes: MB,
    ...over,
  };
}

function make(rows: ReturnType<typeof row>[], deleteImpl?: (id: string) => Promise<void>) {
  const deleted: string[] = [];
  const prisma = {
    sample: {
      findMany: vi.fn(async ({ where }: { where: { id?: { in: string[] } } }) => {
        const ids = where.id?.in;
        const picked = ids ? rows.filter((r) => ids.includes(r.id)) : rows;
        return picked;
      }),
    },
  };
  const collections = { getOwned: vi.fn(async () => ({ id: 'buffer' })) };
  const samples = {
    delete: vi.fn(async (_device: string, id: string) => {
      if (deleteImpl) await deleteImpl(id);
      deleted.push(id);
    }),
  };
  const service = new BufferCleanupService(
    prisma as never,
    collections as never,
    samples as never,
  );
  return { service, deleted, samples, collections };
}

const rows = Array.from({ length: 30 }, (_, i) =>
  row({
    id: `s${String(i).padStart(2, '0')}`,
    createdAt: new Date(Date.UTC(2026, 7, 1, 0, i)),
  }),
);

describe('план', () => {
  it('объём вне словаря отбивается ручкой, а не доверяется ядру', async () => {
    const { service } = make(rows);
    await expect(service.plan('d', 'buffer', 'oldest', 17)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('принцип вне пары отбивается', async () => {
    const { service } = make(rows);
    await expect(
      service.plan('d', 'buffer', 'sideways' as never, 20),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('план ничего не удаляет — сколько бы раз его ни звали', async () => {
    const { service, samples } = make(rows);
    await service.plan('d', 'buffer', 'oldest', 20);
    await service.plan('d', 'buffer', 'oldest', 20);
    expect(samples.delete).not.toHaveBeenCalled();
  });

  it('план называет числами: что уйдёт, сколько освободится, сколько останется, сколько в буфере', async () => {
    const { service } = make(rows);
    const plan = await service.plan('d', 'buffer', 'oldest', 20);
    expect(plan.doomed).toHaveLength(20);
    expect(plan.doomed[0]?.id).toBe('s00');
    expect(plan.freedBytes).toBe(20 * MB);
    expect(plan.remaining).toBe(10);
    expect(plan.inBuffer).toBe(30);
    expect(plan.shortfall).toBeNull();
  });
});

describe('исполнение', () => {
  it('пустой список — отказ: удалить, не показав списка, ручкой невозможно', async () => {
    const { service, samples } = make(rows);
    await expect(service.execute('d', 'buffer', [])).rejects.toBeInstanceOf(BadRequestException);
    expect(samples.delete).not.toHaveBeenCalled();
  });

  it('удаляются РОВНО перечисленные, а не «сто ранних»', async () => {
    const { service, deleted } = make(rows);
    const out = await service.execute('d', 'buffer', ['s03', 's07']);
    expect(deleted).toEqual(['s03', 's07']);
    expect(out.deleted).toBe(2);
    expect(out.freedBytes).toBe(2 * MB);
    expect(out.refused).toEqual([]);
  });

  it('пометка, поставленная ПОСЛЕ показа плана, побеждает план (лекарство от 22.08)', async () => {
    const marked = rows.map((r) => (r.id === 's03' ? { ...r, notes: 'keep — вещдок приёмки' } : r));
    const { service, deleted } = make(marked);
    const out = await service.execute('d', 'buffer', ['s03', 's07']);
    expect(deleted).toEqual(['s07']);
    expect(out.deleted).toBe(1);
    expect(out.refused[0]).toEqual({
      id: 's03',
      why: 'помечена как хранимая после показа списка — не удалена',
    });
  });

  it('исчезнувшая проба не роняет уборку и не молчит', async () => {
    const { service, deleted } = make(rows);
    const out = await service.execute('d', 'buffer', ['s03', 'gone']);
    expect(deleted).toEqual(['s03']);
    expect(out.refused.map((r) => r.id)).toEqual(['gone']);
    expect(out.refused[0]?.why).toMatch(/нет в этом наборе/);
  });

  it('отказ на одной пробе не обрывает остальных, и причина доезжает словами', async () => {
    const { service, deleted } = make(rows, async (id) => {
      if (id === 's05') throw new Error('Cannot delete samples from tariff dataset collection');
    });
    const out = await service.execute('d', 'buffer', ['s04', 's05', 's06']);
    expect(deleted).toEqual(['s04', 's06']);
    expect(out.deleted).toBe(2);
    expect(out.refused[0]?.why).toMatch(/tariff dataset/);
  });

  it('удаление идёт через SamplesService, а не мимо него — запреты и блобы одни на сервис', async () => {
    const { service, samples } = make(rows);
    await service.execute('d', 'buffer', ['s01']);
    expect(samples.delete).toHaveBeenCalledWith('d', 's01');
  });
});
