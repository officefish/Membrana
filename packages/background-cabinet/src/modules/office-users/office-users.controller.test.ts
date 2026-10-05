/**
 * Зубы служебной двери кабинета для office (#2588 b2, порча P8–P13 плана
 * `docs/sprint/cut/cold-archive-retention-2588.json`; P6/P7 охраны — в `office-token.guard.test.ts`).
 *
 * Без живой базы: Prisma и store — фейки на `vi.fn`. Форма ответа проверяется СЕРИАЛИЗАЦИЕЙ
 * (JSON.stringify), а не полями объекта: утечка пароля через вложенный объект — тоже утечка.
 *
 * Красные на стволе c68bf380: модуля нет — import падает; `OfficeUsersModule` в app.module нет.
 * Порчи после реализации: P8 `include: {user: true}` вместо `select` или прокидывание строки
 * как есть → красный; P9 `take: limit` без +1 или курсор без `skip: 1` → красный; P10 `create`
 * вместо `upsert` в store (зона b1) → красный здесь по `set` не виден — держит b1; P11 проверка
 * срока после запроса мембраны → красный (findUnique 1 вызов); P12 404 → 400 → красный;
 * P13 третий маршрут → красный; снять `@UseGuards(OfficeTokenGuard)` → красный.
 */
import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BadRequestException, NotFoundException, RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import { OfficeTokenGuard } from '../../common/guards/office-token.guard';
import { envSchemaWithDefaults } from '../../config/env.schema';
import { InvalidRetentionDaysError } from '../../domain/archive-retention';
import { OFFICE_USERS_ROUTE_PREFIX, OfficeUsersController } from './office-users.controller';
import { OFFICE_MEMBRANE_SELECT, OfficeUsersService, normalizeActor, parseCursor, parseLimit } from './office-users.service';

const HERE = dirname(fileURLToPath(import.meta.url));
const CABINET_ROOT = join(HERE, '..', '..', '..');

const M1 = '11111111-1111-4111-8111-111111111111';
const M2 = '22222222-2222-4222-8222-222222222222';
const M3 = '33333333-3333-4333-8333-333333333333';
const AT = new Date('2026-10-01T10:00:00.000Z');

/** «Жирная» строка — как если бы Prisma отдала всё: зуб P8 обязан не пропустить ничего лишнего. */
function fatRow(id: string, login: string) {
  return {
    id,
    userId: `user-of-${id.slice(0, 8)}`,
    tariffId: 'free',
    createdAt: AT,
    user: { login, passwordHash: 'argon2$SECRET', email: 'x@example.com', phone: '+70000000000', sessions: [{ token: 'tok' }] },
    samples: [{ storageRef: 'blob' }],
    nodes: [{ accessKeys: [{ token: 'key' }] }],
  };
}

function make(opts: { rows?: ReturnType<typeof fatRow>[]; membraneExists?: boolean; days?: Record<string, number> } = {}) {
  const rows = opts.rows ?? [];
  const prisma = {
    membrane: {
      findMany: vi.fn(async (args: { take: number; skip?: number; cursor?: { id: string } }) => {
        const start = args.cursor ? rows.findIndex((r) => r.id === args.cursor!.id) + (args.skip ?? 0) : 0;
        return rows.slice(start, start + args.take);
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        (opts.membraneExists ?? true) ? { id: where.id } : null,
      ),
    },
  };
  const store = {
    read: vi.fn(async (membraneId: string) => {
      const d = opts.days?.[membraneId];
      return d === undefined
        ? { membraneId, retentionDays: 14, isDefault: true, updatedAt: null, updatedBy: null }
        : { membraneId, retentionDays: d, isDefault: false, updatedAt: AT, updatedBy: 'owner' };
    }),
    set: vi.fn(async (membraneId: string, days: unknown, actor: string) => {
      if (![1, 7, 14, 30, 90].includes(days as number)) throw new InvalidRetentionDaysError(days);
      return { membraneId, retentionDays: days, isDefault: false, updatedAt: AT, updatedBy: actor };
    }),
  };
  const service = new OfficeUsersService(prisma as never, store as never);
  const controller = new OfficeUsersController(service);
  return { prisma, store, service, controller };
}

describe('GET v1/internal/office/membranes — P8 минимум полей, без PII', () => {
  it('ответ несёт ровно 7 полей на мембрану; в JSON нет пароля, сессий, проб, почты, телефона, ключей', async () => {
    const { controller, prisma } = make({ rows: [fatRow(M1, 'alice'), fatRow(M2, 'bob')], days: { [M2]: 1 } });
    const page = await controller.list(undefined, undefined);
    expect(page).toEqual({
      items: [
        { membraneId: M1, userId: 'user-of-11111111', displayLabel: 'alice', tariffId: 'free', retentionDays: 14, isDefault: true, createdAt: '2026-10-01T10:00:00.000Z' },
        { membraneId: M2, userId: 'user-of-22222222', displayLabel: 'bob', tariffId: 'free', retentionDays: 1, isDefault: false, createdAt: '2026-10-01T10:00:00.000Z' },
      ],
      nextCursor: null,
    });
    const json = JSON.stringify(page);
    for (const forbidden of ['passwordHash', 'SECRET', 'token', 'sessions', 'samples', 'storageRef', 'email', 'phone', 'accessKeys', 'nodes']) {
      expect(json, forbidden).not.toContain(forbidden);
    }
    // и форма ЗАПРОСА: select ровных колонок, у пользователя — только login
    expect(prisma.membrane.findMany).toHaveBeenCalledTimes(1);
    const args = prisma.membrane.findMany.mock.calls[0]![0] as Record<string, unknown>;
    expect(args.select).toEqual({ id: true, userId: true, tariffId: true, createdAt: true, user: { select: { login: true } } });
    expect(args).not.toHaveProperty('include');
    expect(OFFICE_MEMBRANE_SELECT.user.select).toEqual({ login: true });
  });

  it('пустой кабинет → items: [], nextCursor: null', async () => {
    const { controller } = make();
    expect(await controller.list(undefined, undefined)).toEqual({ items: [], nextCursor: null });
  });
});

describe('GET — P9 пагинация курсором', () => {
  it('limit=2 на трёх мембранах → 2 + nextCursor=id второй; второй вызов с курсором → 1 без курсора', async () => {
    const { controller, prisma } = make({ rows: [fatRow(M1, 'a'), fatRow(M2, 'b'), fatRow(M3, 'c')] });
    const first = await controller.list(undefined, '2');
    expect(first.items.map((i) => i.membraneId)).toEqual([M1, M2]);
    expect(first.nextCursor).toBe(M2);
    expect(prisma.membrane.findMany.mock.calls[0]![0]).toMatchObject({ take: 3, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    expect(prisma.membrane.findMany.mock.calls[0]![0]).not.toHaveProperty('cursor');

    const second = await controller.list(first.nextCursor!, '2');
    expect(second.items.map((i) => i.membraneId)).toEqual([M3]);
    expect(second.nextCursor).toBeNull();
    expect(prisma.membrane.findMany.mock.calls[1]![0]).toMatchObject({ take: 3, cursor: { id: M2 }, skip: 1 });
  });

  it('limit: пусто → 50, "200" → 200; "0", "201", "abc", "1.5" → 400 invalid_limit', () => {
    expect(parseLimit(undefined)).toBe(50);
    expect(parseLimit('')).toBe(50);
    expect(parseLimit('200')).toBe(200);
    for (const bad of ['0', '201', 'abc', '1.5', '-1']) {
      expect(() => parseLimit(bad), bad).toThrow(BadRequestException);
    }
  });

  it('cursor: пусто → null; не uuid → 400 invalid_cursor', () => {
    expect(parseCursor(undefined)).toBeNull();
    expect(parseCursor(M1)).toBe(M1);
    expect(() => parseCursor('not-a-uuid')).toThrow(BadRequestException);
  });
});

describe('PUT :membraneId/archive-retention', () => {
  it('P10: {days:1, actor} → 200-тело с retentionDays=1, isDefault=false, updatedBy=actor; store.set получил ровно (id, 1, actor)', async () => {
    const { controller, store } = make();
    const res = await controller.setArchiveRetention(M1, { days: 1, actor: 'owner:sub-42' });
    expect(res).toEqual({ membraneId: M1, retentionDays: 1, isDefault: false, updatedAt: '2026-10-01T10:00:00.000Z', updatedBy: 'owner:sub-42' });
    expect(store.set).toHaveBeenCalledWith(M1, 1, 'owner:sub-42');
    // повтор того же значения — тот же ответ, снова set (идемпотентный upsert в store)
    expect(await controller.setArchiveRetention(M1, { days: 1, actor: 'owner:sub-42' })).toEqual(res);
    expect(store.set).toHaveBeenCalledTimes(2);
  });

  it('actor: пусто → service:office; длиннее 128 — обрезается', () => {
    expect(normalizeActor(undefined)).toBe('service:office');
    expect(normalizeActor('  ')).toBe('service:office');
    expect(normalizeActor(42)).toBe('service:office');
    expect(normalizeActor('x'.repeat(200))).toHaveLength(128);
  });

  it.each([2, 0, -1, '14', 14.5, null, undefined])('P11: days=%p → 400 invalid_retention_days с allowed; базы и store не касались', async (days) => {
    const { controller, prisma, store } = make();
    const err = await controller.setArchiveRetention(M1, { days }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).toEqual({ code: 'invalid_retention_days', allowed: [1, 7, 14, 30, 90], received: days ?? null });
    expect(prisma.membrane.findUnique).toHaveBeenCalledTimes(0);
    expect(store.set).toHaveBeenCalledTimes(0);
  });

  it('P12: несуществующая мембрана → 404 membrane_not_found, set не зван; не-uuid → 404 без запроса', async () => {
    const { controller, prisma, store } = make({ membraneExists: false });
    const err = await controller.setArchiveRetention(M1, { days: 1 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NotFoundException);
    expect((err as NotFoundException).getResponse()).toEqual({ code: 'membrane_not_found' });
    expect(prisma.membrane.findUnique).toHaveBeenCalledWith({ where: { id: M1 }, select: { id: true } });
    expect(store.set).toHaveBeenCalledTimes(0);

    const bad = await controller.setArchiveRetention('evil', { days: 1 }).catch((e: unknown) => e);
    expect(bad).toBeInstanceOf(NotFoundException);
    expect(prisma.membrane.findUnique).toHaveBeenCalledTimes(1);
  });

  it('второй пояс: InvalidRetentionDaysError из store → 400 того же кода (не 500)', async () => {
    const { controller, store } = make();
    store.set.mockRejectedValueOnce(new InvalidRetentionDaysError(2));
    const err = await controller.setArchiveRetention(M1, { days: 7 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).toMatchObject({ code: 'invalid_retention_days', received: 2 });
  });
});

describe('P13: контракт маршрутов — ровно два, под охраной OfficeTokenGuard', () => {
  const proto = OfficeUsersController.prototype as Record<string, unknown>;
  const handlers = Object.getOwnPropertyNames(proto).filter(
    (name) => name !== 'constructor' && typeof proto[name] === 'function' && Reflect.getMetadata(PATH_METADATA, proto[name] as object) !== undefined,
  );

  it('префикс v1/internal/office/membranes; маршруты: GET "/" и PUT ":membraneId/archive-retention" — и больше ничего', () => {
    expect(Reflect.getMetadata(PATH_METADATA, OfficeUsersController)).toBe('v1/internal/office/membranes');
    expect(OFFICE_USERS_ROUTE_PREFIX).toBe('v1/internal/office/membranes');
    const contract = handlers
      .map((name) => ({
        method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, proto[name] as object) as RequestMethod],
        path: String(Reflect.getMetadata(PATH_METADATA, proto[name] as object)),
      }))
      .sort((a, b) => (`${a.path} ${a.method}` < `${b.path} ${b.method}` ? -1 : 1));
    // '/' (0x2F) сортируется раньше ':' (0x3A) — порядок детерминирован кодами символов.
    expect(contract).toEqual([
      { method: 'GET', path: '/' },
      { method: 'PUT', path: ':membraneId/archive-retention' },
    ]);
    expect(handlers).toHaveLength(2);
  });

  it('охрана на классе — ровно OfficeTokenGuard (не SessionGuard, не AdminGuard)', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, OfficeUsersController) as unknown[];
    expect(guards).toEqual([OfficeTokenGuard]);
  });

  it('провод: OfficeUsersModule зарегистрирован в app.module.ts и тянет ArchiveRetentionModule', () => {
    const appModule = readFileSync(join(CABINET_ROOT, 'src/app.module.ts'), 'utf8');
    expect(appModule).toMatch(/import \{ OfficeUsersModule \} from '\.\/modules\/office-users\/office-users\.module'/);
    expect(appModule).toMatch(/imports: \[[\s\S]*OfficeUsersModule,[\s\S]*\]/);
    const module = readFileSync(join(CABINET_ROOT, 'src/modules/office-users/office-users.module.ts'), 'utf8');
    expect(module).toMatch(/imports: \[ArchiveRetentionModule\]/);
  });
});

describe('конфиг: CABINET_OFFICE_TOKEN', () => {
  const base = { API_INTERNAL_TOKEN: 'media-key', DATABASE_URL: 'postgresql://t:t@localhost:5432/t' };

  it('не задан или пустой → undefined (дверь ответит 503), конфиг валиден', () => {
    for (const env of [base, { ...base, CABINET_OFFICE_TOKEN: '' }, { ...base, CABINET_OFFICE_TOKEN: '  ' }]) {
      const parsed = envSchemaWithDefaults.safeParse(env);
      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.CABINET_OFFICE_TOKEN).toBeUndefined();
    }
  });

  it('задан и отличается от API_INTERNAL_TOKEN → принят как есть', () => {
    const parsed = envSchemaWithDefaults.safeParse({ ...base, CABINET_OFFICE_TOKEN: 'office-key' });
    expect(parsed.success && parsed.data.CABINET_OFFICE_TOKEN).toBe('office-key');
  });

  it('P6 на уровне конфига: равен API_INTERNAL_TOKEN → конфиг отвергнут с названием ключа', () => {
    const parsed = envSchemaWithDefaults.safeParse({ ...base, CABINET_OFFICE_TOKEN: 'media-key' });
    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues.map((i) => i.path.join('.'))).toEqual(['CABINET_OFFICE_TOKEN']);
  });
});
