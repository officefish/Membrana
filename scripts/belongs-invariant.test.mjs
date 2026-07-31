/**
 * Зубы двухфазного инварианта принадлежности (§5 контракта `workshop-wires`).
 *
 * Прогон: `node --test scripts/belongs-invariant.test.mjs`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BASELINE_SCHEMA,
  BASELINE_STATES,
  INVARIANT_PHASES,
  checkInvariant,
  freezeBaseline,
  readBaseline,
} from './lib/belongs-invariant.mjs';

const NOW = '2026-07-31T10:00:00Z';

const baseDoc = (paths) => freezeBaseline(paths, '2026-07-31T09:00:00Z', 'включение зуба');
const base = (paths) => readBaseline(baseDoc(paths));

const waiver = (path, over = {}) => ({
  path,
  issuer: 'dynin',
  issuedAt: '2026-07-31T09:00:00Z',
  expiry: '2026-08-07T09:00:00Z',
  ...over,
});

// ── Две фазы ──────────────────────────────────────────────────────────────────────────────

test('фаза 1 судит прирост, наследство не блокирует', () => {
  const res = checkInvariant({
    orphans: ['scripts/old-a.mjs', 'scripts/old-b.mjs', 'scripts/new.mjs'],
    baseline: base(['scripts/old-a.mjs', 'scripts/old-b.mjs']),
    now: NOW,
  });
  assert.equal(res.ok, false);
  assert.deepEqual(res.growth, ['scripts/new.mjs']);
  assert.deepEqual(res.inherited, ['scripts/old-a.mjs', 'scripts/old-b.mjs']);
  // Наследство остаётся ВИДИМЫМ счётчиком, а не исчезает из поля зрения.
  assert.equal(res.denominator, 3);
});

test('прироста нет — зелено, хотя наследства полно', () => {
  const res = checkInvariant({
    orphans: ['scripts/old-a.mjs', 'scripts/old-b.mjs'],
    baseline: base(['scripts/old-a.mjs', 'scripts/old-b.mjs']),
    now: NOW,
  });
  assert.equal(res.ok, true);
  assert.deepEqual(res.growth, []);
  assert.equal(res.inherited.length, 2, 'прощено не значит забыто');
});

test('фаза 2 судит всё — и включается только явно, а не сама', () => {
  const input = {
    orphans: ['scripts/old.mjs'],
    baseline: base(['scripts/old.mjs']),
    now: NOW,
  };
  assert.equal(checkInvariant(input).ok, true, 'умолчание — фаза 1');
  assert.equal(checkInvariant({ ...input, phase: INVARIANT_PHASES.ABSOLUTE }).ok, false);
  // Третьей фазы нет: неизвестное имя — ошибка входа, а не «наверное рабочая».
  const bogus = checkInvariant({ ...input, phase: 'soft' });
  assert.equal(bogus.ok, false);
  assert.match(bogus.problems[0], /вне двух/u);
});

// ── Baseline ──────────────────────────────────────────────────────────────────────────────

test('невключённый зуб НЕ судит — иначе первый прогон блокирует за чужое наследство', () => {
  const res = checkInvariant({ orphans: ['scripts/a.mjs'], now: NOW });
  assert.equal(res.ok, false);
  assert.match(res.problems[0], /зуб не включён/u);
  assert.deepEqual(res.growth, [], 'вердикта о приросте нет вовсе, а не «всё прирост»');
});

test('отсутствие заморозки ≠ пустая заморозка', () => {
  assert.equal(readBaseline(null).state, BASELINE_STATES.ABSENT);
  const empty = readBaseline(baseDoc([]));
  assert.equal(empty.state, BASELINE_STATES.OK);
  // Пустая заморозка = «включён, когда сирот не было»: любой новый — прирост, и это верно.
  const res = checkInvariant({ orphans: ['scripts/a.mjs'], baseline: empty, now: NOW });
  assert.deepEqual(res.growth, ['scripts/a.mjs']);
});

test('порча baseline — отказ, а не тихая работа по половине документа', () => {
  for (const doc of [{ paths: [], frozenAt: NOW }, { schema: BASELINE_SCHEMA, frozenAt: NOW }, { schema: BASELINE_SCHEMA, paths: [], frozenAt: 'вчера' }]) {
    const b = readBaseline(doc);
    assert.equal(b.state, BASELINE_STATES.INVALID, JSON.stringify(doc));
    assert.equal(checkInvariant({ orphans: ['scripts/a.mjs'], baseline: b, now: NOW }).ok, false);
  }
});

test('заморозка — явный акт со следом: момент и причина названы', () => {
  const doc = freezeBaseline(['scripts/b.mjs', 'scripts/a.mjs', 'scripts/a.mjs'], NOW, 'включение зуба');
  assert.equal(doc.schema, BASELINE_SCHEMA);
  assert.equal(doc.frozenAt, NOW);
  assert.equal(doc.reason, 'включение зуба');
  assert.deepEqual(doc.paths, ['scripts/a.mjs', 'scripts/b.mjs'], 'дубли сняты, порядок устойчив');
  // Причина не названа — так и печатается, а не подставляется правдоподобная.
  assert.equal(freezeBaseline([], NOW).reason, 'не названа');
});

// ── Освобождения ──────────────────────────────────────────────────────────────────────────

test('действующее освобождение снимает прирост и оставляет след', () => {
  const res = checkInvariant({
    orphans: ['scripts/new.mjs'],
    baseline: base([]),
    waivers: [waiver('scripts/new.mjs')],
    now: NOW,
  });
  assert.equal(res.ok, true);
  assert.deepEqual(res.growth, []);
  assert.deepEqual(res.waived, ['scripts/new.mjs'], 'тихого прохода нет: путь назван');
});

test('просроченное освобождение не спасает — путь снова прирост', () => {
  const stale = waiver('scripts/new.mjs', { issuedAt: '2026-07-01T00:00:00Z', expiry: '2026-07-20T00:00:00Z' });
  const res = checkInvariant({ orphans: ['scripts/new.mjs'], baseline: base([]), waivers: [stale], now: NOW });
  assert.equal(res.ok, false);
  assert.deepEqual(res.growth, ['scripts/new.mjs']);
  assert.deepEqual(res.waived, []);
});

test('освобождение снимает и наследство в фазе 2', () => {
  const res = checkInvariant({
    orphans: ['scripts/old.mjs'],
    baseline: base(['scripts/old.mjs']),
    waivers: [waiver('scripts/old.mjs')],
    now: NOW,
    phase: INVARIANT_PHASES.ABSOLUTE,
  });
  assert.equal(res.ok, true);
});

// ── Область проверки ──────────────────────────────────────────────────────────────────────

test('pre-push сужает область до затронутого, отчёт — нет', () => {
  const input = {
    orphans: ['scripts/touched.mjs', 'scripts/untouched.mjs'],
    baseline: base([]),
    now: NOW,
  };
  const scoped = checkInvariant({ ...input, scope: ['scripts/touched.mjs'] });
  assert.deepEqual(scoped.growth, ['scripts/touched.mjs']);
  assert.equal(scoped.scoped, true);
  // Знаменатель НЕ сужается вместе с областью: иначе «1 из 1» читалось бы как полный охват.
  assert.equal(scoped.denominator, 2);

  const full = checkInvariant(input);
  assert.deepEqual(full.growth, ['scripts/touched.mjs', 'scripts/untouched.mjs']);
  assert.equal(full.scoped, false);
});

test('пустая область — не «чисто», а проверено ноль путей', () => {
  const res = checkInvariant({ orphans: ['scripts/a.mjs'], baseline: base([]), now: NOW, scope: [] });
  assert.equal(res.ok, true);
  assert.equal(res.scoped, true, 'признак сужения обязан доехать до отчёта');
  assert.equal(res.denominator, 1, 'знаменатель говорит, что мимо прошёл один путь');
});

test('дубли во входе не удваивают вердикт', () => {
  const res = checkInvariant({
    orphans: ['scripts/a.mjs', 'scripts\\a.mjs', 'scripts/a.mjs'],
    baseline: base([]),
    now: NOW,
  });
  assert.deepEqual(res.growth, ['scripts/a.mjs']);
  assert.equal(res.denominator, 1);
});
