/**
 * Зуб `tariff_scalars_declared` (S0 плана интеграции тарифной сетки, заседание
 * `tariff-grid` — ратифицировано владельцем 29.07).
 *
 * Стережёт то, на чём система уже разошлась: владелец назвал «Датчику» 512 МБ, а
 * сид продолжал нести 1 ГБ — декларация и носитель разъехались молча.
 *
 * Живёт в `scripts/`, а не рядом с сидом, СОЗНАТЕЛЬНО: vitest пакета берёт только
 * `src/**\/*.test.ts`, каталог тестов открывает только `scripts` — зуб у сида
 * никогда бы не прогнался и был бы мёртвым проводом.
 *
 * Эффекты: `red_ci` — форма декларации и носитель; `report_finding` —
 * незаявленное значение без причины.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  declarationFindings,
  loadDeclaration,
  MIB,
  mibToBytes,
  tariffScalars,
} from '../packages/background-cabinet/prisma/tariff-scalars.mjs';

const SEED_URL = new URL('../packages/background-cabinet/prisma/seed.mjs', import.meta.url);

test('декларация несёт три тарифа матрицы владельца', () => {
  const d = loadDeclaration();
  assert.deepEqual(d.tariffs.map((t) => t.id), ['free-v1', 'checkpoint-v1', 'observatory-v1']);
  assert.deepEqual(d.tariffs.map((t) => t.productName), ['Датчик', 'Блокпост', 'Наблюдательный пункт']);
});

test('«Датчик» несёт решение владельца: 512 МиБ, 1 устройство, 3 пользовательских сценария', () => {
  const free = tariffScalars('free-v1');
  assert.equal(free.userStorageQuotaMiB, 512, 'намеренный регресс с 1 ГБ — решение владельца 29.07');
  assert.equal(free.maxNodesPerMembrane, 1);
  assert.equal(free.maxUserWorkspaces, 3);
});

test('ранги монотонны по устройствам: 1 → 4 → 9', () => {
  const byRank = [...loadDeclaration().tariffs].sort((a, b) => a.rank - b.rank);
  assert.deepEqual(byRank.map((t) => t.maxNodesPerMembrane), [1, 4, 9]);
});

test('каждое незаявленное значение несёт причину — легальное «нет», не молчание', () => {
  assert.deepEqual(declarationFindings(loadDeclaration()), []);
});

test('находки называются поимённо, когда причина отсутствует', () => {
  const dirty = {
    tariffs: [{ id: 'x-v1', userStorageQuotaMiB: null, coldStorageQuotaMiB: null, coldStorageQuotaMiB_note: 'не назван' }],
  };
  const findings = declarationFindings(dirty);
  assert.equal(findings.length, 1, 'ловится только то, у чего нет причины');
  assert.match(findings[0], /x-v1\.userStorageQuotaMiB/u);
});

test('МиБ переводятся в байты; незаявленное остаётся null, а не нулём', () => {
  assert.equal(mibToBytes(512), 512n * MIB);
  assert.equal(mibToBytes(null), null, 'ноль означал бы «нельзя ничего», а не «неизвестно»');
  assert.equal(mibToBytes(undefined), null);
});

test('неизвестный тариф — громкий отказ, а не тихое умолчание', () => {
  assert.throws(() => tariffScalars('no-such-tariff'), /не объявлен в docs\/tariffs/u);
});

test('носитель читает декларацию и не держит своих числовых констант', () => {
  const seed = readFileSync(SEED_URL, 'utf8');
  assert.match(seed, /tariff-scalars\.mjs/u, 'сид читает декларацию');
  assert.ok(!/GIB\s*=/u.test(seed), 'константа объёма в сиде = второй источник истины');
  assert.ok(
    !/userStorageQuotaBytes:\s*\d/u.test(seed),
    'числовой литерал квоты в сиде — ровно тот дефект, из-за которого 512 МБ не доехали',
  );
});
