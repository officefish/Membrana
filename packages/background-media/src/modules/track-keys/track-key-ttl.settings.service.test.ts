/**
 * Зубы мембранного выключателя срока (#2271).
 *
 * DoD билета: «срок меняется из кабинета рукой человека». Рука человека — это не только запись,
 * но и то, ЧТО служба отказывается записать: неподписанное снятие и величину сверх потолка.
 * Иначе «бессрочно» можно получить промахом по клавише или повреждённой записью, а вердикт M3
 * требует, чтобы бессрочность НАЗНАЧАЛАСЬ словом.
 */
import { describe, expect, it } from 'vitest';

import { PrismaTrackKeyTtlSettingsStore } from './prisma-track-key.store';
import { DEFAULT_TRACK_KEY_TTL, MAX_TRACK_KEY_TTL } from './track-key-ttl';
import { TrackKeyTtlSettingsService } from './track-key-ttl.settings.service';

const M = 'membrane-1';

function fakePrisma() {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    rows,
    /** Приборы: у `device-1` мембрана есть, у `device-orphan` — нет (законное состояние M1). */
    device: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'device-orphan' ? { membraneId: null } : { membraneId: `membrane-of-${where.id}` },
    },
    trackKeyTtlSetting: {
      findUnique: async ({ where }: { where: { membraneId: string } }) => rows.get(where.membraneId) ?? null,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { membraneId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const cur = rows.get(where.membraneId);
        rows.set(where.membraneId, cur ? { ...cur, ...update } : { ...create });
        return rows.get(where.membraneId);
      },
    },
  };
}

function service() {
  const prisma = fakePrisma();
  const store = new PrismaTrackKeyTtlSettingsStore(prisma as never);
  return { prisma, svc: new TrackKeyTtlSettingsService(prisma as never, store) };
}

describe('срок меняется рукой человека', () => {
  it('заданный срок записывается и становится действующим', async () => {
    const { svc, prisma } = service();
    await svc.write(M, { mode: 'seconds', seconds: 3600 });

    expect(prisma.rows.get(M)).toMatchObject({ mode: 'seconds', seconds: 3600 });
    const out = (await svc.describe(M)) as { effective: { seconds: number | null } };
    expect(out.effective.seconds).toBe(3600);
  });

  it('умолчание возвращает константу, а не пустоту', async () => {
    const { svc } = service();
    await svc.write(M, { mode: 'default' });
    const out = (await svc.describe(M)) as { effective: { seconds: number | null } };
    expect(out.effective.seconds).toBe(DEFAULT_TRACK_KEY_TTL);
  });

  it('ПОРЧА: снятие БЕЗ подписи отвергается — это не «бессрочно», а повреждённая запись', async () => {
    const { svc, prisma } = service();
    await expect(svc.write(M, { mode: 'lifted' })).rejects.toThrow(/подпись/u);
    await expect(svc.write(M, { mode: 'lifted', liftedBy: '   ' })).rejects.toThrow(/подпись/u);
    expect(prisma.rows.size, 'неподписанное снятие не должно доехать до базы').toBe(0);
  });

  it('снятие С подписью — законное «срока нет», и только оно даёт null', async () => {
    const { svc } = service();
    await svc.write(M, { mode: 'lifted', liftedBy: 'owner' });
    const out = (await svc.describe(M)) as {
      effective: { seconds: number | null; source: string };
    };
    expect(out.effective.seconds).toBeNull();
    expect(out.effective.source).toBe('lifted');
  });

  it('ПОРЧА: бессрочность НЕ назначается числом — сверх потолка отказ', async () => {
    // Иначе «навсегда» можно получить промахом по клавише, и отличить его от воли человека
    // будет нечем.
    const { svc, prisma } = service();
    await expect(svc.write(M, { mode: 'seconds', seconds: MAX_TRACK_KEY_TTL + 1 })).rejects.toThrow(
      /потолк/u,
    );
    expect(prisma.rows.size).toBe(0);
  });

  it('нецелый и неположительный срок отвергаются', async () => {
    const { svc } = service();
    for (const seconds of [0, -1, 1.5, Number.NaN]) {
      await expect(svc.write(M, { mode: 'seconds', seconds })).rejects.toThrow(/целое/u);
    }
  });

  it('незнакомый режим — поломка запроса, а не «наверное умолчание»', async () => {
    const { svc } = service();
    await expect(svc.write(M, { mode: 'forever' })).rejects.toThrow(/неизвестный режим/u);
  });

  it('мембрана ВЫВОДИТСЯ из прибора, а не принимается на слово', async () => {
    // Принять `membraneId` из запроса значило бы поверить обратившемуся — частный случай
    // угадывания владельца, который M1 запрещает прямо.
    const { svc, prisma } = service();
    await svc.writeForDevice('device-1', { mode: 'seconds', seconds: 600 });
    expect(prisma.rows.get('membrane-of-device-1')).toMatchObject({ seconds: 600 });
  });

  it('ПОРЧА: прибор без мембраны — отказ, а не умолчание', async () => {
    // Подставить `DEFAULT_TRACK_KEY_TTL` здесь значило бы назначить срок несуществующему
    // владельцу. Операция, требующая владельца, на приборе без мембраны не выполняется (M1).
    const { svc, prisma } = service();
    await expect(svc.describeForDevice('device-orphan')).rejects.toThrow(/не привязан/u);
    await expect(
      svc.writeForDevice('device-orphan', { mode: 'seconds', seconds: 600 }),
    ).rejects.toThrow(/не привязан/u);
    expect(prisma.rows.size, 'запись без владельца не должна появиться').toBe(0);
  });

  it('ответ НАЗЫВАЕТ узловую границу вердикта M3, а не выдаёт её за мембранную', async () => {
    // Настройка лежит в БД этого узла; мембрана может охватывать несколько. Умолчать об этом
    // значило бы выдать «одно движение на всю мембрану» за исполненное.
    const { svc } = service();
    const out = (await svc.describe(M)) as { scopeCaveat: string };
    expect(out.scopeCaveat).toMatch(/узлов/u);
  });
});
