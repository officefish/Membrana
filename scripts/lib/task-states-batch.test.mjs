/**
 * Зуб tw-state-batch-norm (#1322): батч вместо поштучного, honest unknown на сеть.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildStatesQuery,
  chunkNumbers,
  fetchStatesBatch,
  normalizeNumbers,
  parseStatesResponse,
} from './task-states-batch.mjs';

test('normalizeNumbers: строки, «#N», дубли и мусор приводятся к уникальным номерам', () => {
  assert.deepEqual(normalizeNumbers(['#1310', 1316, '1316', 'мусор', 0, -5]), [1310, 1316]);
});

test('вещдок 26.07: 13 номеров — ОДИН вызов (один чанк), не 13', () => {
  const numbers = Array.from({ length: 13 }, (_, i) => 1200 + i);
  assert.equal(chunkNumbers(numbers).length, 1);
});

test('buildStatesQuery: алиасы по номерам, issueOrPullRequest покрывает оба пространства', () => {
  const q = buildStatesQuery('officefish', 'Membrana', [1310, 1316]);
  assert.match(q, /n1310: issueOrPullRequest\(number: 1310\)/u);
  assert.match(q, /n1316:/u);
  assert.match(q, /on PullRequest/u);
});

test('parseStatesResponse: найденные → состояния, ненайденные → missing по имени', () => {
  const data = { repository: { n1310: { number: 1310, state: 'CLOSED' }, n9999: null } };
  const { states, missing } = parseStatesResponse(data, [1310, 9999]);
  assert.equal(states[1310], 'CLOSED');
  assert.deepEqual(missing, [9999]);
});

test('fetchStatesBatch: сеть умерла (пустой stdout) → honest unknown, НЕ пустой список состояний', () => {
  const run = () => {
    const e = new Error('spawnSync gh ETIMEDOUT');
    e.stdout = '';
    throw e;
  };
  const r = fetchStatesBatch([1310], { run, repoSlug: 'officefish/Membrana', timeoutMs: 5 });
  assert.equal(r.unknown, true);
  assert.match(r.reason, /НЕ известны/u);
});

test('fetchStatesBatch: частичный ответ с errors на stdout разбирается, а не считается сетью', () => {
  const body = JSON.stringify({ data: { repository: { n1310: { number: 1310, state: 'CLOSED' }, n9999: null } }, errors: [{ message: 'not found' }] });
  const run = (cmd, args) => {
    if (args[0] === 'api') {
      const e = new Error('gh: graphql error');
      e.stdout = body;
      throw e;
    }
    return JSON.stringify({ nameWithOwner: 'officefish/Membrana' });
  };
  const r = fetchStatesBatch([1310, 9999], { run });
  assert.equal(r.unknown, false);
  assert.equal(r.states[1310], 'CLOSED');
  assert.deepEqual(r.missing, [9999]);
});

test('fetchStatesBatch: пустой вход — пустой ответ без похода в сеть', () => {
  const run = () => {
    throw new Error('не должен вызываться');
  };
  const r = fetchStatesBatch([], { run });
  assert.deepEqual(r, { unknown: false, states: {}, missing: [] });
});
