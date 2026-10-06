/**
 * Зубы настройки режима отбора при понижении (#2587 b4a). Порча P4a: на стволе 21305d85 сервиса и
 * таблицы нет — импорт падает, зуб красный.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_DOWNGRADE_CRITERION,
  DOWNGRADE_CRITERIA,
  isDowngrade,
  resolveDowngradeCriterion,
} from '../../domain/downgrade-policy';

import { MembraneDowngradePolicyService } from './membrane-downgrade-policy.service';

type Row = { criterion: string; updatedAt: Date };

function prismaStub(row: Row | null) {
  const rows = new Map<string, Row>();
  if (row) rows.set('m-1', row);
  return {
    rows,
    membraneDowngradePolicy: {
      findUnique: vi.fn(async ({ where }: { where: { membraneId: string } }) => rows.get(where.membraneId) ?? null),
      upsert: vi.fn(
        async ({ where, create, update }: { where: { membraneId: string }; create: { criterion: string }; update: { criterion: string } }) => {
          const next = {
            criterion: rows.has(where.membraneId) ? update.criterion : create.criterion,
            updatedAt: new Date('2026-10-06T12:00:00Z'),
          };
          rows.set(where.membraneId, next);
          return next;
        },
      ),
    },
  };
}

describe('MembraneDowngradePolicyService', () => {
  it('строки нет — умолчание «превышение над фоном», isDefault: true, строка НЕ заводится', async () => {
    const prisma = prismaStub(null);
    const view = await new MembraneDowngradePolicyService(prisma as never).read('m-1');
    expect(view).toEqual({ membraneId: 'm-1', criterion: 'loudness-over-floor', isDefault: true, updatedAt: null });
    expect(prisma.membraneDowngradePolicy.upsert).not.toHaveBeenCalled();
  });

  it('set каждым из трёх режимов — upsert по membraneId, read отдаёт его с isDefault: false', async () => {
    const prisma = prismaStub(null);
    const svc = new MembraneDowngradePolicyService(prisma as never);
    for (const criterion of DOWNGRADE_CRITERIA) {
      const out = await svc.set('m-1', criterion);
      expect(out).toMatchObject({ ok: true, policy: { criterion, isDefault: false } });
      expect((await svc.read('m-1')).criterion).toBe(criterion);
    }
    expect(prisma.membraneDowngradePolicy.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.membraneDowngradePolicy.upsert.mock.calls[0]?.[0]).toMatchObject({ where: { membraneId: 'm-1' } });
  });

  it('режим вне тройки / не строка — unknown_criterion, записи нет', async () => {
    const prisma = prismaStub(null);
    const svc = new MembraneDowngradePolicyService(prisma as never);
    for (const bad of ['rare', '', 42, null, undefined, { criterion: 'drone-likeness' }]) {
      expect(await svc.set('m-1', bad)).toMatchObject({ ok: false, reason: 'unknown_criterion' });
    }
    expect(prisma.membraneDowngradePolicy.upsert).not.toHaveBeenCalled();
  });

  it('строка с мусором (мимо CHECK) читается как умолчание с isDefault: true — второй пояс', async () => {
    const prisma = prismaStub({ criterion: 'rare', updatedAt: new Date('2026-10-01T00:00:00Z') });
    const view = await new MembraneDowngradePolicyService(prisma as never).read('m-1');
    expect(view).toMatchObject({ criterion: DEFAULT_DOWNGRADE_CRITERION, isDefault: true });
  });
});

describe('домен downgrade-policy', () => {
  it('resolve: валидное — как есть, мусор — умолчание', () => {
    expect(resolveDowngradeCriterion('drone-likeness')).toBe('drone-likeness');
    expect(resolveDowngradeCriterion('x')).toBe('loudness-over-floor');
    expect(resolveDowngradeCriterion(undefined)).toBe('loudness-over-floor');
  });

  it('isDowngrade по рангу сетки: ниже → true, выше/равно → false, неизвестный тариф → null', () => {
    const grid = { rows: [{ sku: 'free-v1', rank: 0 }, { sku: 'checkpoint-v1', rank: 1 }] } as never;
    expect(isDowngrade(grid, 'checkpoint-v1', 'free-v1')).toBe(true);
    expect(isDowngrade(grid, 'free-v1', 'checkpoint-v1')).toBe(false);
    expect(isDowngrade(grid, 'free-v1', 'free-v1')).toBe(false);
    expect(isDowngrade(grid, 'free-v1', 'nope')).toBeNull();
  });
});
