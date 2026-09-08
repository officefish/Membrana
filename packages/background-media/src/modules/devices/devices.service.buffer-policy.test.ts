/**
 * Зубы сервиса приборов на политике переполнения (#2308, блок B `overflow-policy`).
 *
 * Предмет — `DevicesService`: приём политики при разноске контекста, отдача эффективной
 * политики прибору через `/quota`, вход блока A `getEffectiveBufferPolicy`. Порчи: принять
 * `smart_cleanup` без параметров при разноске → красный; отдать прибору что-то кроме `stop`
 * с порченой строки → красный; записать квоты при отвергнутой политике → красный.
 *
 * #2318 (гейт до T12): разноска `smart_cleanup` даже с ПОЛНЫМ набором → `smart_cleanup_unavailable`,
 * ничего не пишется (порча: снять гейт → запись прошла → красный); неполный набор при выключенном
 * гейте → причина гейта, не `params_incomplete` (порча порядка → красный); строка с умной
 * очисткой в базе → прибору `stop` и РОВНО один warn на прибор (порча: снять fail-closed → красный;
 * warn на каждое чтение → красный).
 */
import { BadRequestException, Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DevicesService } from './devices.service';

afterEach(() => {
  vi.restoreAllMocks();
});

const CONFIG = {
  MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE: 1_000,
  MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE: 2_000,
  MEDIA_DEFAULT_DATASET_CATALOG_ID: 'catalog-free',
  MEDIA_DEFAULT_MAX_USER_WORKSPACES: 3,
} as never;

const FULL_PARAMS = { thresholdPercent: 90, selection: 'oldest_first', protectLabeled: true };

const CONTEXT = {
  membraneId: 'm-1',
  userStorageQuotaBytes: '10000',
  bufferQuotaBytes: '2000',
  datasetCatalogId: 'catalog-checkpoint',
  maxUserWorkspaces: 7,
};

function deviceRow(over: Record<string, unknown> = {}) {
  return {
    id: 'dev-1',
    name: 'lab',
    kind: 'other',
    createdAt: new Date('2026-09-06T00:00:00Z'),
    membraneId: 'm-1',
    userStorageQuotaBytes: 10_000n,
    bufferQuotaBytes: 2_000n,
    datasetCatalogId: 'catalog-checkpoint',
    maxUserWorkspaces: 7,
    bufferPolicy: 'stop',
    bufferPolicyParams: null,
    ...over,
  };
}

function makeService(row: Record<string, unknown> | null = deviceRow()) {
  const prisma = {
    device: {
      findUnique: vi.fn(async () => row),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => ({ ...deviceRow(), ...args.data })),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ ...deviceRow(), ...args.data })),
    },
    sample: { findMany: vi.fn(async () => []) },
    deviceWorkspace: { count: vi.fn(async () => 0) },
  };
  const nodeKeys = {
    issue: vi.fn(async () => ({
      outcome: 'issued',
      key: { raw: 'raw', keyId: 'k-1', createdAt: new Date() },
    })),
  };
  const service = new DevicesService(prisma as never, CONFIG, nodeKeys as never);
  return { service, prisma };
}

describe('разноска контекста: гейт умной очистки на сервере записей', () => {
  it('stop принимается и пишется вместе с квотами; параметры — DB NULL', async () => {
    const { service, prisma } = makeService();
    const res = await service.syncMembraneContext('dev-1', { ...CONTEXT, bufferPolicy: { mode: 'stop' } });
    expect(res.ok).toBe(true);
    const data = prisma.device.update.mock.calls[0]![0].data;
    expect(data.bufferPolicy).toBe('stop');
    expect(data.bufferQuotaBytes).toBe(2_000n);
    // Prisma.DbNull — объект-маркер, не JS null: параметров при stop в строке НЕТ.
    expect(data.bufferPolicyParams).not.toBeNull();
    expect(String(data.bufferPolicyParams)).not.toContain('threshold');
  });

  it('#2318: smart_cleanup даже с ПОЛНЫМ набором → ok:false, smart_cleanup_unavailable; в базу НЕ пишется ничего (порча: снять гейт → красный)', async () => {
    const { service, prisma } = makeService();
    const res = await service.syncMembraneContext('dev-1', {
      ...CONTEXT,
      bufferPolicy: { mode: 'smart_cleanup', params: FULL_PARAMS },
    });
    expect(res).toEqual({ ok: false, reason: 'smart_cleanup_unavailable' });
    expect(prisma.device.update).not.toHaveBeenCalled();
  });

  it('#2318: smart_cleanup БЕЗ параметров при выключенном гейте → причина ГЕЙТА, не params_incomplete (порча порядка → красный); в базу не пишется ничего', async () => {
    const { service, prisma } = makeService();
    const res = await service.syncMembraneContext('dev-1', {
      ...CONTEXT,
      bufferPolicy: { mode: 'smart_cleanup' },
    });
    expect(res).toEqual({ ok: false, reason: 'smart_cleanup_unavailable' });
    expect(prisma.device.update).not.toHaveBeenCalled();
  });

  it('неизвестный режим (легаси auto-cleanup) → ok:false, unknown_mode — отвергается, не «как раньше»', async () => {
    const { service, prisma } = makeService();
    const res = await service.syncMembraneContext('dev-1', {
      ...CONTEXT,
      bufferPolicy: { mode: 'auto-cleanup' },
    });
    expect(res).toEqual({ ok: false, reason: 'unknown_mode' });
    expect(prisma.device.update).not.toHaveBeenCalled();
  });

  it('старый кабинет без поля политики — квоты пишутся, политика в строке НЕ трогается', async () => {
    const { service, prisma } = makeService();
    const res = await service.syncMembraneContext('dev-1', CONTEXT);
    expect(res.ok).toBe(true);
    const data = prisma.device.update.mock.calls[0]![0].data;
    expect('bufferPolicy' in data).toBe(false);
    expect('bufferPolicyParams' in data).toBe(false);
  });
});

describe('регистрация прибора с политикой', () => {
  it('без поля — колонки политики не задаются: работает DEFAULT stop колонки, не догадка кода', async () => {
    const { service, prisma } = makeService();
    await service.register('lab', 'other' as never, CONTEXT);
    const data = prisma.device.create.mock.calls[0]![0].data;
    expect('bufferPolicy' in data).toBe(false);
  });

  it('с политикой мембраны (галочка стоит) — новый прибор получает её сразу', async () => {
    const { service, prisma } = makeService();
    await service.register('lab', 'other' as never, {
      ...CONTEXT,
      bufferPolicy: { mode: 'stop' },
    });
    const data = prisma.device.create.mock.calls[0]![0].data;
    expect(data.bufferPolicy).toBe('stop');
  });

  it('#2318: умная очистка при регистрации — 400 звонящему (внутренний вход), прибор не заводится; гейт судит раньше полноты', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.register('lab', 'other' as never, { ...CONTEXT, bufferPolicy: { mode: 'smart_cleanup', params: FULL_PARAMS } }),
    ).rejects.toThrow(/smart_cleanup_unavailable/u);
    expect(prisma.device.create).not.toHaveBeenCalled();
  });

  it('неизвестная политика при регистрации — 400 звонящему (внутренний вход), прибор не заводится', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.register('lab', 'other' as never, { ...CONTEXT, bufferPolicy: { mode: 'auto-cleanup' } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.device.create).not.toHaveBeenCalled();
  });
});

describe('канал к прибору: /quota несёт эффективную политику', () => {
  it('прибор со stop — quota.bufferPolicy = stop', async () => {
    const { service } = makeService();
    const quota = await service.getQuota('dev-1');
    expect(quota.bufferPolicy).toEqual({ mode: 'stop', params: null });
  });

  it('#2318 fail-closed: прибор со smart_cleanup и полным S в базе → прибору уезжает stop; warn с id прибора и мембраны — РОВНО один на прибор, не на каждое чтение (порча: снять fail-closed → красный)', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { service } = makeService(deviceRow({ bufferPolicy: 'smart_cleanup', bufferPolicyParams: FULL_PARAMS }));

    const quota = await service.getQuota('dev-1');
    expect(quota.bufferPolicy).toEqual({ mode: 'stop', params: null });
    expect(await service.getEffectiveBufferPolicy('dev-1')).toEqual({ mode: 'stop', params: null });
    await service.getQuota('dev-1');

    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]![0]);
    expect(message).toContain('dev-1');
    expect(message).toContain('m-1');
    expect(message).toMatch(/#2318/u);
  });

  it('#2318: warn дедуплицируется ПО ПРИБОРУ — второй прибор с той же порчей получает свой warn', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const rows: Record<string, unknown>[] = [
      deviceRow({ id: 'dev-1', bufferPolicy: 'smart_cleanup', bufferPolicyParams: FULL_PARAMS }),
      deviceRow({ id: 'dev-2', bufferPolicy: 'smart_cleanup', bufferPolicyParams: FULL_PARAMS }),
    ];
    const { service, prisma } = makeService();
    prisma.device.findUnique.mockImplementation((async (args: { where: { id: string } }) =>
      rows.find((r) => r['id'] === args.where.id) ?? null) as never);
    await service.getQuota('dev-1');
    await service.getQuota('dev-2');
    await service.getQuota('dev-1');
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('порченая строка (чужое значение / дырявый S) → прибору уезжает stop (порча: отдать иное → красный)', async () => {
    for (const row of [
      deviceRow({ bufferPolicy: 'auto-cleanup' }),
      deviceRow({ bufferPolicy: 'smart_cleanup', bufferPolicyParams: null }),
      deviceRow({ bufferPolicy: 'smart_cleanup', bufferPolicyParams: { thresholdPercent: 90 } }),
      deviceRow({ bufferPolicy: undefined }),
    ]) {
      const { service } = makeService(row);
      const quota = await service.getQuota('dev-1');
      expect(quota.bufferPolicy.mode).toBe('stop');
    }
  });

  it('вход блока A: getEffectiveBufferPolicy читает строку заново на каждый вызов — кеша нет', async () => {
    const { service, prisma } = makeService();
    await service.getEffectiveBufferPolicy('dev-1');
    await service.getEffectiveBufferPolicy('dev-1');
    expect(prisma.device.findUnique).toHaveBeenCalledTimes(2);
  });
});
