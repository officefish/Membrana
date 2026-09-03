/**
 * Зубы Prisma-хранилища ключа (#2271).
 *
 * ПОРЧА ИЗ БИЛЕТА ДОСЛОВНО: «два параллельных `createIfAbsent` на одну мембрану → второй
 * отказывает, а не дублирует». Проверяется не обещанием комментария, а поведением адаптера на
 * хранилище, которое ведёт себя как настоящее: уникальный ключ отвергает вторую вставку.
 *
 * Почему это важнее обычного зуба: до уникальности гонка не падала — она ТИХО заводила второй
 * ключ, и вред всплывал позже и в другом месте, вердиктом `tampered` на честной ссылке. То
 * есть дефект маскировался под подделку. Зуб ловит его в точке возникновения.
 */
import { describe, expect, it } from 'vitest';

import { PrismaTrackKeyStore, PrismaTrackKeyTtlSettingsStore } from './prisma-track-key.store';

/** Ошибка Prisma о нарушении уникальности — ровно та, что отдаёт живой драйвер. */
class UniqueViolation extends Error {
  readonly code = 'P2002';
}

/**
 * Хранилище, ведущее себя как таблица с `@@unique([membraneId])`: вторая вставка отвергается.
 * Стаб живёт рядом с зубом, а не в `stubs/` — он нужен только здесь.
 */
function fakePrisma() {
  const rows = new Map<string, { membraneId: string; generation: number; secret: string; rotatedAt: Date }>();
  const settings = new Map<string, Record<string, unknown>>();
  return {
    rows,
    settings,
    trackKeySecret: {
      findUnique: async ({ where }: { where: { membraneId: string } }) =>
        rows.get(where.membraneId) ?? null,
      create: async ({ data }: { data: { membraneId: string; generation: number; secret: string; rotatedAt: Date } }) => {
        if (rows.has(data.membraneId)) throw new UniqueViolation('unique');
        rows.set(data.membraneId, { ...data });
        return { ...data };
      },
      update: async ({ where, data }: { where: { membraneId: string }; data: Record<string, unknown> }) => {
        const cur = rows.get(where.membraneId);
        if (!cur) throw new Error('нет записи');
        rows.set(where.membraneId, { ...cur, ...(data as object) } as never);
        return rows.get(where.membraneId);
      },
    },
    trackKeyTtlSetting: {
      findUnique: async ({ where }: { where: { membraneId: string } }) =>
        settings.get(where.membraneId) ?? null,
    },
  };
}

const M = 'membrane-1';
const rec = (secret: string) => ({ membraneId: M, generation: 1, secret, rotatedAt: new Date('2026-09-03T10:00:00Z') });

describe('заведение ключа атомарно — уникальность держит СХЕМА', () => {
  it('ПОРЧА БИЛЕТА: два параллельных createIfAbsent — второй НЕ дублирует', async () => {
    const prisma = fakePrisma();
    const store = new PrismaTrackKeyStore(prisma as never);

    const [a, b] = await Promise.all([
      store.createIfAbsent(rec('secret-A')),
      store.createIfAbsent(rec('secret-B')),
    ]);

    expect(prisma.rows.size, 'в хранилище должен остаться ОДИН ключ мембраны').toBe(1);
    expect(a.secret, 'оба вызова обязаны вернуть ОДИН И ТОТ ЖЕ действующий секрет').toBe(b.secret);
  });

  it('проигравший гонку возвращает ЧУЖУЮ действующую запись, а не свою и не ошибку', async () => {
    const prisma = fakePrisma();
    const store = new PrismaTrackKeyStore(prisma as never);

    const first = await store.createIfAbsent(rec('secret-первый'));
    const second = await store.createIfAbsent(rec('secret-второй'));

    expect(second.secret, 'второй перезаписал победителя — это уже ротация, а не заведение').toBe(
      'secret-первый',
    );
    expect(first.secret).toBe('secret-первый');
  });

  it('заведение НЕ обесценивает выданные ссылки — поколение не растёт', async () => {
    // Если бы `createIfAbsent` втихую делал `replace`, все уже выданные ссылки мембраны
    // погасли бы, и человек не понял бы почему: он ничего не вращал.
    const prisma = fakePrisma();
    const store = new PrismaTrackKeyStore(prisma as never);
    await store.createIfAbsent(rec('secret-A'));
    await store.createIfAbsent({ ...rec('secret-B'), generation: 9 });

    expect(prisma.rows.get(M)?.generation).toBe(1);
  });

  it('замена — отдельный глагол, и она поколение поднимает', async () => {
    const prisma = fakePrisma();
    const store = new PrismaTrackKeyStore(prisma as never);
    await store.createIfAbsent(rec('secret-A'));
    await store.replace({ ...rec('secret-C'), generation: 2 });

    expect(prisma.rows.get(M)?.generation).toBe(2);
    expect(prisma.rows.get(M)?.secret).toBe('secret-C');
  });

  it('чужая ошибка записи НЕ выдаётся за проигранную гонку', async () => {
    // Ловим именно P2002. Проглотить любую ошибку значило бы превратить сбой БД в «кто-то
    // меня опередил» и вернуть выдуманный ключ.
    const prisma = fakePrisma();
    prisma.trackKeySecret.create = async () => {
      throw new Error('соединение потеряно');
    };
    const store = new PrismaTrackKeyStore(prisma as never);

    await expect(store.createIfAbsent(rec('secret-A'))).rejects.toThrow('соединение потеряно');
  });
});

describe('настройка срока отдаётся КАК ЕСТЬ, без лечения порчи', () => {
  it('снятый срок доезжает с подписью', async () => {
    const prisma = fakePrisma();
    prisma.settings.set(M, {
      mode: 'lifted',
      seconds: null,
      liftedAt: new Date('2026-09-03T09:00:00Z'),
      liftedBy: 'owner',
    });
    const store = new PrismaTrackKeyTtlSettingsStore(prisma as never);

    expect(await store.read(M)).toEqual({
      mode: 'lifted',
      liftedAt: '2026-09-03T09:00:00.000Z',
      liftedBy: 'owner',
    });
  });

  it('ПОРЧА не чинится хранилищем: снятие без подписи едет к резолверу как есть', async () => {
    // Вылечить его здесь значило бы отнять у резолвера повод отказать: он обязан увидеть
    // запись без подписи и подставить константу, а не получить уже «исправленное» снятие.
    const prisma = fakePrisma();
    prisma.settings.set(M, { mode: 'lifted', seconds: null, liftedAt: null, liftedBy: null });
    const store = new PrismaTrackKeyTtlSettingsStore(prisma as never);

    expect(await store.read(M)).toEqual({ mode: 'lifted', liftedAt: undefined, liftedBy: null });
  });

  it('записи нет — это не порча, а отсутствие настройки', async () => {
    const store = new PrismaTrackKeyTtlSettingsStore(fakePrisma() as never);
    expect(await store.read(M)).toBeNull();
  });
});
