/**
 * Зубы живучести выборки. Блок c4b спринта `chart-list-plugin`.
 *
 * Prisma подменена поддельной: под проверкой не драйвер базы, а два утверждения, ради которых
 * служба заведена, — выборка ПЕРЕЖИВАЕТ уход со страницы и открывается по адресу, и чужая
 * выборка неотличима от несуществующей. Оба проверяются предикатом, а не соединением с Postgres.
 */
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ChartListSelectionService, type SaveSelectionInput, type StoredPick } from './selection.service';

interface Row {
  id: string;
  membraneId: string;
  criterion: string;
  volume: number;
  runId: string;
  inputHash: string;
  asked: number;
  measured: number;
  shortfall: number;
  createdAt: Date;
  picks: StoredPick[];
}

/**
 * Поддельная Prisma. Хранит строки в памяти и повторяет ровно то поведение, на которое опирается
 * служба: `findFirst` по паре полей, `create` вместе со строками, `findMany` по свежести.
 */
function fakePrisma() {
  const rows: Row[] = [];
  let seq = 0;
  return {
    rows,
    chartListSelection: {
      async create({ data, include: _i }: { data: Record<string, unknown>; include?: unknown }) {
        seq += 1;
        const picksInput = (data.picks as { create: StoredPick[] }).create;
        const row: Row = {
          id: `sel-${seq}`,
          membraneId: data.membraneId as string,
          criterion: data.criterion as string,
          volume: data.volume as number,
          runId: data.runId as string,
          inputHash: data.inputHash as string,
          asked: data.asked as number,
          measured: data.measured as number,
          shortfall: data.shortfall as number,
          createdAt: new Date(1_755_000_000_000 + seq),
          picks: [...picksInput].sort((a, b) => a.rank - b.rank),
        };
        rows.push(row);
        return row;
      },
      async findFirst({ where }: { where: { id: string; membraneId: string } }) {
        return rows.find((r) => r.id === where.id && r.membraneId === where.membraneId) ?? null;
      },
      async findMany({ where, take }: { where: { membraneId: string }; take: number }) {
        return rows
          .filter((r) => r.membraneId === where.membraneId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, take);
      },
    },
  };
}

const pick = (rank: number, over: Partial<StoredPick> = {}): StoredPick => ({
  rank,
  entryId: `e${rank}`,
  sampleId: `s${rank}`,
  deltaDb: 30 - rank,
  peakDb: -20,
  structure: 'tonal',
  flatness: 0.05,
  displaced: 0,
  ...over,
});

const input = (over: Partial<SaveSelectionInput> = {}): SaveSelectionInput => ({
  membraneId: 'm-1',
  criterion: 'loudness-over-floor',
  volume: 20,
  runId: 'run-1',
  inputHash: 'состав-задания',
  asked: 40,
  measured: 38,
  shortfall: 0,
  picks: [pick(1), pick(2), pick(3)],
  ...over,
});

const svc = () => {
  const prisma = fakePrisma();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { prisma, service: new ChartListSelectionService(prisma as any) };
};

describe('выборка переживает уход со страницы', () => {
  it('сохранённая выборка открывается по адресу — тем же составом', async () => {
    const { service } = svc();
    const saved = await service.save(input());
    const opened = await service.openById('m-1', saved.id);
    expect(opened.id).toBe(saved.id);
    expect(opened.picks.map((p) => p.rank)).toEqual([1, 2, 3]);
  });

  it('строки хранятся вместе с выборкой, а не отдельным обломком', async () => {
    const { service } = svc();
    const saved = await service.save(input());
    expect(saved.picks).toHaveLength(3);
    expect(saved.picks[0]?.entryId).toBe('e1');
  });

  it('настройки прогона сохранены — человек вправе увидеть, ЧТО заказывал', async () => {
    const { service } = svc();
    const saved = await service.save(input({ criterion: 'drone-likeness', volume: 60 }));
    const opened = await service.openById('m-1', saved.id);
    expect(opened.criterion).toBe('drone-likeness');
    expect(opened.volume).toBe(60);
  });

  it('ссылка на паспорт прогона хранится, сам паспорт — нет: он живёт в доме результатов', async () => {
    const { service } = svc();
    const saved = await service.save(input());
    expect(saved.runId).toBe('run-1');
    expect(saved).not.toHaveProperty('passport');
    expect(saved).not.toHaveProperty('configHash');
  });

  it('расхождение «спросили / измерили» переживает сохранение', async () => {
    const { service } = svc();
    const saved = await service.save(input({ asked: 200, measured: 173, shortfall: 0 }));
    expect(saved.asked).toBe(200);
    expect(saved.measured).toBe(173);
  });
});

describe('чужая выборка неотличима от несуществующей', () => {
  it('открыть чужую — NotFound, а не «нет доступа»', async () => {
    const { service } = svc();
    const saved = await service.save(input({ membraneId: 'm-1' }));
    await expect(service.openById('m-2', saved.id)).rejects.toThrow(NotFoundException);
  });

  it('несуществующий адрес даёт ТОТ ЖЕ ответ, что и чужой — адрес не выдаёт своего существования', async () => {
    const { service } = svc();
    const saved = await service.save(input({ membraneId: 'm-1' }));
    const foreign = await service.openById('m-2', saved.id).catch((e: Error) => e.constructor.name);
    const missing = await service.openById('m-2', 'нет-такого').catch((e: Error) => e.constructor.name);
    expect(foreign).toBe(missing);
  });

  it('перечень чужих выборок пуст — сосед не виден даже числом', async () => {
    const { service } = svc();
    await service.save(input({ membraneId: 'm-1' }));
    await service.save(input({ membraneId: 'm-1' }));
    expect(await service.listRecent('m-2')).toHaveLength(0);
  });
});

describe('перечень собранного', () => {
  it('свежие первыми — человек видит последнее, что собирал', async () => {
    const { service } = svc();
    const a = await service.save(input({ criterion: 'loudness-over-floor' }));
    const b = await service.save(input({ criterion: 'spectral-variety' }));
    const list = await service.listRecent('m-1');
    expect(list.map((s) => s.id)).toEqual([b.id, a.id]);
  });

  it('предел перечня соблюдается', async () => {
    const { service } = svc();
    for (let i = 0; i < 5; i += 1) await service.save(input());
    expect(await service.listRecent('m-1', 2)).toHaveLength(2);
  });
});
