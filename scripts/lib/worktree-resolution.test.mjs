/**
 * Зубы предиката резолюции воркспейс-пакетов (#1647).
 *
 * Держат дефект: пакеты параллельного worktree резолвятся в чужие деревья, межпакетный
 * typecheck читает чужой dist и остаётся зелёным — локальная зелень неотличима от достоверной.
 * Прибор говорит это вслух; зубы держат, что говорит он ЗАМЕРЕННОЕ и детерминированно.
 *
 * Прогон: `node --test scripts/lib/worktree-resolution.test.mjs`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  classifyResolution,
  FOREIGN_SAMPLE_LIMIT,
  formatResolution,
  RESOLUTION_STATES,
} from './worktree-resolution.mjs';

const ROOT = 'C:\\trees\\mine';
const own = (name) => ({ name, realPath: `${ROOT}\\packages\\${name}` });
const alien = (name) => ({ name, realPath: `C:\\trees\\other\\packages\\${name}` });

// ── Классификация ─────────────────────────────────────────────────────────────────────────

test('все внутрь дерева → own; хотя бы один наружу → foreign', () => {
  assert.equal(classifyResolution(ROOT, [own('a'), own('b')]).state, RESOLUTION_STATES.OWN);
  assert.equal(classifyResolution(ROOT, [own('a'), alien('b')]).state, RESOLUTION_STATES.FOREIGN);
});

test('счёт сходится: own + foreign + broken = total', () => {
  const r = classifyResolution(ROOT, [own('a'), alien('b'), alien('c'), { name: 'd', realPath: null }]);
  assert.equal(r.own + r.foreign + r.broken, r.total);
  assert.deepEqual([r.own, r.foreign, r.broken, r.total], [1, 2, 1, 4]);
});

test('замер 03.08 воспроизводится формой: 1 свой, 36 чужих — foreign с образцом имён', () => {
  const packages = [own('mfcc-analyzer-service'), ...Array.from({ length: 36 }, (_, i) => alien(`pkg-${String(i).padStart(2, '0')}`))];
  const r = classifyResolution(ROOT, packages);
  assert.deepEqual([r.own, r.foreign], [1, 36]);
  assert.equal(r.foreignSample.length, FOREIGN_SAMPLE_LIMIT);
});

// ── Граница «внутри дерева» ───────────────────────────────────────────────────────────────

test('граница по сегментам, не по подстроке: соседний корень с общим префиксом — чужой', () => {
  // C:\trees\mine-backup начинается с C:\trees\mine как ПОДСТРОКА, но деревом не является.
  const r = classifyResolution(ROOT, [{ name: 'x', realPath: 'C:\\trees\\mine-backup\\packages\\x' }]);
  assert.equal(r.state, RESOLUTION_STATES.FOREIGN);
});

test('пакет ровно в корне дерева — свой', () => {
  assert.equal(classifyResolution(ROOT, [{ name: 'x', realPath: ROOT }]).state, RESOLUTION_STATES.OWN);
});

// ── Отсутствие — своё слово ───────────────────────────────────────────────────────────────

test('пустой список пакетов → absent: «резолвить нечего» ≠ «всё чужое» и ≠ «всё своё»', () => {
  const r = classifyResolution(ROOT, []);
  assert.equal(r.state, RESOLUTION_STATES.ABSENT);
  assert.notEqual(r.state, RESOLUTION_STATES.OWN);
  const line = formatResolution(r);
  assert.ok(line.includes('замер не состоялся'));
  assert.ok(line.includes('не «всё своё»'), 'ловушка прочтения названа прямо');
});

test('битый симлинк — broken, а не чужой и не молча выброшен', () => {
  const r = classifyResolution(ROOT, [{ name: 'x', realPath: null }, own('a')]);
  assert.equal(r.broken, 1);
  assert.equal(r.state, RESOLUTION_STATES.OWN, 'битый не делает дерево «чужим» — он назван отдельно');
});

// ── Детерминизм образца ───────────────────────────────────────────────────────────────────

test('foreignSample детерминирован: порядок входа не меняет сводку', () => {
  const a = classifyResolution(ROOT, [alien('zeta'), alien('alpha'), alien('beta'), own('m')]);
  const b = classifyResolution(ROOT, [own('m'), alien('beta'), alien('zeta'), alien('alpha')]);
  assert.deepEqual(a.foreignSample, b.foreignSample);
  assert.deepEqual(a.foreignSample, ['alpha', 'beta', 'zeta']);
});

test('образец урезан лимитом, счётчик остаётся полным', () => {
  const r = classifyResolution(ROOT, Array.from({ length: 10 }, (_, i) => alien(`p${i}`)));
  assert.equal(r.foreignSample.length, FOREIGN_SAMPLE_LIMIT);
  assert.equal(r.foreign, 10);
});

// ── Слова ─────────────────────────────────────────────────────────────────────────────────

test('слова сужены до МЕЖПАКЕТНОГО: однопакетный прогон не оболган', () => {
  // Правка резчика: широкое «локальный typecheck недостоверен» — ложь о честных
  // однопакетных прогонах.
  const line = formatResolution(classifyResolution(ROOT, [alien('x')]));
  assert.ok(line.includes('МЕЖПАКЕТНЫЙ typecheck локально недостоверен'));
  assert.ok(line.includes('однопакетный честен'));
  assert.ok(line.includes('CI'));
});

test('строка печатается и на own — молчание на «всё своё» неотличимо от «не мерили»', () => {
  const line = formatResolution(classifyResolution(ROOT, [own('a')]));
  assert.ok(line.includes('все 1 внутрь дерева'));
  assert.ok(line.includes('достоверен'));
});

test('числа в строке — из замера: своих, чужих, из скольких', () => {
  const line = formatResolution(classifyResolution(ROOT, [own('a'), alien('b'), alien('c')]));
  assert.ok(line.includes('своих 1'));
  assert.ok(line.includes('чужих 2 из 3'));
});

test('битые симлинки названы в строке числом, когда они есть, и не названы, когда их нет', () => {
  const withBroken = formatResolution(classifyResolution(ROOT, [alien('b'), { name: 'x', realPath: null }]));
  const clean = formatResolution(classifyResolution(ROOT, [alien('b')]));
  assert.ok(withBroken.includes('битых симлинков 1'));
  assert.ok(!clean.includes('битых'));
});

// ── Правки разбора Дынина ─────────────────────────────────────────────────────────────────

test('смешанные стили путей не дают ложного foreign: нормализация в предикате', () => {
  // root от Windows-realpath, target в POSIX-виде — прежний выбор разделителя «по наличию
  // обратного слэша в root» уводил такой пакет в чужие ложно.
  const r = classifyResolution('C:\\trees\\mine', [{ name: 'x', realPath: 'C:/trees/mine/packages/x' }]);
  assert.equal(r.state, RESOLUTION_STATES.OWN);
  // Регистр буквы диска не делает своё чужим:
  const d = classifyResolution('c:\\trees\\mine', [{ name: 'x', realPath: 'C:\\trees\\mine\\packages\\x' }]);
  assert.equal(d.state, RESOLUTION_STATES.OWN);
});

test('foreign перекрывает broken: [чужой, битый] — состояние foreign, оба посчитаны', () => {
  const r = classifyResolution(ROOT, [alien('b'), { name: 'x', realPath: null }]);
  assert.equal(r.state, RESOLUTION_STATES.FOREIGN);
  assert.deepEqual([r.foreign, r.broken], [1, 1]);
});

test('свойство: own > 0 ∧ foreign > 0 ⇒ FOREIGN — один чужой отравляет достоверность', () => {
  const r = classifyResolution(ROOT, [own('a'), own('b'), alien('c')]);
  assert.equal(r.state, RESOLUTION_STATES.FOREIGN);
});

test('formatResolution чист: два вызова — одна строка', () => {
  const res = classifyResolution(ROOT, [own('a'), alien('b')]);
  assert.equal(formatResolution(res), formatResolution(res));
});
