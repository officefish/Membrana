/**
 * Зубы глагола `orphans` мастерской скриптов — в части, ради которой он правился 02.08:
 * **причина исхода предиката доезжает до вызывающего**.
 *
 * Почему зубы именно здесь, а не в отчёте. До правки причина терялась внутри `orphans()`
 * одной строкой фильтра, и никакой зуб отчёта этого поймать не мог: отчёт получал уже
 * обеднённые данные и честно печатал то, что ему дали. Дефект жил в ядре — там же и
 * запирается.
 *
 * Прогон на настоящем дереве СОЗНАТЕЛЬНО не используется: числа живого репозитория
 * меняются каждым коммитом, и зуб, привязанный к «51 из 1000», краснел бы от чужой
 * работы. Вместо этого — временное дерево-образец, где каждая ветвь предиката задана
 * руками и обе причины встречаются разом.
 *
 * Прогон: `node --test scripts/lib/scripts-workshop.test.mjs`
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { ORPHAN_REASONS } from './belongs.mjs';
import { ORPHANS_STATUS, orphans } from './scripts-workshop.mjs';

/** Временные деревья прогона — снимаются разом в `after`, а не каждым тестом. */
const trees = [];

after(() => {
  for (const dir of trees) rmSync(dir, { recursive: true, force: true });
});

/**
 * Дерево-образец: `{ 'scripts/a.mjs': 'содержимое', … }`.
 * Каталоги заводятся сами; содержимое неважно — предикат тела не читает.
 */
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'workshop-orphans-'));
  trees.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, body ?? '');
  }
  return root;
}

/**
 * Смешанное дерево: обе причины сиротства разом плюс один припаркованный носитель.
 *
 * - `tool-a.mjs` — ни дома, ни правила → `no_rule`
 * - `tool-a.test.mjs` — предмет разрешён (§2), наследует исход предмета → тоже `no_rule`
 * - `lonely.test.mjs` — предмета нет ни в одном из двух локусов → `subject_unresolved`
 * - `parked/tool-b.mjs` — лежит в доме (манифест рядом) → не сирота вовсе
 */
const mixedTree = () =>
  fixture({
    'scripts/tool-a.mjs': '',
    'scripts/tool-a.test.mjs': '',
    'scripts/lonely.test.mjs': '',
    'scripts/parked/workshop.manifest.json': '{}',
    'scripts/parked/tool-b.mjs': '',
  });

// ── Причина доезжает ──────────────────────────────────────────────────────────────────────

test('вердикт несёт причину для КАЖДОЙ сироты, и причина из закрытого списка', () => {
  const r = orphans(mixedTree());
  const known = Object.values(ORPHAN_REASONS);

  assert.equal(r.verdicts.length, r.counted, 'вердиктов столько же, сколько сирот');
  for (const v of r.verdicts) {
    assert.ok(typeof v.path === 'string' && v.path !== '', 'у вердикта есть адрес');
    assert.ok(known.includes(v.reason), `причина «${v.reason}» вне закрытого списка`);
  }
});

test('обе ветви предиката различимы: no_rule и subject_unresolved встречаются раздельно', () => {
  const r = orphans(mixedTree());
  assert.deepEqual(r.byReason, { [ORPHAN_REASONS.NO_RULE]: 2, [ORPHAN_REASONS.SUBJECT_UNRESOLVED]: 1 });
});

// ── Инвариант сводки ──────────────────────────────────────────────────────────────────────

test('сводка сходится со списком: сумма byReason равна числу вердиктов и длине orphans', () => {
  const r = orphans(mixedTree());
  const sum = Object.values(r.byReason).reduce((a, b) => a + b, 0);

  assert.equal(sum, r.verdicts.length, 'сумма сводки ≠ числу вердиктов');
  assert.equal(sum, r.orphans.length, 'сумма сводки ≠ длине списка путей');
  assert.equal(sum, r.counted, 'сумма сводки ≠ счётчику');
});

test('ключа с нулём в сводке нет: незадействованная причина отсутствует, а не равна нулю', () => {
  // Ноль под ключом читался бы как «ветвь бежала и ничего не дала», тогда как её не было
  // вовсе. Именно эта разница и была враньём отчёта: он называл незадействованную ветвь
  // причиной остатка.
  //
  // Деревья взяты РАЗНЫЕ и с противоположными наборами причин. На одном образце утверждение
  // было бы подгонкой: реализация, заводящая все ключи заранее и вычищающая нули только в
  // одной ветке, прошла бы такой зуб (замечание Дынина на разборе блока).
  const cases = [
    [fixture({ 'scripts/lonely.test.mjs': '' }), [ORPHAN_REASONS.SUBJECT_UNRESOLVED]],
    [fixture({ 'scripts/tool-a.mjs': '' }), [ORPHAN_REASONS.NO_RULE]],
    [mixedTree(), [ORPHAN_REASONS.NO_RULE, ORPHAN_REASONS.SUBJECT_UNRESOLVED]],
  ];

  for (const [root, expected] of cases) {
    const r = orphans(root);
    assert.deepEqual(Object.keys(r.byReason).sort(), [...expected].sort());
    for (const [reason, count] of Object.entries(r.byReason)) {
      assert.ok(count > 0, `счётчик причины «${reason}» обязан быть положительным, а не нулевым`);
    }
  }
});

test('порядок и вид путей совпадают: orphans[i] — это verdicts[i].path', () => {
  const r = orphans(mixedTree());
  assert.deepEqual(r.orphans, r.verdicts.map((v) => v.path));
});

// ── Форма, обещанная соседям ──────────────────────────────────────────────────────────────

test('orphans остаётся списком СТРОК — расширение формы, а не смена', () => {
  const r = orphans(mixedTree());
  assert.ok(Array.isArray(r.orphans));
  for (const p of r.orphans) assert.equal(typeof p, 'string');
  assert.equal(typeof r.denominator, 'number');
  assert.equal(typeof r.counted, 'number');
});

// ── Пустой ответ ──────────────────────────────────────────────────────────────────────────

test('бесхозных нет: статус clean, сводка пуста, знаменатель ненулевой', () => {
  const root = fixture({
    'scripts/parked/workshop.manifest.json': '{}',
    'scripts/parked/tool-b.mjs': '',
  });
  const r = orphans(root);

  assert.equal(r.status, ORPHANS_STATUS.CLEAN);
  assert.equal(r.counted, 0);
  assert.deepEqual(r.byReason, {});
  assert.deepEqual(r.verdicts, []);
  // Знаменатель отделяет «чисто» от «обход не нашёл ни одного носителя» — §4 запрещает их
  // схлопывать, и пустая сводка сама по себе этой разницы не несёт.
  assert.equal(r.denominator, 1);
});

test('без тестов знаменатель падает, а сироты-тесты уходят из сводки', () => {
  const r = orphans(mixedTree(), { includeTests: false });

  assert.equal(r.denominator, 2, 'остались только инструменты');
  assert.deepEqual(r.byReason, { [ORPHAN_REASONS.NO_RULE]: 1 }, 'ветвь §2 не задействована вовсе');
});
