/**
 * Зуб схемы журнала уборщика (#2632 g1a). DoD плана: «модели и две миграции; зуб схемы —
 * `onDelete: Restrict` у обеих связей архива с прибором, Run/Job присутствуют».
 *
 * Три носителя одного словаря — `purge-journal.vocabulary.ts`, enum'ы `prisma/schema.prisma` (и
 * сгенерированный из неё клиент), `CREATE TYPE` миграции — обязаны совпадать: расхождение любого
 * из трёх красит этот файл, а не прод на первом `migrate deploy`.
 *
 * Красные на стволе 49ec16c6: словаря нет (import падает); у архива `onDelete: Cascade`; моделей и
 * миграций журнала нет.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, expectTypeOf, it } from 'vitest';

import { $Enums } from '../../prisma/client';
import {
  PURGE_JOB_STATUSES,
  PURGE_JOB_TARGETS,
  PURGE_PATH_ACTIONS,
  PURGE_RUN_MODES,
  PURGE_RUN_STATUSES,
  PURGE_RUN_TRIGGERS,
  type PurgeJobStatus,
  type PurgeJobTarget,
  type PurgeRunMode,
  type PurgeRunStatus,
  type PurgeRunTrigger,
} from './purge-journal.vocabulary';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (rel: string): string => readFileSync(join(PKG, rel), 'utf8').replace(/\r\n/g, '\n');

const schema = read('prisma/schema.prisma');
const restrictSql = read('prisma/migrations/20261008140000_downgrade_archive_device_restrict/migration.sql');
const journalSql = read('prisma/migrations/20261008140100_cold_archive_purge_journal/migration.sql');

/** Тело `model X { … }` / `enum X { … }` схемы; пустая строка — блока нет. */
function block(kind: 'model' | 'enum', name: string): string {
  return schema.match(new RegExp(`\\n${kind} ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
}

/** Значения enum схемы в порядке объявления. */
function schemaEnum(name: string): string[] {
  return block('enum', name)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[a-z_]+$/.test(line));
}

/** Значения `CREATE TYPE "X" AS ENUM (…)` миграции журнала. */
function sqlEnum(name: string): string[] {
  const body = journalSql.match(new RegExp(`CREATE TYPE "${name}" AS ENUM \\(([^)]*)\\);`))?.[1] ?? '';
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1] ?? '');
}

/** Строки SQL без комментариев — чтобы слова в пояснениях не засчитывались за операторы. */
const code = (sql: string): string =>
  sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

const ENUMS = [
  ['ColdArchivePurgeTrigger', PURGE_RUN_TRIGGERS],
  ['ColdArchivePurgeMode', PURGE_RUN_MODES],
  ['ColdArchivePurgeRunStatus', PURGE_RUN_STATUSES],
  ['ColdArchivePurgeTarget', PURGE_JOB_TARGETS],
  ['ColdArchivePurgeJobStatus', PURGE_JOB_STATUSES],
] as const;

describe('Т3: архив не уходит каскадом от прибора (Д6)', () => {
  it.each(['DowngradeArchiveBatch', 'DowngradeArchivedSample'])(
    '%s.device — onDelete: Restrict, Cascade в модели нет',
    (model) => {
      const body = block('model', model);
      expect(body).not.toBe('');
      expect(body).toMatch(/\n\s+device\s+Device\s+@relation\(fields: \[deviceId\], references: \[id\], onDelete: Restrict\)/);
      expect(body).not.toMatch(/onDelete: Cascade/);
    },
  );

  it('связь строк архива с партией не тронута — NoAction', () => {
    expect(block('model', 'DowngradeArchivedSample')).toMatch(/batch\s+DowngradeArchiveBatch\s+@relation\([^)]*onDelete: NoAction\)/);
  });

  it('миграция снимает оба CASCADE и ставит RESTRICT, ничего сверх', () => {
    const sql = code(restrictSql);
    for (const table of ['DowngradeArchiveBatch', 'DowngradeArchivedSample']) {
      expect(sql).toContain(`ALTER TABLE "${table}" DROP CONSTRAINT "${table}_deviceId_fkey";`);
      expect(sql).toMatch(
        new RegExp(
          `ALTER TABLE "${table}" ADD CONSTRAINT "${table}_deviceId_fkey"\\s+FOREIGN KEY \\("deviceId"\\) REFERENCES "Device"\\("id"\\) ON DELETE RESTRICT ON UPDATE CASCADE;`,
        ),
      );
    }
    expect(sql).not.toMatch(/ON DELETE CASCADE/);
    expect(sql).not.toMatch(/CREATE|DROP TABLE|batchId/);
    expect(sql.match(/;/g)).toHaveLength(4);
  });
});

describe('журнал: прогон и задание присутствуют', () => {
  it('ColdArchivePurgeRun — поля дизайна плана', () => {
    const body = block('model', 'ColdArchivePurgeRun');
    expect(body).not.toBe('');
    for (const field of [
      /id\s+String\s+@id @default\(uuid\(\)\) @db\.Uuid/,
      /trigger\s+ColdArchivePurgeTrigger\n/,
      /mode\s+ColdArchivePurgeMode\n/,
      /status\s+ColdArchivePurgeRunStatus\s+@default\(running\)/,
      /startedAt\s+DateTime\s+@default\(now\(\)\)/,
      /finishedAt\s+DateTime\?/,
      /enabledSnapshot\s+Boolean\n/,
      /dryRunSnapshot\s+Boolean\n/,
      /jobsTotal\s+Int\s+@default\(0\)/,
      /jobsSucceeded\s+Int\s+@default\(0\)/,
      /jobsFailed\s+Int\s+@default\(0\)/,
      /jobsDeadLetter\s+Int\s+@default\(0\)/,
      /bytesFreed\s+BigInt\s+@default\(0\)/,
      /errorSummary\s+String\?/,
    ]) {
      expect(body).toMatch(field);
    }
    expect(body).toMatch(/@@index\(\[status, finishedAt\]\)/);
  });

  it('ColdArchivePurgeJob — поля дизайна, уникальность (runId, batchId), индекс (status, nextAttemptAt)', () => {
    const body = block('model', 'ColdArchivePurgeJob');
    expect(body).not.toBe('');
    for (const field of [
      /runId\s+String\s+@db\.Uuid/,
      /run\s+ColdArchivePurgeRun\s+@relation\(fields: \[runId\], references: \[id\], onDelete: Restrict\)/,
      /targetType\s+ColdArchivePurgeTarget\n/,
      /batchId\s+String\?\s+@db\.Uuid/,
      /batch\s+DowngradeArchiveBatch\?\s+@relation\(fields: \[batchId\], references: \[id\], onDelete: NoAction\)/,
      /deviceId\s+String\?\s+@db\.Uuid/,
      /storageRefs\s+String\[\]/,
      /status\s+ColdArchivePurgeJobStatus\s+@default\(pending\)/,
      /attempt\s+Int\s+@default\(0\)/,
      /nextAttemptAt\s+DateTime\?/,
      /leaseUntil\s+DateTime\?/,
      /outcomes\s+Json\s+@default\("\{\}"\)/,
      /bytesFreed\s+BigInt\s+@default\(0\)/,
      /lastError\s+String\?/,
    ]) {
      expect(body).toMatch(field);
    }
    expect(body).toMatch(/@@unique\(\[runId, batchId\]\)/);
    expect(body).toMatch(/@@index\(\[status, nextAttemptAt\]\)/);
    // Журнал не держит прибор: deviceId — снимок, не внешний ключ.
    expect(body).not.toMatch(/\bDevice\b/);
  });

  it('миграция журнала создаёт обе таблицы, уникальность, индекс долга и два внешних ключа', () => {
    const sql = code(journalSql);
    expect(sql).toMatch(/CREATE TABLE "ColdArchivePurgeRun" \(/);
    expect(sql).toMatch(/CREATE TABLE "ColdArchivePurgeJob" \(/);
    expect(sql).toMatch(/"storageRefs" TEXT\[\],/);
    expect(sql).toMatch(/"outcomes" JSONB NOT NULL DEFAULT '\{\}',/);
    expect(sql).toContain(
      'CREATE UNIQUE INDEX "ColdArchivePurgeJob_runId_batchId_key" ON "ColdArchivePurgeJob"("runId", "batchId");',
    );
    expect(sql).toContain(
      'CREATE INDEX "ColdArchivePurgeJob_status_nextAttemptAt_idx" ON "ColdArchivePurgeJob"("status", "nextAttemptAt");',
    );
    expect(sql).toMatch(/"ColdArchivePurgeJob_runId_fkey"\s+FOREIGN KEY \("runId"\) REFERENCES "ColdArchivePurgeRun"\("id"\) ON DELETE RESTRICT/);
    expect(sql).toMatch(/"ColdArchivePurgeJob_batchId_fkey"\s+FOREIGN KEY \("batchId"\) REFERENCES "DowngradeArchiveBatch"\("id"\) ON DELETE NO ACTION/);
    // Журнал не трогает существующие таблицы и не ставит каскадов.
    expect(sql).not.toMatch(/ON DELETE CASCADE|DROP |ALTER TABLE "(Device|DowngradeArchive)/);
  });

  it('миграции идут после архива понижения и в порядке: Restrict, затем журнал', () => {
    const restrict = '20261008140000_downgrade_archive_device_restrict';
    const journal = '20261008140100_cold_archive_purge_journal';
    expect('20261005200000_downgrade_archive' < restrict).toBe(true);
    expect(restrict < journal).toBe(true);
  });
});

describe('словарь ≡ схема ≡ миграция ≡ клиент', () => {
  it.each(ENUMS)('%s', (name, vocabulary) => {
    expect(schemaEnum(name)).toEqual([...vocabulary]);
    expect(sqlEnum(name)).toEqual([...vocabulary]);
    expect(Object.values($Enums[name])).toEqual([...vocabulary]);
  });

  it('типы словаря совпадают с enum-типами клиента', () => {
    expectTypeOf<PurgeRunTrigger>().toEqualTypeOf<$Enums.ColdArchivePurgeTrigger>();
    expectTypeOf<PurgeRunMode>().toEqualTypeOf<$Enums.ColdArchivePurgeMode>();
    expectTypeOf<PurgeRunStatus>().toEqualTypeOf<$Enums.ColdArchivePurgeRunStatus>();
    expectTypeOf<PurgeJobTarget>().toEqualTypeOf<$Enums.ColdArchivePurgeTarget>();
    expectTypeOf<PurgeJobStatus>().toEqualTypeOf<$Enums.ColdArchivePurgeJobStatus>();
  });

  it('исход пути — закрытый список вердикта 3, в БД отдельного enum нет', () => {
    expect([...PURGE_PATH_ACTIONS]).toEqual(['removed', 'already_absent', 'failed']);
    const enumBodies = [...schema.matchAll(/\nenum \w+ \{([\s\S]*?)\n\}/g)].map((m) => m[1] ?? '');
    expect(enumBodies.length).toBeGreaterThan(5);
    expect(enumBodies.some((body) => /\balready_absent\b/.test(body))).toBe(false);
    expect(code(journalSql)).not.toMatch(/already_absent/);
  });
});
