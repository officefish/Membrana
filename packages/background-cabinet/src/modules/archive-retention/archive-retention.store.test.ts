/**
 * Зубы store срока хранения архива понижения и его носителей в схеме (#2588 b1, порча
 * P0, P5–P7 плана `docs/sprint/cut/cold-archive-retention-2588.json`).
 *
 * Без живой базы: Prisma — фейк на `vi.fn`, как в `membrane-buffer-policy.service.test.ts`.
 * Схема и миграция проверяются ТЕКСТОМ (первый такой зуб в кабинете) — предикаты по файлам,
 * не по Postgres.
 *
 * Красные на стволе a7ba5f9b: модуля нет (import падает), модели и миграции нет (предикаты).
 * Порчи после реализации: P5 завести строку при чтении → красный; P5a вернуть 2 как есть →
 * красный; P5b `create` вместо `upsert` → красный; P5c валидация после записи → красный;
 * P5d `catch → 14` → красный; P6 снять `@@unique` → красный; P6a колонка на `Membrane` →
 * красный; P7 backfill или снятый CHECK → красный; P0 импорт из `downgrade-archive` → красный.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { InvalidRetentionDaysError } from '../../domain/archive-retention';
import {
  ARCHIVE_RETENTION_READER,
  ArchiveRetentionStore,
  type ArchiveRetentionReader,
} from './archive-retention.store';

const HERE = dirname(fileURLToPath(import.meta.url));
const CABINET_ROOT = join(HERE, '..', '..', '..');
const read = (rel: string) => readFileSync(join(CABINET_ROOT, rel), 'utf8');

type Row = { membraneId: string; days: number; updatedBy: string; updatedAt: Date };

function make(row: Row | null | Error) {
  const prisma = {
    membraneArchiveRetention: {
      findUnique: vi.fn(async () => {
        if (row instanceof Error) throw row;
        return row;
      }),
      upsert: vi.fn(async (args: { where: { membraneId: string }; create: { days: number; updatedBy: string } }) => ({
        membraneId: args.where.membraneId,
        days: args.create.days,
        updatedBy: args.create.updatedBy,
        updatedAt: new Date('2026-10-05T16:00:00.000Z'),
      })),
    },
  };
  return { prisma, store: new ArchiveRetentionStore(prisma as never) };
}

const AT = new Date('2026-10-01T10:00:00.000Z');

describe('ArchiveRetentionStore.daysFor / read', () => {
  it('P5: строки нет → 14, isDefault=true, и чтение строк не заводит (upsert 0 вызовов)', async () => {
    const { prisma, store } = make(null);
    expect(await store.daysFor('m-1')).toBe(14);
    expect(await store.read('m-1')).toEqual({
      membraneId: 'm-1',
      retentionDays: 14,
      isDefault: true,
      updatedAt: null,
      updatedBy: null,
    });
    expect(prisma.membraneArchiveRetention.upsert).toHaveBeenCalledTimes(0);
    expect(prisma.membraneArchiveRetention.findUnique).toHaveBeenCalledWith({ where: { membraneId: 'm-1' } });
  });

  it('строка годна → её значение, isDefault=false, след записи виден', async () => {
    const { store } = make({ membraneId: 'm-1', days: 1, updatedBy: 'owner', updatedAt: AT });
    expect(await store.daysFor('m-1')).toBe(1);
    expect(await store.read('m-1')).toEqual({
      membraneId: 'm-1',
      retentionDays: 1,
      isDefault: false,
      updatedAt: AT,
      updatedBy: 'owner',
    });
  });

  it('P5a: значение вне списка в базе (2) → 14 — fail-safe в сторону хранения', async () => {
    const { store } = make({ membraneId: 'm-1', days: 2, updatedBy: 'owner', updatedAt: AT });
    expect(await store.daysFor('m-1')).toBe(14);
    expect((await store.read('m-1')).isDefault).toBe(true);
  });

  it('P5d: отказ базы → отказ, а не 14 («нет строки» ≠ «нет базы»)', async () => {
    const { store } = make(new Error('connection refused'));
    await expect(store.daysFor('m-1')).rejects.toThrow('connection refused');
    await expect(store.read('m-1')).rejects.toThrow('connection refused');
  });
});

describe('ArchiveRetentionStore.set', () => {
  it('P5b: один upsert по membraneId с updatedBy=actor; повтор того же значения — снова upsert, не create', async () => {
    const { prisma, store } = make(null);
    const first = await store.set('m-1', 1, 'owner:sub-42');
    expect(first).toEqual({
      membraneId: 'm-1',
      retentionDays: 1,
      isDefault: false,
      updatedAt: new Date('2026-10-05T16:00:00.000Z'),
      updatedBy: 'owner:sub-42',
    });
    await store.set('m-1', 1, 'owner:sub-42');
    expect(prisma.membraneArchiveRetention.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.membraneArchiveRetention.upsert).toHaveBeenNthCalledWith(1, {
      where: { membraneId: 'm-1' },
      create: { membraneId: 'm-1', days: 1, updatedBy: 'owner:sub-42' },
      update: { days: 1, updatedBy: 'owner:sub-42' },
    });
    expect((prisma.membraneArchiveRetention as Record<string, unknown>).create).toBeUndefined();
  });

  it.each([2, 0, -1, '14', 14.5, null])('P5c: %p → InvalidRetentionDaysError ДО базы (upsert 0 вызовов)', async (days) => {
    const { prisma, store } = make(null);
    await expect(store.set('m-1', days, 'owner')).rejects.toBeInstanceOf(InvalidRetentionDaysError);
    expect(prisma.membraneArchiveRetention.upsert).toHaveBeenCalledTimes(0);
    expect(prisma.membraneArchiveRetention.findUnique).toHaveBeenCalledTimes(0);
  });
});

describe('порт для блока 1 (#2587)', () => {
  it('P5e: store удовлетворяет ArchiveRetentionReader; токен — строка ARCHIVE_RETENTION_READER', () => {
    const { store } = make(null);
    expectTypeOf(store).toMatchTypeOf<ArchiveRetentionReader>();
    const reader: ArchiveRetentionReader = store;
    expect(typeof reader.daysFor).toBe('function');
    expect(ARCHIVE_RETENTION_READER).toBe('ARCHIVE_RETENTION_READER');
  });

  it('P0: файлы b1 не импортируют архив блока 1, media и plugin-handlers', () => {
    const sources = [
      'src/domain/archive-retention.ts',
      'src/modules/archive-retention/archive-retention.store.ts',
      'src/modules/archive-retention/archive-retention.module.ts',
    ].map(read);
    for (const text of sources) {
      expect(text).not.toMatch(/downgrade-archive/);
      expect(text).not.toMatch(/background-media/);
      expect(text).not.toMatch(/plugin-handlers/);
    }
  });
});

describe('схема и миграция (текстовые предикаты)', () => {
  const schema = read('prisma/schema.prisma');
  const migration = read('prisma/migrations/20261005160000_membrane_archive_retention/migration.sql');

  it('P6: модель MembraneArchiveRetention с membraneId uuid и @@unique([membraneId])', () => {
    const block = schema.match(/model MembraneArchiveRetention \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(block).not.toBe('');
    expect(block).toMatch(/membraneId\s+String\s+@db\.Uuid/);
    expect(block).toMatch(/days\s+Int\b/);
    expect(block).toMatch(/updatedBy\s+String\b/);
    expect(block).toMatch(/@@unique\(\[membraneId\]\)/);
  });

  it('P6a: у модели Membrane ровно 12 полей — скалярной колонки на Membrane не появилось (сторож TS2394)', () => {
    const block = schema.match(/\nmodel Membrane \{([\s\S]*?)\n\}/)?.[1] ?? '';
    const fields = block.split('\n').filter((line) => /^\s{2}[a-zA-Z]/.test(line));
    expect(fields).toHaveLength(12);
    expect(block).not.toMatch(/archiveRetention|retentionDays/);
  });

  it('P7: миграция создаёт таблицу, уникальный индекс по membraneId, CHECK по списку и НЕ делает backfill', () => {
    expect(migration).toMatch(/CREATE TABLE "MembraneArchiveRetention"/);
    expect(migration).toMatch(/"days" INTEGER NOT NULL/);
    expect(migration).toMatch(/"updatedBy" TEXT NOT NULL/);
    expect(migration).toMatch(/CHECK \("days" IN \(1, 7, 14, 30, 90\)\)/);
    expect(migration).toMatch(/CREATE UNIQUE INDEX "MembraneArchiveRetention_membraneId_key" ON "MembraneArchiveRetention"\("membraneId"\)/);
    expect(migration).not.toMatch(/INSERT INTO/);
    expect(migration).not.toMatch(/ALTER TABLE "Membrane"/);
  });

  it('P7b: PrismaModule глобален — @Global() стоит непосредственно перед export class PrismaModule (иначе модуль без imports не получит PrismaService)', () => {
    const prismaModule = read('src/prisma/prisma.module.ts');
    expect(prismaModule).toMatch(/@Global\(\)\s*\n@Module\(\{[\s\S]*?\}\)\s*\nexport class PrismaModule\b/);
    expect(read('src/modules/archive-retention/archive-retention.module.ts')).not.toMatch(/imports:/);
  });
});
