/**
 * Тесты ВЁРСТКИ графа правды (`truth.mjs`), а не его ядра (`lib/truth-graph.mjs`).
 *
 * Почему отдельный файл. 17.07 `truth-graph.test.mjs` дал 46/46 зелёных, среди них
 * «evidenceKind: указатель / предикат / проба / ничего» — и при этом таблица `truth verify`
 * печатала «ТОЛЬКО ДАТА — доказательства нет» ВСЕМ 21 токенам с указателем. Ядро знало
 * правду, экран её не спрашивал: обвязка ПОВТОРИЛА классификацию у себя и не знала про
 * `utterance`. Тест стоял ровно там, где ошибки не было.
 *
 * Цена дефекта: единственный вид, который читает человек, ровнял кристалл с подлинником
 * волеизъявления и кристалл, держащийся на голой дате. Указательная дисциплина — весь
 * смысл графа — была невидима именно там, где на неё смотрят.
 *
 * Отсюда предмет этих тестов: НЕ «правильно ли классифицировано» (это ядро и его тесты),
 * а «то же ли говорит экран, что и ядро».
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGraph } from './lib/truth-graph.mjs';
import { report } from './truth.mjs';

const utterance = (kind = 'free-text') => ({
  sessionId: 'c4f02fcb-594a-4678-8a60-2c5df8e5bac5',
  uuid: '0945e15f-e5fa-4cd0-a59c-5432fbbbe7fd',
  timestamp: '2026-07-17T13:12:35.158Z',
  kind,
  quote: 'слово владельца',
  limit: 'что не сказано',
});

const owner = (id, u) => ({
  id,
  claim: `утверждение ${id}`,
  class: 'owner',
  parents: [],
  source: u ? { kind: 'owner', date: '2026-07-17', utterance: u } : { kind: 'owner', date: '2026-07-17' },
  revocation: { kind: 'owner', value: 'до слова владельца' },
  status: 'active',
  supersededBy: null,
});

const derived = (id, parents) => ({
  id,
  claim: `вывод ${id}`,
  class: 'derived',
  parents,
  source: { kind: 'deduction', date: '2026-07-17' },
  revocation: { kind: 'parent', value: 'умирает с любым родителем' },
  status: 'active',
  supersededBy: null,
});

const render = (tokens) => report(buildGraph({ tokens, predicates: {} }), null, [], []);
const rowOf = (out, id) => out.split('\n').find((l) => l.startsWith(id)) ?? '';

test('токен с указателем НЕ печатается как бездоказательный (дефект 17.07: 21 из 21)', () => {
  const out = render([owner('with-pointer', utterance())]);
  const row = rowOf(out, 'with-pointer');
  assert.doesNotMatch(row, /ТОЛЬКО ДАТА|доказательства нет/, 'указатель есть — клеветать нельзя');
  assert.match(row, /слово @2026-07-17/, 'дата указателя, а не дата справки');
});

test('токен БЕЗ указателя честно печатается как держащийся на дате', () => {
  const row = rowOf(render([owner('bare', null)]), 'bare');
  assert.match(row, /ТОЛЬКО ДАТА — доказательства нет/);
});

test('клик отделён от свободного текста и помечен слабее (пространство выбора агентское)', () => {
  const out = render([owner('by-click', utterance('click')), owner('by-word', utterance('free-text'))]);
  assert.match(rowOf(out, 'by-click'), /клик @2026-07-17 — слабее/);
  assert.doesNotMatch(rowOf(out, 'by-word'), /слабее/, 'свободный текст ослаблять нечем');
});

test('вывод наследует от родителей, а не «бездоказателен» рядом с колонкой родителей', () => {
  const out = render([owner('p1', utterance()), owner('p2', utterance()), derived('d', ['p1', 'p2'])]);
  const row = rowOf(out, 'd');
  assert.match(row, /наследует от родителей/);
  assert.doesNotMatch(row, /ТОЛЬКО ДАТА/, 'у вывода истина от родителей — доказывать его нечем и незачем');
});

test('экран и ядро не расходятся: «доказательства нет» ровно там, где evidenceKind === null', () => {
  // Суть дефекта в одной проверке: обвязка обязана СПРАШИВАТЬ ядро, а не считать сама.
  const tokens = [
    owner('a', utterance()),
    owner('b', utterance('click')),
    owner('c', null),
    derived('d', ['a', 'b']),
  ];
  const out = render(tokens);
  const slandered = tokens.filter((t) => /ТОЛЬКО ДАТА/.test(rowOf(out, t.id))).map((t) => t.id);
  assert.deepEqual(slandered, ['c'], 'бездоказателен ровно один — тот, у кого правда нет указателя');
});

test('подвал считает бездоказательных владельческих тем же счётом, что и таблица', () => {
  const out = render([owner('a', utterance()), owner('c1', null), owner('c2', null)]);
  assert.match(out, /владельческих без доказательства: 2\/3/);
});
