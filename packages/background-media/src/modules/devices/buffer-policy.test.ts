/**
 * Зубы носителя политики на сервере записей (#2308, блок B `overflow-policy`).
 *
 * Предмет — `buffer-policy.ts` и текст миграции `20260906120000_device_buffer_policy`.
 * У каждого зуба есть порча, дающая красный: вернуть дефолт автоочистки; записать
 * `smart_cleanup` без параметров; поставить NOT NULL до backfill.
 *
 * #2318 (гейт до T12): `smart_cleanup` с полным S при выключенном гейте → `smart_cleanup_unavailable`
 * (порча: снять гейт → запись прошла → красный); неполный S при выключенном гейте → причина ГЕЙТА,
 * не `params_incomplete` (порча порядка проверок → красный); чтение строки с умной очисткой →
 * `stop` (порча: снять fail-closed → красный); зеркало переключателя на media равно словарю
 * (порча: перевернуть зеркало руками → красный); боевой код не передаёт опцию «гейт снят».
 * Ветка «гейт снят» проверяется опцией `LIFTED` — так зубы полноты параметров живут, не
 * переворачивая словарь.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SMART_CLEANUP_AVAILABLE as CONTRACT_SMART_CLEANUP_AVAILABLE,
  SMART_CLEANUP_UNAVAILABLE_REASON as CONTRACT_UNAVAILABLE_REASON,
} from '../../../../plugin-contracts/src/buffer-overflow/index.js';
import {
  BUFFER_POLICY_DENY_REASONS,
  BUFFER_POLICY_MODES,
  DEFAULT_BUFFER_POLICY,
  SMART_CLEANUP_AVAILABLE,
  SMART_CLEANUP_UNAVAILABLE_REASON,
  effectiveBufferPolicy,
  explainBufferPolicy,
  parseBufferPolicy,
  parseSmartCleanupParams,
} from './buffer-policy';

const FULL_PARAMS = { thresholdPercent: 90, selection: 'oldest_first', protectLabeled: true };
/** Опция «гейт снят» — только для зубов ветки полноты параметров; умолчание — зеркало словаря. */
const LIFTED = { smartCleanupAvailable: true } as const;

describe('#2318 — гейт умной очистки до T12', () => {
  it('зеркало переключателя на media равно словарю (порча: перевернуть зеркало руками → красный)', () => {
    expect(SMART_CLEANUP_AVAILABLE).toBe(CONTRACT_SMART_CLEANUP_AVAILABLE);
    expect(SMART_CLEANUP_UNAVAILABLE_REASON).toBe(CONTRACT_UNAVAILABLE_REASON);
    expect(SMART_CLEANUP_AVAILABLE).toBe(false);
  });

  it('причина гейта входит в закрытый список причин отказа записи', () => {
    expect(BUFFER_POLICY_DENY_REASONS).toContain(SMART_CLEANUP_UNAVAILABLE_REASON);
  });

  it('гейт снят → запись smart_cleanup с полным S прошла бы (порча: гейт снят по умолчанию → красный)', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: FULL_PARAMS })).toEqual({
      ok: false,
      reason: 'smart_cleanup_unavailable',
    });
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: FULL_PARAMS }, LIFTED)).toEqual({
      ok: true,
      policy: { mode: 'smart_cleanup', params: FULL_PARAMS },
    });
  });

  it('порядок: неполный S при выключенном гейте → причина гейта, не params_incomplete (порча порядка → красный)', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup' })).toEqual({ ok: false, reason: 'smart_cleanup_unavailable' });
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: { thresholdPercent: 0 } })).toEqual({
      ok: false,
      reason: 'smart_cleanup_unavailable',
    });
  });

  it('гейт не трогает stop и не превращает чужой режим в «недоступно»', () => {
    expect(parseBufferPolicy({ mode: 'stop' })).toEqual({ ok: true, policy: DEFAULT_BUFFER_POLICY });
    expect(parseBufferPolicy({ mode: 'auto-cleanup' })).toEqual({ ok: false, reason: 'unknown_mode' });
  });

  it('fail-closed на чтении: smart_cleanup с полным S в строке → stop, причина подмены названа (порча: снять → красный)', () => {
    const row = { bufferPolicy: 'smart_cleanup', bufferPolicyParams: FULL_PARAMS };
    expect(effectiveBufferPolicy(row)).toEqual(DEFAULT_BUFFER_POLICY);
    expect(explainBufferPolicy(row)).toEqual({ policy: DEFAULT_BUFFER_POLICY, fallback: 'smart_cleanup_unavailable' });
    expect(explainBufferPolicy(row, LIFTED)).toEqual({ policy: { mode: 'smart_cleanup', params: FULL_PARAMS }, fallback: null });
    expect(explainBufferPolicy({ bufferPolicy: 'stop' })).toEqual({ policy: DEFAULT_BUFFER_POLICY, fallback: null });
    expect(explainBufferPolicy(null)).toEqual({ policy: DEFAULT_BUFFER_POLICY, fallback: null });
  });

  it('боевой код серверов, кабинета и клиента НЕ передаёт опцию «гейт снят» — она только для зубов', () => {
    const repoRoot = resolve(__dirname, '..', '..', '..', '..', '..');
    const roots = [
      'packages/background-media/src',
      'packages/background-cabinet/src',
      'apps/cabinet/src',
      'apps/client/src',
    ];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry !== 'node_modules' && entry !== 'dist') walk(full);
          continue;
        }
        if (!/\.tsx?$/u.test(entry) || /\.(test|spec)\.tsx?$/u.test(entry)) continue;
        files.push(full);
      }
    };
    for (const root of roots) walk(resolve(repoRoot, root));
    expect(files.length).toBeGreaterThan(200);
    const offenders = files
      .filter((f) => /smartCleanupAvailable\s*:\s*true/u.test(readFileSync(f, 'utf8')))
      .map((f) => relative(repoRoot, f).replace(/\\/gu, '/'));
    expect(offenders).toEqual([]);
  });
});

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

  it('smart_cleanup с полным S принимается (ветка «гейт снят», #2318)', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: FULL_PARAMS }, LIFTED)).toEqual({
      ok: true,
      policy: { mode: 'smart_cleanup', params: FULL_PARAMS },
    });
  });

  it('smart_cleanup БЕЗ параметров отвергается — режим не записывается (порча: принять → красный; ветка «гейт снят»)', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup' }, LIFTED)).toEqual({ ok: false, reason: 'params_incomplete' });
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: {} }, LIFTED)).toEqual({
      ok: false,
      reason: 'params_incomplete',
    });
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: null }, LIFTED)).toEqual({
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
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params }, LIFTED)).toEqual({
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
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params }, LIFTED)).toEqual({
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
    // Гейт (умолчание) — одна причина; остальные три — при снятом гейте (ветка параметров).
    const gated = parseBufferPolicy({ mode: 'smart_cleanup', params: FULL_PARAMS });
    if (!gated.ok) reached.add(gated.reason);
    for (const raw of [{ mode: 'x' }, { mode: 'smart_cleanup' }, { mode: 'smart_cleanup', params: { ...FULL_PARAMS, thresholdPercent: 0 } }]) {
      const res = parseBufferPolicy(raw, LIFTED);
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

  it('smart_cleanup с полным S читается как есть — только при снятом гейте (#2318); по умолчанию → stop', () => {
    expect(effectiveBufferPolicy({ bufferPolicy: 'smart_cleanup', bufferPolicyParams: FULL_PARAMS }, LIFTED)).toEqual({
      mode: 'smart_cleanup',
      params: FULL_PARAMS,
    });
    expect(effectiveBufferPolicy({ bufferPolicy: 'smart_cleanup', bufferPolicyParams: FULL_PARAMS })).toEqual(
      DEFAULT_BUFFER_POLICY,
    );
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
