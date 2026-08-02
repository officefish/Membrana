/**
 * Зубы ОТЧЁТА `scripts:orphans` — того, что прибор вправе утверждать о себе.
 *
 * Повод конкретный: до 02.08 диагноз выводился из состояния реестра (`namespaces.length === 0`),
 * а не из замера, и потому называл причиной остатка ветвь предиката, которая в прогоне не
 * бежала. Замер 02.08: 51 сирота из 1000, все по `subject_unresolved`, по `no_rule` — ноль.
 * Строка при этом три дня говорила про нулевые правила членства.
 *
 * Зубы бьют по чистым функциям (`diagnosisLine`, `reportLines`), а не по прогону на живом
 * дереве: числа репозитория меняются каждым коммитом, и зуб, привязанный к «51 из 1000»,
 * краснел бы от чужой работы, ничего не говоря о правдивости слов.
 *
 * Прогон: `node --test scripts/scripts-orphans.test.mjs`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ORPHAN_REASONS } from './lib/belongs.mjs';
import { REGISTRY_STATES } from './lib/namespace-registry.mjs';
import { ORPHANS_STATUS } from './lib/scripts-workshop.mjs';
import { diagnosisLine, reportLines } from './scripts-orphans.mjs';

const okRegistry = (namespaces = []) => ({ state: REGISTRY_STATES.OK, namespaces, problems: [] });

/** Итог прогона: список путей и сводка выводятся из одной таблицы причин. */
function result(byReason, denominator = 100) {
  const counted = Object.values(byReason).reduce((a, b) => a + b, 0);
  const orphans = Array.from({ length: counted }, (_, i) => `scripts/orphan-${i}.mjs`);
  return {
    status: counted === 0 ? ORPHANS_STATUS.CLEAN : ORPHANS_STATUS.HAS_ORPHANS,
    orphans,
    byReason,
    counted,
    denominator,
  };
}

// ── Диагноз выводится из замера ───────────────────────────────────────────────────────────

test('все сироты по неразрешённому предмету: про нулевые правила членства НЕ сказано ни слова', () => {
  const line = diagnosisLine(okRegistry([]), result({ [ORPHAN_REASONS.SUBJECT_UNRESOLVED]: 51 }));

  assert.ok(line.includes('НИ ОДНОЙ'), 'ветвь «правила нет» названа пустой прямо');
  assert.ok(line.includes('51'), 'число из замера предъявлено');
  assert.ok(line.includes('subjectOf'), 'назван адрес починки — резолвер предмета');
  // Ровно то, что прибор говорил три дня подряд на этом же входе.
  assert.ok(!line.includes('правил членства ноль'), 'прежняя ложная посылка не печатается');
});

test('ветвь «правила нет» задействована при пустом реестре: прежняя строка возвращается, но заслуженно', () => {
  const line = diagnosisLine(
    okRegistry([]),
    result({ [ORPHAN_REASONS.NO_RULE]: 3, [ORPHAN_REASONS.SUBJECT_UNRESOLVED]: 7 }),
  );

  assert.ok(line.includes('правил членства заведено ноль'));
  assert.ok(line.includes('3 из 10'), 'сказано, скольких именно касается — не всех');
});

test('правила есть, но носители не покрыты: третья ветвь, а не первые две', () => {
  const line = diagnosisLine(
    okRegistry([{ id: 'ritual' }]),
    result({ [ORPHAN_REASONS.NO_RULE]: 2 }),
  );

  assert.ok(line.includes('правила членства заведены'));
  assert.ok(!line.includes('заведено ноль'));
  assert.ok(!line.includes('subjectOf'));
});

test('реестр недоступен: сказано, что членство НЕ проверялось — вывода о ветвях нет вовсе', () => {
  const line = diagnosisLine(
    { state: 'unreadable', problems: ['файл не разбирается'], namespaces: [] },
    result({ [ORPHAN_REASONS.SUBJECT_UNRESOLVED]: 4 }),
  );

  assert.ok(line.includes('НЕ проверялось'));
  assert.ok(line.includes('файл не разбирается'), 'причина недоступности предъявлена, а не скрыта');
  assert.ok(!line.includes('subjectOf'), 'на непроверенном реестре адрес починки не называется');
});

test('сирот нет: диагноза нет — говорить не о чем, а не «всё хорошо»', () => {
  assert.equal(diagnosisLine(okRegistry([]), result({})), null);
});

// ── Тело отчёта ───────────────────────────────────────────────────────────────────────────

test('сводка по ветвям печатается ДО списка адресов и с человеческим пояснением', () => {
  const lines = reportLines(
    result({ [ORPHAN_REASONS.NO_RULE]: 1, [ORPHAN_REASONS.SUBJECT_UNRESOLVED]: 2 }),
    okRegistry([]),
  );
  const summary = lines.findIndex((l) => l.includes(`${ORPHAN_REASONS.NO_RULE}: 1`));
  const firstPath = lines.findIndex((l) => l.includes('scripts/orphan-0.mjs'));

  assert.ok(summary !== -1, 'сводка есть');
  assert.ok(summary < firstPath, 'диагноз раньше адресов: список — это адреса, а не причина');
  assert.ok(lines[summary].includes('ни дом, ни правило членства не совпали'));
});

test('порядок ветвей в сводке детерминирован — один прогон печатается одинаково', () => {
  const a = reportLines(result({ no_rule: 1, subject_unresolved: 2 }), okRegistry([]));
  const b = reportLines(result({ subject_unresolved: 2, no_rule: 1 }), okRegistry([]));
  assert.deepEqual(a, b);
});

test('чистый прогон: ни диагноза, ни сводки, но знаменатель на месте', () => {
  const lines = reportLines(result({}, 668), okRegistry([]));

  assert.equal(lines.length, 2, 'шапка и вердикт — больше сказать нечего');
  assert.ok(lines[0].includes('знаменатель 668'));
  assert.ok(lines[1].includes('бесхозных нет'));
  assert.ok(!lines.some((l) => l.startsWith('⚠')));
});

test('длинный список урезается с явным остатком, сводка при этом полная', () => {
  const lines = reportLines(result({ [ORPHAN_REASONS.SUBJECT_UNRESOLVED]: 51 }), okRegistry([]), { limit: 20 });

  assert.ok(lines.some((l) => l.includes('и ещё 31')));
  assert.ok(lines.some((l) => l.includes(`${ORPHAN_REASONS.SUBJECT_UNRESOLVED}: 51`)), 'сводка считает всех, а не показанных');
});

test('без тестов знаменатель подписан иначе — знаменатели двух прогонов не путаются', () => {
  const withTests = reportLines(result({}, 1000), okRegistry([]), { includeTests: true });
  const without = reportLines(result({}, 668), okRegistry([]), { includeTests: false });

  assert.ok(withTests[0].includes('инструменты ∪ тесты'));
  assert.ok(without[0].includes('без тестов'));
});
