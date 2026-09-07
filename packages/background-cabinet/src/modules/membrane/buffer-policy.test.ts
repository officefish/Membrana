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
  effectiveDevicePolicy,
  explainBufferPolicy,
  explainDevicePolicy,
  membranePolicyScope,
  parseBufferPolicy,
} from './buffer-policy';

const FULL_PARAMS = { thresholdPercent: 80, selection: 'largest_first', protectLabeled: false };
const SMART = { bufferPolicy: 'smart_cleanup', bufferPolicyParams: FULL_PARAMS };
const STOP = { bufferPolicy: 'stop', bufferPolicyParams: null };
/**
 * #2318: опция «гейт снят» — только для зубов ветки параметров и привязки; умолчание — зеркало
 * словаря (выключено). Боевой код опцию не передаёт (сканирует зуб media `buffer-policy.test.ts`).
 */
const LIFTED = { smartCleanupAvailable: true } as const;

describe('#2318 — гейт умной очистки до T12 (origin)', () => {
  it('зеркало переключателя на кабинете равно словарю (порча: перевернуть зеркало руками → красный)', () => {
    expect(SMART_CLEANUP_AVAILABLE).toBe(CONTRACT_SMART_CLEANUP_AVAILABLE);
    expect(SMART_CLEANUP_UNAVAILABLE_REASON).toBe(CONTRACT_UNAVAILABLE_REASON);
    expect(SMART_CLEANUP_AVAILABLE).toBe(false);
  });

  it('smart_cleanup с ПОЛНЫМ набором → smart_cleanup_unavailable (порча: снять гейт → запись прошла → красный)', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: FULL_PARAMS })).toEqual({
      ok: false,
      reason: 'smart_cleanup_unavailable',
    });
  });

  it('порядок: неполный набор при выключенном гейте → причина гейта, не params_incomplete (порча порядка → красный)', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup' })).toEqual({ ok: false, reason: 'smart_cleanup_unavailable' });
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: { thresholdPercent: 250 } })).toEqual({
      ok: false,
      reason: 'smart_cleanup_unavailable',
    });
  });

  it('гейт не трогает stop и чужой режим', () => {
    expect(parseBufferPolicy({ mode: 'stop' })).toEqual({ ok: true, policy: DEFAULT_BUFFER_POLICY });
    expect(parseBufferPolicy({ mode: 'auto-cleanup' })).toEqual({ ok: false, reason: 'unknown_mode' });
  });

  it('fail-closed на чтении: SMART в строке → stop с названной причиной; при снятом гейте — как есть (порча: снять → красный)', () => {
    expect(effectiveBufferPolicy(SMART)).toEqual(DEFAULT_BUFFER_POLICY);
    expect(explainBufferPolicy(SMART)).toEqual({ policy: DEFAULT_BUFFER_POLICY, fallback: 'smart_cleanup_unavailable' });
    expect(explainBufferPolicy(SMART, LIFTED)).toEqual({ policy: { mode: 'smart_cleanup', params: FULL_PARAMS }, fallback: null });
    expect(explainBufferPolicy(STOP)).toEqual({ policy: DEFAULT_BUFFER_POLICY, fallback: null });
  });

  it('fail-closed через привязку: чья строка подменена — тот и назван субъектом (для адресного warn)', () => {
    expect(explainDevicePolicy({ binding: true, membrane: SMART, device: STOP })).toEqual({
      policy: DEFAULT_BUFFER_POLICY,
      fallback: 'smart_cleanup_unavailable',
      subject: 'membrane',
    });
    expect(explainDevicePolicy({ binding: false, membrane: STOP, device: SMART })).toEqual({
      policy: DEFAULT_BUFFER_POLICY,
      fallback: 'smart_cleanup_unavailable',
      subject: 'device',
    });
    expect(effectiveDevicePolicy({ binding: true, membrane: SMART, device: null })).toEqual(DEFAULT_BUFFER_POLICY);
  });

  it('scope мембраны несёт её id — адрес субъекта для журнала', () => {
    expect(membranePolicyScope({ membraneId: 'm-9', mode: 'stop', binding: true })).toEqual({
      membraneId: 'm-9',
      bufferPolicy: 'stop',
      bufferPolicyParams: undefined,
      bufferPolicyBinding: true,
    });
    expect(membranePolicyScope(null).membraneId).toBeNull();
  });
});

describe('словарь и гейт записи (origin)', () => {
  it('два режима; автоочистки нет', () => {
    expect([...BUFFER_POLICY_MODES]).toEqual(['stop', 'smart_cleanup']);
  });

  it('smart_cleanup без параметров → params_incomplete; с чужим значением → params_invalid; чужой режим → unknown_mode (ветка «гейт снят», #2318)', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup' }, LIFTED)).toEqual({ ok: false, reason: 'params_incomplete' });
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: { ...FULL_PARAMS, thresholdPercent: 250 } }, LIFTED)).toEqual({
      ok: false,
      reason: 'params_invalid',
    });
    expect(parseBufferPolicy({ mode: 'auto-cleanup' }, LIFTED)).toEqual({ ok: false, reason: 'unknown_mode' });
  });

  it('полный набор принимается (ветка «гейт снят», #2318)', () => {
    expect(parseBufferPolicy({ mode: 'smart_cleanup', params: FULL_PARAMS }, LIFTED)).toEqual({
      ok: true,
      policy: { mode: 'smart_cleanup', params: FULL_PARAMS },
    });
  });

  it('закрытый список причин origin — семь, и первые четыре общие с сервером записей', () => {
    expect([...BUFFER_POLICY_DENY_REASONS]).toEqual([
      'unknown_mode',
      'smart_cleanup_unavailable',
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
  // Ветка «гейт снят» (#2318): SMART и STOP различимы только при снятом гейте — иначе обе
  // строки читаются как stop и предмет привязки исчезает. Умолчание проверяет describe выше.
  it('галочка стоит → прибор слушает мембрану, даже если у него своя настройка', () => {
    expect(effectiveDevicePolicy({ binding: true, membrane: SMART, device: STOP }, LIFTED)).toEqual({
      mode: 'smart_cleanup',
      params: FULL_PARAMS,
    });
  });

  it('галочка стоит → НОВЫЙ прибор (строки ещё нет) слушает мембрану (порча: отдать stop → красный)', () => {
    expect(effectiveDevicePolicy({ binding: true, membrane: SMART, device: null }, LIFTED)).toEqual({
      mode: 'smart_cleanup',
      params: FULL_PARAMS,
    });
  });

  it('галочка снята → прибору возвращается его настройка; мембрана — черновик', () => {
    expect(effectiveDevicePolicy({ binding: false, membrane: SMART, device: STOP }, LIFTED)).toEqual(DEFAULT_BUFFER_POLICY);
    expect(effectiveDevicePolicy({ binding: false, membrane: STOP, device: SMART }, LIFTED)).toEqual({
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
