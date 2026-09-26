/**
 * Тесты panel-cabinet-invite.
 *
 * Главная ценность — гард дрейфа: инструмент чеканит грант ЛИТЕРАЛОМ, а дверь
 * кабинета сверяет его с CABINET_REGISTER_GRANT в исходнике офиса. Разойдутся —
 * код будет чеканиться исправно, а регистрация молча получит grant_mismatch, и
 * это спишут на прод. Тест читает исходник и падает на расхождении.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CABINET_REGISTER_GRANT, buildMintRequest, parseArgs } from './panel-cabinet-invite.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = resolve(
  ROOT,
  'packages/background-office/src/modules/panel-users/panel-users-core.ts',
);

/**
 * Предикат предмета (#2435): «исходник двери офиса найден по пути X».
 *
 * Без него `readFileSync` на переехавшем пакете бросал ENOENT, и зуб дрейфа говорил НЕ ТО:
 * «файла нет» читается как поломка теста, хотя утверждение зуба — про букву гранта.
 * Предмет проверяется первым и отдельной фразой, сравнение — только после.
 *
 * @param {string} [path]
 * @returns {string}
 */
export function readOfficeCoreSource(path = CORE_SRC) {
  if (!existsSync(path)) {
    throw new Error(
      `предмет зуба потерян: исходник двери офиса не найден по пути ${path}. ` +
        'Это НЕ дрейф буквы гранта — пакет переехал или переименован; поправьте путь в зубе.',
    );
  }
  return readFileSync(path, 'utf8');
}

test('предмет зуба: исходник двери офиса найден по объявленному пути', () => {
  assert.ok(existsSync(CORE_SRC), `исходник офиса не найден: ${CORE_SRC}`);
});

test('переезд пакета даёт внятный отказ, а не ENOENT', () => {
  const moved = `${CORE_SRC}.moved-away`;
  assert.throws(() => readOfficeCoreSource(moved), /предмет зуба потерян/);
  assert.throws(() => readOfficeCoreSource(moved), (e) => !/ENOENT/.test(String(e.message)));
});

test('грант совпадает с буквой в двери офиса', () => {
  const src = readOfficeCoreSource();
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
