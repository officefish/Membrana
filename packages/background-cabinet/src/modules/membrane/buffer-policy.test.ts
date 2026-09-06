/**
 * Зубы origin-домена политики переполнения (#2308, блок B `overflow-policy`).
 *
 * Предмет — `buffer-policy.ts` кабинета и текст миграции `20260906120000_buffer_overflow_policy`.
 * Порчи: `smart_cleanup` без параметров прошёл → красный; дефолт автоочистки вернулся →
 * красный; галочка стоит, а новый прибор не слушает мембрану → красный; NOT NULL до backfill → красный.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BUFFER_POLICY_DENY_REASONS,
  BUFFER_POLICY_MODES,
  DEFAULT_BUFFER_POLICY,
  effectiveBufferPolicy,
  effectiveDevicePolicy,
  parseBufferPolicy,
} from './buffer-policy';

const FULL_PARAMS = { thresholdPercent: 80, selection: 'largest_first', protectLabeled: false };
const SMART = { bufferPolicy: 'smart_cleanup', bufferPolicyParams: FULL_PARAMS };
const STOP = { bufferPolicy: 'stop', bufferPolicyParams: null };

describe('словарь и гейт записи (origin)', () => {
  it('два режима; автоочистки нет', () => {
    expect([...BUFFER_POLICY_MODES]).toEqual(['stop', 'smart_cleanup']);
  });

  it('smart_cleanup без параметров → params_incomplete; с чужим значением → params_invalid; чужой режим → unknown_mode', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup' })).toEqual({ ok: false, reason: 'params_incomplete' });
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: { ...FULL_PARAMS, thresholdPercent: 250 } })).toEqual({
      ok: false,
      reason: 'params_invalid',
    });
    expect(parseBufferPolicy({ mode: 'auto-cleanup' })).toEqual({ ok: false, reason: 'unknown_mode' });
  });

  it('полный набор принимается', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: FULL_PARAMS })).toEqual({
      ok: true,
      policy: { mode: 'smart_cleanup', params: FULL_PARAMS },
    });
  });

  it('закрытый список причин origin — шесть, и первые три общие с сервером записей', () => {
    expect([...BUFFER_POLICY_DENY_REASONS]).toEqual([
      'unknown_mode',
      'params_incomplete',
      'params_invalid',
      'binding_active',
      'binding_not_confirmed',
      'node_not_paired',
    ]);
  });
});

describe('effectiveBufferPolicy', () => {
  it('⊥ и порча → stop (порча: вернуть auto-cleanup → красный)', () => {
    expect(effectiveBufferPolicy(null)).toEqual(DEFAULT_BUFFER_POLICY);
    expect(effectiveBufferPolicy({ bufferPolicy: 'auto-cleanup' }).mode).toBe('stop');
    expect(effectiveBufferPolicy({ bufferPolicy: 'smart_cleanup', bufferPolicyParams: {} }).mode).toBe('stop');
  });
});

describe('семантика привязки effectiveDevicePolicy', () => {
  it('галочка стоит → прибор слушает мембрану, даже если у него своя настройка', () => {
    expect(effectiveDevicePolicy({ binding: true, membrane: SMART, device: STOP })).toEqual({
      mode: 'smart_cleanup',
      params: FULL_PARAMS,
    });
  });

  it('галочка стоит → НОВЫЙ прибор (строки ещё нет) слушает мембрану (порча: отдать stop → красный)', () => {
    expect(effectiveDevicePolicy({ binding: true, membrane: SMART, device: null })).toEqual({
      mode: 'smart_cleanup',
      params: FULL_PARAMS,
    });
  });

  it('галочка снята → прибору возвращается его настройка; мембрана — черновик', () => {
    expect(effectiveDevicePolicy({ binding: false, membrane: SMART, device: STOP })).toEqual(DEFAULT_BUFFER_POLICY);
    expect(effectiveDevicePolicy({ binding: false, membrane: STOP, device: SMART })).toEqual({
      mode: 'smart_cleanup',
      params: FULL_PARAMS,
    });
  });

  it('галочка снята, строки прибора нет → stop', () => {
    expect(effectiveDevicePolicy({ binding: false, membrane: SMART, device: null })).toEqual(DEFAULT_BUFFER_POLICY);
  });

  it('галочка стоит, мембрана порчена → stop, а не «как у прибора»', () => {
    expect(
      effectiveDevicePolicy({ binding: true, membrane: { bufferPolicy: 'garbage' }, device: SMART }),
    ).toEqual(DEFAULT_BUFFER_POLICY);
  });
});

describe('миграция кабинета — backfill stop, привязка снята', () => {
  const migrationsDir = resolve(__dirname, '../../../prisma/migrations');
  const dir = readdirSync(migrationsDir).find((name) => name.endsWith('_buffer_overflow_policy'));
  const sql = dir ? readFileSync(resolve(migrationsDir, dir, 'migration.sql'), 'utf8') : '';
  const statements = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

  it('enum из двух значений; прибор получает колонку, мембрана — отдельную таблицу с уникальностью на membraneId', () => {
    expect(dir).toBeTruthy();
    expect(statements).toMatch(/CREATE TYPE "BufferPolicyMode" AS ENUM \('stop', 'smart_cleanup'\)/);
    expect(statements).toMatch(/CREATE TABLE "MembraneBufferPolicy"/);
    expect(statements).toMatch(/CREATE UNIQUE INDEX "MembraneBufferPolicy_membraneId_key" ON "MembraneBufferPolicy"\("membraneId"\)/);
    expect(statements).toMatch(/ALTER TABLE "Device"\s+ADD COLUMN "bufferPolicy" "BufferPolicyMode",/);
    // Колонок на "Membrane" НЕТ намеренно (см. schema: перегрузка в sample-library).
    expect(statements).not.toMatch(/ALTER TABLE "Membrane"/);
  });

  it('мембраны: явный backfill строки stop / привязка снята на КАЖДУЮ существующую (порча: убрать INSERT → красный)', () => {
    expect(statements).toMatch(
      /INSERT INTO "MembraneBufferPolicy" \("id", "membraneId", "mode", "binding", "updatedAt"\)\s+SELECT gen_random_uuid\(\), "id", 'stop', false, CURRENT_TIMESTAMP\s+FROM "Membrane"/,
    );
    expect(statements).toMatch(/"mode" "BufferPolicyMode" NOT NULL DEFAULT 'stop'/);
    expect(statements).toMatch(/"binding" BOOLEAN NOT NULL DEFAULT false/);
    expect(statements).not.toMatch(/'stop', true/);
  });

  it.each(['Device'])('%s: backfill stop стоит ДО NOT NULL (порча: поменять порядок → красный)', (table) => {
    const backfill = statements.search(new RegExp(`UPDATE "${table}"\\s+SET "bufferPolicy" = 'stop'\\s+WHERE "bufferPolicy" IS NULL`));
    const notNullBlock = statements.indexOf(`ALTER TABLE "${table}"\n  ALTER COLUMN "bufferPolicy" SET DEFAULT 'stop'`);
    expect(backfill).toBeGreaterThan(-1);
    expect(notNullBlock).toBeGreaterThan(-1);
    expect(backfill).toBeLessThan(notNullBlock);
    expect(statements.slice(notNullBlock)).toMatch(/ALTER COLUMN "bufferPolicy" SET NOT NULL/);
  });

  it('автоочистки в SQL-операторах нет', () => {
    expect(statements.toLowerCase()).not.toContain('auto');
  });
});
