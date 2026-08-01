/**
 * Зубы проекции пола сессии (§6 контракта `workshop-wires`).
 *
 * Прогон: `node --test scripts/session-floor.test.mjs`
 */

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DOC_LINK,
  MANY_WORKSHOPS,
  MAX_CALLABLE,
  POLICY_LINE,
  buildFloor,
  callableSet,
  entryVerb,
  readSecondLevelStamp,
  shortDescription,
} from './lib/session-floor.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('живое дерево: проекция собирается и несёт мастерские', () => {
  const floor = buildFloor(repoRoot);
  assert.ok(floor.workshopCount >= 13, `мастерских ${floor.workshopCount}`);
  assert.equal(floor.workshops.length, floor.workshopCount);
  assert.ok(floor.workshops.some((w) => w.home === 'scripts'), 'корневой дом виден после поправки §3');
  // Порядок устойчив: выдача не должна перетасовываться от файловой системы.
  const homes = floor.workshops.map((w) => w.home);
  assert.deepEqual(homes, [...homes].sort());
});

test('входной глагол — первый непустой из тройки, иначе честный прочерк', () => {
  assert.equal(entryVerb({ audit: 'yarn a', decompose: 'yarn d' }), 'yarn a');
  assert.equal(entryVerb({ audit: null, decompose: 'yarn d' }), 'yarn d');
  assert.equal(entryVerb({ audit: '  ', decompose: null, inspectElement: 'yarn i' }), 'yarn i');
  // Подставить «audit по умолчанию» значило бы отправить сессию звать несуществующую команду.
  assert.equal(entryVerb({ audit: null, decompose: null, inspectElement: null }), null);
  assert.equal(entryVerb({}), null);
  assert.equal(entryVerb(null), null);
  // Список ключей справочника ('audit','decompose') словарём НЕ является: имя ключа
  // командой не станет, и печатать его значило бы предложить дверь, которой нет.
  assert.equal(entryVerb(['audit', 'decompose']), null, 'массив ключей — не словарь вызовов');
});

test('описание режется по длине, а не по первой точке', () => {
  // Точка внутри пути рвала бы описание в случайном месте — выдача выглядела бы битой
  // там, где данные целы.
  const d = shortDescription({ summary: 'Дом группы. Читает docs/audit/git. Отдаёт отчёт' }, 90);
  assert.match(d, /Читает docs\/audit\/git/u);
  const long = shortDescription({ summary: 'я'.repeat(200) }, 20);
  assert.equal(long.length, 20);
  assert.ok(long.endsWith('…'));
  assert.equal(shortDescription({ summary: '   ' }), null, 'пусто — null, а не пустая строка');
});

test('набор вызовов — двери в мастерские, не каталог команд', () => {
  const ws = Array.from({ length: 20 }, (_, i) => ({ entryVerb: `yarn cmd-${String(i).padStart(2, '0')}` }));
  const { calls, dropped } = callableSet(ws);
  assert.equal(calls.length, MAX_CALLABLE);
  assert.equal(dropped, 20 - MAX_CALLABLE, 'остаток назван числом, а не отброшен молча');
  // Дубли схлопываются: две мастерских с одним входным глаголом — одна дверь.
  assert.deepEqual(callableSet([{ entryVerb: 'yarn x' }, { entryVerb: 'yarn x' }]).calls, ['yarn x']);
  // Прочерки в набор не попадают.
  assert.deepEqual(callableSet([{ entryVerb: null }, { entryVerb: 'yarn y' }]).calls, ['yarn y']);
});

test('счётчик мастерских не берётся из обрезанного списка', () => {
  const floor = buildFloor(repoRoot);
  assert.equal(floor.workshopCount, floor.workshops.length);
  assert.equal(floor.compact, floor.workshopCount > MANY_WORKSHOPS);
});

test('пол несёт строку политики и ровно одну ссылку — проекцией, не рукой', () => {
  const floor = buildFloor(repoRoot);
  assert.equal(floor.policyLine, POLICY_LINE);
  assert.match(floor.policyLine, /греп — последний/u);
  assert.equal(floor.docLink, DOC_LINK);
  assert.equal(typeof floor.docLink, 'string', 'ссылка одна, не список');
});

test('в пол НЕ входит запрещённое §6', () => {
  const floor = buildFloor(repoRoot);
  for (const forbidden of ['orphans', 'denominator', 'kits', 'readme']) {
    assert.equal(floor[forbidden], undefined, `${forbidden} не место в полу`);
  }
  // Обход знаменателя на старте §6 называет дефектом: проекция его и не считает.
  assert.equal(Object.keys(floor).includes('carriers'), false);
});

test('состояние реестра доезжает до пола, а не подменяется пустотой', () => {
  const floor = buildFloor(repoRoot);
  assert.ok(['ok', 'absent', 'unreadable', 'invalid'].includes(floor.registryState));
  assert.ok(Array.isArray(floor.namespaces));
  // Реестр сегодня пуст и валиден: правил ноль, и это не то же, что «реестра нет».
  if (floor.registryState === 'ok') assert.deepEqual(floor.registryProblems, []);
});

test('штампы приходят готовыми — проекция их не пересчитывает', () => {
  // Два независимых счёта одной свежести разъедутся, и сессия получит два разных ответа
  // на один вопрос.
  const stamps = { local: '2026-07-31', origin: '2026-07-31' };
  assert.equal(buildFloor(repoRoot, { stamps }).stamps, stamps);
  assert.equal(buildFloor(repoRoot).stamps, null, 'нет штампов — null, а не выдуманные');
});

test('метка второго уровня: нет файла — «неизвестно», а не «просрочен»', () => {
  const root = mkdtempSync(join(tmpdir(), 'floor-'));
  assert.equal(readSecondLevelStamp(root), null);
  mkdirSync(join(root, 'docs/procedures/dead-wires'), { recursive: true });
  writeFileSync(join(root, 'docs/procedures/dead-wires/LAST_RUN.json'), JSON.stringify({ at: '2026-07-25T10:00:00Z' }), 'utf8');
  assert.equal(readSecondLevelStamp(root), '2026-07-25T10:00:00Z');
  // Битый файл — тоже «неизвестно»: процедура могла ни разу не прогоняться.
  writeFileSync(join(root, 'docs/procedures/dead-wires/LAST_RUN.json'), '{ не json', 'utf8');
  assert.equal(readSecondLevelStamp(root), null);
});

test('в полу ТОЛЬКО мастерские — дома без оснастки вытеснили бы двери', () => {
  // Поймано красным CI 31.07: справочник стал отдавать 43 дома вместо корпуса мастерских, порог сжатия
  // сработал, и пол молча схлопнулся в счётчик «мастерских 43» вместо списка дверей.
  const floor = buildFloor(repoRoot);
  assert.equal(floor.workshopCount, 14, `в полу ${floor.workshopCount} записей`);
  assert.equal(floor.compact, false, 'четырнадцать в порог укладываются — сжатие не нужно');
  // Прочерк у мастерской законен (§6: «входной глагол ИЛИ честный прочерк») — сегодня такая
  // одна, docs/containers/strategic-docs со всеми verbs = null. Но тридцать прочерков подряд
  // означали бы, что в пол попали дома, а не мастерские.
  const noVerb = floor.workshops.filter((w) => w.entryVerb === null);
  assert.ok(noVerb.length <= 1, `без входного глагола ${noVerb.length}: ${noVerb.map((w) => w.home).join(', ')}`);
  assert.ok(floor.callable.calls.length >= 10, 'дверей в полу должно быть много, а не две');
});
