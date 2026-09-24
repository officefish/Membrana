/**
 * Тесты panel-cabinet-invite.
 *
 * Главная ценность — гард дрейфа: инструмент чеканит грант ЛИТЕРАЛОМ, а дверь
 * кабинета сверяет его с CABINET_REGISTER_GRANT в исходнике офиса. Разойдутся —
 * код будет чеканиться исправно, а регистрация молча получит grant_mismatch, и
 * это спишут на прод. Тест читает исходник и падает на расхождении.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CABINET_REGISTER_GRANT, buildMintRequest, parseArgs } from './panel-cabinet-invite.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = resolve(
  ROOT,
  'packages/background-office/src/modules/panel-users/panel-users-core.ts',
);

test('грант совпадает с буквой в двери офиса', () => {
  const src = readFileSync(CORE_SRC, 'utf8');
  const match = src.match(/export const CABINET_REGISTER_GRANT = '([^']+)'/);
  assert.ok(match, 'CABINET_REGISTER_GRANT не найден в panel-users-core.ts');
  assert.equal(CABINET_REGISTER_GRANT, match[1]);
});

test('тело чеканки несёт литерал, а не «*»', () => {
  const { path, method, body } = buildMintRequest({ label: 'второй кабинет', days: 7, maxUses: 1 });
  assert.equal(path, '/v1/panel/admin/promo-codes');
  assert.equal(method, 'POST');
  assert.deepEqual(body, {
    label: 'второй кабинет',
    grants: ['cabinet-register'],
    days: 7,
    maxUses: 1,
  });
  assert.ok(!body.grants.includes('*'), 'звёздочку дверь отвергает как grant_mismatch');
});

test('parseArgs: значения по умолчанию — 7 дней, одно использование', () => {
  const cli = parseArgs(['--label', 'x']);
  assert.equal(cli.days, 7);
  assert.equal(cli.maxUses, 1);
  assert.equal(cli.domain, 'panel.mmbrn.tech');
  assert.equal(cli.dryRun, false);
});

test('parseArgs: --label обязателен и не съедает следующий флаг', () => {
  assert.throws(() => parseArgs([]), /--label обязателен/);
  assert.throws(() => parseArgs(['--label', '--days', '7']), /--label обязателен/);
});

test('parseArgs: дробные и неположительные значения отвергаются', () => {
  assert.throws(() => parseArgs(['--label', 'x', '--days', '0']), /--days/);
  assert.throws(() => parseArgs(['--label', 'x', '--days', '1.5']), /--days/);
  assert.throws(() => parseArgs(['--label', 'x', '--uses', '-1']), /--uses/);
  assert.throws(() => parseArgs(['--label', 'x', '--uses', 'много']), /--uses/);
});
