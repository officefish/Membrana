/**
 * Тесты ночного ресёрч-контура (#592, S6). Офлайн: реестр — фикстура, время — параметр.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  enumeratePairs,
  pickTopic,
  buildDreamQuery,
  renderNightArtifact,
  nightYield,
  classifyDreamAnswer,
} from './lib/night-research.mjs';

const REGISTRY = {
  tokens: [
    { id: 'c1', class: 'derived', status: 'active', parents: ['root-a', 'root-b'], claim: 'Вывод один про горизонт' },
    { id: 'c2', class: 'derived', status: 'active', parents: ['root-a'], claim: 'Вывод два про рутину' },
    { id: 'c3', class: 'derived', status: 'active', parents: ['root-z'], claim: 'Вывод три без общего корня' },
    { id: 'c4', class: 'derived', status: 'revoked', parents: ['root-a'], claim: 'Отозванный' },
    { id: 'o1', class: 'owner', status: 'active', parents: [], claim: 'Владельческий' },
  ],
};

test('enumeratePairs: только derived-сиблинги (общий родитель), revoked исключён', () => {
  const pairs = enumeratePairs(REGISTRY);
  // c1↔c2 делят root-a; c3 сирота; c4 revoked; o1 owner без родителей.
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].key, 'c1__c2');
  assert.deepEqual(pairs[0].sharedParents, ['root-a']);
});

test('enumeratePairs: детерминизм — порядок не зависит от порядка в реестре', () => {
  const shuffled = { tokens: [...REGISTRY.tokens].reverse() };
  assert.deepEqual(enumeratePairs(shuffled), enumeratePairs(REGISTRY));
});

test('pickTopic: детерминирован по seed', () => {
  const a = pickTopic(REGISTRY, { seed: '2026-07-18' });
  const b = pickTopic(REGISTRY, { seed: '2026-07-18' });
  assert.deepEqual(a, b);
  assert.equal(a.mode, 'derived'); // 100% derived (решение владельца #2)
  assert.match(a.origin, /^pair:c1\+c2$/u);
});

test('pickTopic: нет пар → null (сну не из чего родиться)', () => {
  assert.equal(pickTopic({ tokens: [{ id: 'x', class: 'derived', status: 'active', parents: ['solo'] }] }, { seed: 's' }), null);
});

test('buildDreamQuery: жаргон в claim заглушается, вопрос проходит externalize', () => {
  const pair = {
    a: { id: 'j1', claim: 'ADR-0012 задаёт границу @membrana/core для #557' },
    b: { id: 'j2', claim: 'Обычный вывод без жаргона про спектр дрона' },
  };
  const { external } = buildDreamQuery(pair);
  // neutralizeJargon срезал ADR/пакет/#issue → гвард пропустил.
  assert.equal(external.ok, true, 'после заглушки жаргона вопрос внешне валиден');
});

test('renderNightArtifact: фронтматтер {topic, mode, origin, status, ttl}', () => {
  const topic = pickTopic(REGISTRY, { seed: '2026-07-18' });
  const md = renderNightArtifact(topic, { date: '2026-07-18', ttlDays: 14 });
  assert.match(md, /^---\n/u);
  assert.match(md, /mode: derived/u);
  assert.match(md, /origin: pair:c1\+c2/u);
  assert.match(md, /status: pending/u);
  assert.match(md, /ttl: 14/u);
  assert.match(md, /adopted.*обратной ссылкой/u); // владельческий гейт напечатан
});

test('renderNightArtifact: отклонённый вопрос → status: rejected, видимо', () => {
  const topic = { topic: 't', mode: 'derived', origin: 'pair:x+y', query: 'q', rejected: true, rejectReason: 'жаргон X', pairKey: 'x__y', sharedParents: ['r'] };
  const md = renderNightArtifact(topic, { date: '2026-07-18' });
  assert.match(md, /status: rejected/u);
  assert.match(md, /ОТКЛОНЁН externalizeQuery: жаргон X/u);
});

test('classifyDreamAnswer: пустой / unanswered → void, содержательный → checked', () => {
  assert.equal(classifyDreamAnswer('').status, 'void');
  assert.equal(classifyDreamAnswer('No relevant sources found for this query.').status, 'void');
  assert.equal(
    classifyDreamAnswer('Goal Displacement и закон Гудхарта описывают вытеснение цели инструментом.').status,
    'checked',
  );
});

test('renderNightArtifact: check.checked заполняет раздел и status', () => {
  const topic = pickTopic(REGISTRY, { seed: '2026-07-18' });
  const md = renderNightArtifact(
    topic,
    { date: '2026-07-18', ttlDays: 14 },
    { status: 'checked', body: '**Вердикт: находка.**\n\nGoodhart applies.' },
  );
  assert.match(md, /status: checked/u);
  assert.match(md, /Goodhart applies/u);
  assert.match(md, /ждёт владельческого решения/u);
});

test('renderNightArtifact: check.void — честное пусто снаружи', () => {
  const topic = pickTopic(REGISTRY, { seed: '2026-07-18' });
  const md = renderNightArtifact(
    topic,
    { date: '2026-07-18' },
    { status: 'void', body: '**Вердикт: честное «снаружи пусто».**' },
  );
  assert.match(md, /status: void/u);
  assert.match(md, /снаружи пусто/u);
});

test('nightYield: adopted/(adopted+void) за окно; pending не в знаменателе', () => {
  const now = '2026-07-17T12:00:00Z';
  const arts = [
    { status: 'adopted', date: '2026-07-16' },
    { status: 'void', date: '2026-07-15', ttl: 14 },
    { status: 'void', date: '2026-07-14' },
    { status: 'pending', date: '2026-07-16' }, // не считается
    { status: 'adopted', date: '2026-06-01' }, // вне окна 14д
  ];
  const y = nightYield(arts, { now, windowDays: 14 });
  assert.equal(y.adopted, 1);
  assert.equal(y.void, 2);
  assert.equal(y.yield, 1 / 3);
});

test('nightYield: пустой знаменатель → null (не 0/0)', () => {
  const y = nightYield([{ status: 'pending', date: '2026-07-17' }], { now: '2026-07-17T12:00:00Z' });
  assert.equal(y.yield, null);
});

// ─── effectiveStatus: честный срок вместо вечного pending (#598) ────────────────

test('effectiveStatus: pending переживший TTL → void, свежий остаётся pending', async () => {
  const { effectiveStatus } = await import('./lib/night-research.mjs');
  const now = Date.parse('2026-07-18');
  assert.equal(effectiveStatus({ status: 'pending', date: '2026-06-01', ttl: 14 }, now), 'void');
  assert.equal(effectiveStatus({ status: 'pending', date: '2026-07-17', ttl: 14 }, now), 'pending');
});

test('effectiveStatus: окончательные статусы не переписываются сроком', async () => {
  const { effectiveStatus } = await import('./lib/night-research.mjs');
  const now = Date.parse('2026-07-18');
  for (const s of ['adopted', 'rejected', 'void', 'checked']) {
    assert.equal(effectiveStatus({ status: s, date: '2026-01-01', ttl: 14 }, now), s);
  }
});

test('effectiveStatus: без даты/с битым ttl срок не выдумывается', async () => {
  const { effectiveStatus } = await import('./lib/night-research.mjs');
  const now = Date.parse('2026-07-18');
  assert.equal(effectiveStatus({ status: 'pending', date: null, ttl: 14 }, now), 'pending');
  assert.equal(effectiveStatus({ status: 'pending', date: '2026-01-01', ttl: 0 }, now), 'pending');
});

test('#598: метрика способна показать провал — знаменатель больше не равен adopted', async () => {
  const { nightYield } = await import('./lib/night-research.mjs');
  // Три просроченных pending и один adopted. До фикса void=0 → yield=100%: метрика
  // структурно не умела сообщить о плохой ночи.
  const artifacts = [
    { status: 'adopted', date: '2026-07-16', ttl: 14 },
    { status: 'pending', date: '2026-07-10', ttl: 3 },
    { status: 'pending', date: '2026-07-10', ttl: 3 },
    { status: 'pending', date: '2026-07-10', ttl: 3 },
  ];
  const y = nightYield(artifacts, { now: '2026-07-18', windowDays: 30 });
  assert.equal(y.void, 3, 'просроченные считаются void');
  assert.equal(y.adopted, 1);
  assert.equal(y.yield, 0.25, 'выхлоп 25%, а не ложные 100%');
});
