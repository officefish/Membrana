/**
 * Зубы двух глаголов мастерской скриптов (§4 контракта `workshop-wires`).
 *
 * Прогон: `node --test scripts/scripts-workshop.test.mjs`
 */

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ORPHAN_REASONS, belongs } from './lib/belongs.mjs';
import {
  ORPHANS_STATUS,
  SETS_OF_OUTCOMES,
  SILENCES,
  inspectSet,
  listCarriers,
  listHomes,
  orphans,
  readKits,
  setsOf,
} from './lib/scripts-workshop.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('знаменатель — инструменты ∪ тесты, и он не пуст', () => {
  const all = listCarriers(repoRoot);
  const noTests = listCarriers(repoRoot, { includeTests: false });
  assert.ok(all.length > 0, 'обход обязан находить носители');
  assert.ok(all.length > noTests.length, 'тесты входят в знаменатель по §2');
  assert.ok(all.includes('scripts/lib/belongs.mjs'));
  assert.ok(all.includes('scripts/belongs.test.mjs'));
  assert.ok(!noTests.some((p) => p.endsWith('.test.mjs')));
});

test('ответ ВСЕГДА со статусом и знаменателем — молчаливой пустоты не бывает', () => {
  const res = orphans(repoRoot);
  assert.ok([ORPHANS_STATUS.CLEAN, ORPHANS_STATUS.HAS_ORPHANS].includes(res.status));
  assert.ok(res.denominator > 0, 'знаменатель обязан быть положительным');
  assert.equal(res.counted, res.orphans.length, 'счётчик и список не расходятся');
  if (res.status === ORPHANS_STATUS.CLEAN) assert.deepEqual(res.orphans, []);
});

test('бесхозный — только belongs=orphan, а не «вне китов»', () => {
  // Дом накрывает весь scripts/, китов в контексте нет вовсе — и это на счёт не влияет:
  // членство в ките есть поставка, а не принадлежность, и §4 запрещает подмену определения.
  const res = orphans(repoRoot, { homes: ['scripts'], namespaces: [] });
  const exists = (p) => existsSync(join(repoRoot, p));
  assert.ok(res.denominator > 0);
  // Остаток — НЕ дефект дома. Это ровно класс §2 «предмет не разрешён»: тест, чей предмет
  // не находится ни одним из двух локусов, наследовать нечего, и он честно сирота.
  assert.ok(
    res.orphans.every((p) => belongs(p, { homes: ['scripts'], exists }).reason === ORPHAN_REASONS.SUBJECT_UNRESOLVED),
    'внутри накрытого дома иных причин сиротства быть не может',
  );
  assert.ok(res.orphans.every((p) => p.endsWith('.test.mjs')));
});

test('без дома и правил всё сиротское — правдиво, а не подкручено', () => {
  const res = orphans(repoRoot, { homes: [], namespaces: [] });
  assert.equal(res.status, ORPHANS_STATUS.HAS_ORPHANS);
  assert.equal(res.counted, res.denominator, 'ни один носитель не припаркован');
});

test('правило членства паркует носители без всякого дома', () => {
  const ns = {
    id: 'scripts-all',
    title: 'Все скрипты',
    holder: { persona: 'dynin' },
    membership: { kind: 'pathPrefix', value: 'scripts' },
  };
  const withRule = orphans(repoRoot, { homes: [], namespaces: [ns] });
  const without = orphans(repoRoot, { homes: [], namespaces: [] });
  assert.ok(withRule.counted < without.counted, 'правило паркует, дома не требуя');
  // Остаток тот же класс §2 — правило членства его не закрывает и не должно: у теста
  // собственной принадлежности нет вовсе, наследовать не от чего.
  assert.ok(withRule.orphans.every((p) => p.endsWith('.test.mjs')));
});

test('замер §2 «предмет не разрешён» — 37 на 30.07 счётом заседания', () => {
  // Комната M8 назвала класс незакрытым и посчитала руками 37. Машина считает его же
  // и печатает своё число; расхождение — предмет разбора, а не повод подогнать ожидание.
  const res = orphans(repoRoot, { homes: ['scripts'], namespaces: [] });
  assert.ok(res.counted >= 37, `класс §2 не мог схлопнуться: сейчас ${res.counted}`);
  assert.ok(res.counted < res.denominator / 10, 'и он остаётся хвостом, а не половиной дома');
});

test('дома обходятся включая корневые — манифест мастерской скриптов виден ядру', () => {
  const homes = listHomes(repoRoot);
  assert.ok(homes.includes('scripts'), 'корневой дом не теряется, в отличие от обхода справочника');
  assert.ok(homes.includes('docs/audit/git'));
});

test('обратный поиск: файл кита найден, набор назван китом', () => {
  const kits = readKits(repoRoot);
  assert.ok(kits.length > 0, 'киты обязаны читаться');
  const kit = kits.find((k) => k.roots.length > 0 || k.pins.length > 0);
  const member = kit.roots[0] ?? kit.pins[0];
  const res = setsOf(repoRoot, member);
  assert.ok([SETS_OF_OUTCOMES.FOUND, SETS_OF_OUTCOMES.FOUND_MULTI].includes(res.outcome));
  assert.ok(res.sets.every((s) => s.kind === 'kit'), 'набор — только кит');
  assert.ok(res.sets.some((s) => s.id === kit.id));
});

test('дубликат внутри одного кита даёт ОДИН SetRef, а не found_multi', () => {
  const kits = [{ id: 'dup', roots: ['scripts/lib/belongs.mjs'], pins: ['scripts/lib/belongs.mjs'] }];
  const res = setsOf(repoRoot, 'scripts/lib/belongs.mjs', { kits });
  assert.equal(res.sets.length, 1);
  assert.equal(res.outcome, SETS_OF_OUTCOMES.FOUND, 'один кит дважды — это один набор');
});

test('found_multi — факт, не ошибка; порядок наборов устойчив', () => {
  const kits = [
    { id: 'zeta', roots: ['scripts/lib/belongs.mjs'], pins: [] },
    { id: 'alpha', roots: [], pins: ['scripts/lib/belongs.mjs'] },
  ];
  const res = setsOf(repoRoot, 'scripts/lib/belongs.mjs', { kits });
  assert.equal(res.outcome, SETS_OF_OUTCOMES.FOUND_MULTI);
  assert.deepEqual(res.sets.map((s) => s.id), ['alpha', 'zeta']);
});

test('три молчания различены: нет набора ≠ набор пуст ≠ файл ни в одном', () => {
  const kits = [{ id: 'empty-kit', roots: [], pins: [] }];
  assert.equal(inspectSet(repoRoot, 'нет-такого', { kits }).silence, SILENCES.NOT_DECLARED);
  assert.equal(inspectSet(repoRoot, 'empty-kit', { kits }).silence, SILENCES.SET_EMPTY);
  const orphaned = setsOf(repoRoot, 'scripts/lib/belongs.mjs', { kits });
  assert.equal(orphaned.outcome, SETS_OF_OUTCOMES.NOT_IN_ANY_SET);
  assert.deepEqual(orphaned.sets, []);
});

test('несуществующий путь — unknown_path, а не «ни в одном наборе»', () => {
  // Слить эти два исхода значит ответить «ни в одном наборе» на опечатку в имени файла.
  const res = setsOf(repoRoot, 'scripts/такого-нет.mjs');
  assert.equal(res.outcome, SETS_OF_OUTCOMES.UNKNOWN_PATH);
  assert.deepEqual(res.sets, []);
  assert.equal(setsOf(repoRoot, '').outcome, SETS_OF_OUTCOMES.UNKNOWN_PATH);
});

test('исходы и молчания — закрытые списки', () => {
  assert.deepEqual(Object.values(SETS_OF_OUTCOMES), ['found', 'found_multi', 'not_in_any_set', 'unknown_path']);
  assert.deepEqual(Object.values(SILENCES), ['set_empty', 'not_declared', 'not_in_any_set']);
});
