/**
 * Юнит-тесты снов v2 (D, вердикт M5). Чистые функции — без сети/моков.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { heatOf, providerChain, rollProvider, select, digest, DREAM_PROVIDERS, HEATS } from './lib/dreams-select.mjs';

const dream = (hour, score, status = 'synthesized', id = `d${hour}`) => ({ id, hour, score, status });
const full24 = () => Array.from({ length: 24 }, (_, h) => dream(h, h)); // score растёт с часом

test('heatOf: соседние четвёрки 0-3→0 … 20-23→5', () => {
  assert.deepEqual([0, 3, 4, 7, 20, 23].map(heatOf), [0, 0, 1, 1, 5, 5]);
});

test('providerChain: воспроизводима и биективна (все 4 ровно раз)', () => {
  const a = providerChain(42);
  assert.deepEqual(a, providerChain(42), 'один seed → одна цепочка');
  assert.deepEqual([...a].sort(), [...DREAM_PROVIDERS].sort(), 'все провайдеры ровно раз');
});

test('providerChain: разные seed → (обычно) разный порядок', () => {
  // не гарантия неравенства, но проверяем что seed влияет хотя бы на одном примере
  const seeds = [1, 2, 3, 4, 5].map((s) => providerChain(s).join(','));
  assert.ok(new Set(seeds).size > 1, 'seed меняет порядок');
});

test('rollProvider: цепочка исчерпывается на 4-й попытке → null (терминал)', () => {
  assert.equal(typeof rollProvider(7, 0), 'string');
  assert.equal(rollProvider(7, 3) !== null, true);
  assert.equal(rollProvider(7, 4), null, 'исчерпана → synthesisFailed');
  assert.equal(rollProvider(7, -1), null);
});

test('select: ровно 6 заездов, победитель по score', () => {
  const s = select(full24());
  assert.equal(s.length, HEATS);
  // заезд 0 = часы 0-3, максимум score у часа 3
  assert.equal(s[0].winner.hour, 3);
  assert.equal(s[5].winner.hour, 23);
});

test('select: пустой заезд (все failed) → no-winner явно', () => {
  const dreams = [dream(0, 5, 'failed'), dream(1, 3, 'failed'), dream(4, 9)];
  const s = select(dreams);
  assert.equal(s[0].winner, null, 'заезд 0 пуст → no-winner');
  assert.equal(s[1].winner.hour, 4, 'заезд 1 — победитель');
});

test('select: детерминизм на фиксированном входе', () => {
  const d = full24();
  assert.deepEqual(select(d).map((w) => w.winner?.hour), select(d).map((w) => w.winner?.hour));
});

test('digest: 6 победителей на полных сутках', () => {
  assert.equal(digest(full24()).length, 6);
});

test('digest: <6 честно, без добивки при пустых заездах', () => {
  const dreams = [dream(0, 5), dream(4, 9)]; // только заезды 0 и 1
  assert.equal(digest(dreams).length, 2, 'меньше 6, не добиваем');
});

test('digest: проигравшие в заезде НЕ в дайджесте (только победитель с заезда)', () => {
  const dreams = [dream(0, 5, 'synthesized', 'lo'), dream(1, 9, 'synthesized', 'hi'), dream(2, 3, 'synthesized', 'mid')];
  const d = digest(dreams); // все в заезде 0
  assert.equal(d.length, 1);
  assert.equal(d[0].id, 'hi', 'только сильнейший заезда');
});
