#!/usr/bin/env node
/**
 * yarn prisma:migration --name <name> [--schema <path>] — оффлайн-генерация
 * Prisma-миграции: diff между схемой в git (HEAD) и текущей рабочей схемой
 * (без подключения к БД). Делал это вручную 2× за 2026-07-08.
 *
 * Usage: yarn prisma:migration --name tariff_x --schema packages/background-cabinet/prisma/schema.prisma
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

/** `<YYYYMMDDHHMMSS>_<snake_name>` */
export function migrationDirName(date, name) {
  const ts = date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const snake = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!snake) throw new Error('prisma:migration: пустое --name');
  return `${ts}_${snake}`;
}

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function main() {
  const name = arg('--name');
  const schema = arg('--schema', 'packages/background-cabinet/prisma/schema.prisma');
  if (!name) throw new Error('prisma:migration: --name обязателен');
  if (!existsSync(schema)) throw new Error(`prisma:migration: схема не найдена: ${schema}`);

  // Старая схема из git (HEAD) во временный файл.
  const oldSchema = join(tmpdir(), `old-schema-${Date.now()}.prisma`);
  const gitSchema = execFileSync('git', ['show', `HEAD:${schema}`], { encoding: 'utf8' });
  writeFileSync(oldSchema, gitSchema, 'utf8');

  // Оффлайн-diff (без БД). DATABASE_URL нужен только для парса datasource-env.
  const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://u:p@localhost:5432/db' };
  const sql = execFileSync(
    'npx',
    ['--yes', 'prisma', 'migrate', 'diff', '--from-schema-datamodel', oldSchema, '--to-schema-datamodel', schema, '--script'],
    { encoding: 'utf8', env },
  ).trim();

  if (!sql || /No difference/i.test(sql)) {
    console.log('prisma:migration: нет изменений схемы относительно HEAD — миграция не нужна.');
    return;
  }

  const dir = join(dirname(schema), 'migrations', migrationDirName(new Date(), name));
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'migration.sql');
  writeFileSync(file, `${sql}\n`, 'utf8');
  console.log(`prisma:migration: создано ${file}`);
  console.log('  Применится entrypoint\'ом (prisma migrate deploy) в окне деплоя.');
}

if (process.argv[1]?.endsWith('prisma-migration-new.mjs')) {
  try {
    main();
  } catch (e) {
    console.error(String(e.message ?? e));
    process.exit(1);
  }
}
