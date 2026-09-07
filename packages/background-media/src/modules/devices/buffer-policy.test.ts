/**
 * Зубы носителя политики на сервере записей (#2308, блок B `overflow-policy`).
 *
 * Предмет — `buffer-policy.ts` и текст миграции `20260906120000_device_buffer_policy`.
 * У каждого зуба есть порча, дающая красный: вернуть дефолт автоочистки; записать
 * `smart_cleanup` без параметров; поставить NOT NULL до backfill.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BUFFER_POLICY_DENY_REASONS,
  BUFFER_POLICY_MODES,
  DEFAULT_BUFFER_POLICY,
  effectiveBufferPolicy,
  parseBufferPolicy,
  parseSmartCleanupParams,
} from './buffer-policy';

const FULL_PARAMS = { thresholdPercent: 90, selection: 'oldest_first', protectLabeled: true };

describe('словарь режимов', () => {
  it('ровно два режима, и легаси автоочистки среди них нет', () => {
    expect([...BUFFER_POLICY_MODES]).toEqual(['stop', 'smart_cleanup']);
    expect((BUFFER_POLICY_MODES as readonly string[]).includes('auto-cleanup')).toBe(false);
  });

  it('умолчание системы — stop без параметров', () => {
    expect(DEFAULT_BUFFER_POLICY).toEqual({ mode: 'stop', params: null });
  });
});

describe('гейт записи parseBufferPolicy', () => {
  it('stop принимается без параметров', () => {
    expect(parseBufferPolicy({ mode: 'stop' })).toEqual({ ok: true, policy: { mode: 'stop', params: null } });
  });

  it('smart_cleanup с полным S принимается', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: FULL_PARAMS })).toEqual({
      ok: true,
      policy: { mode: 'smart_cleanup', params: FULL_PARAMS },
    });
  });

  it('smart_cleanup БЕЗ параметров отвергается — режим не записывается (порча: принять → красный)', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup' })).toEqual({ ok: false, reason: 'params_incomplete' });
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: {} })).toEqual({
      ok: false,
      reason: 'params_incomplete',
    });
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: null })).toEqual({
      ok: false,
      reason: 'params_incomplete',
    });
  });

  it.each([
    ['thresholdPercent'],
    ['selection'],
    ['protectLabeled'],
  ] as const)('пропущен слот «%s» → params_incomplete', (missing) => {
    const params: Record<string, unknown> = { ...FULL_PARAMS };
    delete params[missing];
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params })).toEqual({
      ok: false,
      reason: 'params_incomplete',
    });
  });

  it.each([
    ['порог 0', { ...FULL_PARAMS, thresholdPercent: 0 }],
    ['порог 101', { ...FULL_PARAMS, thresholdPercent: 101 }],
    ['порог дробный', { ...FULL_PARAMS, thresholdPercent: 90.5 }],
    ['порог строкой', { ...FULL_PARAMS, thresholdPercent: '90' }],
    ['чужой критерий', { ...FULL_PARAMS, selection: 'random' }],
    ['защита строкой', { ...FULL_PARAMS, protectLabeled: 'yes' }],
  ])('значение вне домена (%s) → params_invalid, не incomplete', (_label, params) => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params })).toEqual({
      ok: false,
      reason: 'params_invalid',
    });
  });

  it('защита вещдоков false — ЗАКОННОЕ явное значение (указано, а не пропущено)', () => {
    expect(parseSmartCleanupParams({ ...FULL_PARAMS, protectLabeled: false })).toMatchObject({ ok: true });
  });

  it.each([
    ['легаси auto-cleanup', { mode: 'auto-cleanup' }],
    ['чужая строка', { mode: 'delete_everything' }],
    ['пусто', {}],
    ['не объект', 'stop'],
    ['null', null],
  ])('неизвестный режим (%s) отвергается как unknown_mode', (_label, raw) => {
    expect(parseBufferPolicy(raw)).toEqual({ ok: false, reason: 'unknown_mode' });
  });

  it('каждая причина закрытого списка достижима хотя бы одним входом', () => {
    const reached = new Set<string>();
    for (const raw of [{ mode: 'x' }, { mode: 'smart_cleanup' }, { mode: 'smart_cleanup', params: { ...FULL_PARAMS, thresholdPercent: 0 } }]) {
      const res = parseBufferPolicy(raw);
      if (!res.ok) reached.add(res.reason);
    }
    expect([...reached].sort()).toEqual([...BUFFER_POLICY_DENY_REASONS].sort());
  });
});

describe('effectiveBufferPolicy — третья скоба fail-closed', () => {
  it('effective(⊥) = stop: нет строки, нет поля, null', () => {
    expect(effectiveBufferPolicy(null)).toEqual(DEFAULT_BUFFER_POLICY);
    expect(effectiveBufferPolicy(undefined)).toEqual(DEFAULT_BUFFER_POLICY);
    expect(effectiveBufferPolicy({})).toEqual(DEFAULT_BUFFER_POLICY);
    expect(effectiveBufferPolicy({ bufferPolicy: null })).toEqual(DEFAULT_BUFFER_POLICY);
  });

  it('effective(порча) = stop: чужая строка, легаси автоочистка (порча: вернуть auto-cleanup → красный)', () => {
    expect(effectiveBufferPolicy({ bufferPolicy: 'auto-cleanup' }).mode).toBe('stop');
    expect(effectiveBufferPolicy({ bufferPolicy: 'garbage' }).mode).toBe('stop');
    expect(effectiveBufferPolicy({ bufferPolicy: 42 }).mode).toBe('stop');
  });

  it('smart_cleanup с дырявым S на чтении → stop, а не «умная с дырой»', () => {
    expect(effectiveBufferPolicy({ bufferPolicy: 'smart_cleanup', bufferPolicyParams: null }).mode).toBe('stop');
    expect(
      effectiveBufferPolicy({ bufferPolicy: 'smart_cleanup', bufferPolicyParams: { thresholdPercent: 90 } }).mode,
    ).toBe('stop');
    expect(effectiveBufferPolicy({ bufferPolicy: 'smart_cleanup', bufferPolicyParams: 'oops' }).mode).toBe('stop');
  });

  it('smart_cleanup с полным S читается как есть', () => {
    expect(effectiveBufferPolicy({ bufferPolicy: 'smart_cleanup', bufferPolicyParams: FULL_PARAMS })).toEqual({
      mode: 'smart_cleanup',
      params: FULL_PARAMS,
    });
  });

  it('stop с оставшимися параметрами → params null (параметры не протекают)', () => {
    expect(effectiveBufferPolicy({ bufferPolicy: 'stop', bufferPolicyParams: FULL_PARAMS })).toEqual(
      DEFAULT_BUFFER_POLICY,
    );
  });
});

describe('миграция backfill — первая и вторая скобы', () => {
  const migrationsDir = resolve(__dirname, '../../../prisma/migrations');
  const dir = readdirSync(migrationsDir).find((name) => name.endsWith('_device_buffer_policy'));
  const sql = dir ? readFileSync(resolve(migrationsDir, dir, 'migration.sql'), 'utf8') : '';

  it('миграция существует и заводит enum ровно из двух значений', () => {
    expect(dir, 'каталог миграции *_device_buffer_policy').toBeTruthy();
    expect(sql).toMatch(/CREATE TYPE "BufferPolicyMode" AS ENUM \('stop', 'smart_cleanup'\)/);
  });

  it('все существующие ряды → stop, и backfill стоит ДО NOT NULL (порча: поменять порядок → красный)', () => {
    const backfill = sql.search(/UPDATE "Device"\s+SET "bufferPolicy" = 'stop'\s+WHERE "bufferPolicy" IS NULL/);
    const notNull = sql.search(/ALTER COLUMN "bufferPolicy" SET NOT NULL/);
    expect(backfill).toBeGreaterThan(-1);
    expect(notNull).toBeGreaterThan(-1);
    expect(backfill).toBeLessThan(notNull);
  });

  it('DEFAULT stop после backfill; колонка добавляется без NOT NULL (иначе падение на живой базе)', () => {
    expect(sql).toMatch(/ALTER COLUMN "bufferPolicy" SET DEFAULT 'stop'/);
    expect(sql).not.toMatch(/ADD COLUMN "bufferPolicy" "BufferPolicyMode" NOT NULL/);
  });

  it('автоочистки в SQL-операторах миграции нет (комментарии — не предмет)', () => {
    const statements = sql
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n')
      .toLowerCase();
    expect(statements).not.toContain('auto');
  });
});
