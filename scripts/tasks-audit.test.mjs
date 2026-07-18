import assert from 'node:assert/strict';
import test from 'node:test';

import { auditRegistry, registryDefects } from './lib/tasks-audit.mjs';

const card = (id, issue, over = {}) => ({
  id,
  status: 'active',
  githubIssue: issue,
  githubIssueClosedAt: null,
  ...over,
});
const closed = (reason = 'COMPLETED') => ({ state: 'CLOSED', stateReason: reason });

test('одиночная закрытая иссью → корзина АРХИВИРОВАТЬ', () => {
  const r = auditRegistry([card('a', 10)], new Map([[10, closed()]]));
  assert.equal(r.archive.length, 1);
  assert.equal(r.archive[0].id, 'a');
  assert.equal(r.manual.length, 0);
});

test('NOT_PLANNED → корзина ОТМЕНЕНО, а не АРХИВИРОВАТЬ', () => {
  const r = auditRegistry([card('a', 10)], new Map([[10, closed('NOT_PLANNED')]]));
  assert.equal(r.archive.length, 0);
  assert.equal(r.cancelled.length, 1);
  assert.match(r.cancelled[0].reason, /отменено, не сделано/u);
});

test('ЗОНТИК: одна иссью на пять карточек → все в РАЗОБРАТЬ РУКАМИ (живой случай #47)', () => {
  const cards = ['single-node', 'real-dataset', 'sample-library', 'neural-tier', 'vdr-hard-gate'].map((id) =>
    card(id, 47),
  );
  const r = auditRegistry(cards, new Map([[47, closed()]]));
  assert.equal(r.archive.length, 0, 'зонтик НЕ архивируется пакетом');
  assert.equal(r.manual.length, 5);
  assert.match(r.manual[0].reason, /зонтичная иссью #47 накрывает 5/u);
  assert.equal(r.umbrellas.get(47).length, 5);
});

test('открытая иссью кандидатом не становится', () => {
  const r = auditRegistry([card('a', 10)], new Map([[10, { state: 'OPEN' }]]));
  assert.equal(r.archive.length + r.cancelled.length + r.manual.length, 0);
});

test('неизвестная иссью не трогается (нет данных ≠ закрыта)', () => {
  const r = auditRegistry([card('a', 999)], new Map());
  assert.equal(r.archive.length + r.cancelled.length + r.manual.length, 0);
});

test('archived-карточки в аудит не попадают', () => {
  const r = auditRegistry([card('a', 10, { status: 'archived' })], new Map([[10, closed()]]));
  assert.equal(r.archive.length, 0);
});

test('дефект: githubIssueClosedAt не заполнен ни у кого', () => {
  const d = registryDefects([card('a', 10), card('b', 11)]);
  assert.match(d.join(' '), /githubIssueClosedAt не заполнено/u);
});

test('дефект: зонтичные иссью помечаются даже при открытой иссью', () => {
  const d = registryDefects([card('a', 47), card('b', 47)]);
  assert.match(d.join(' '), /зонтичных иссью: 1 \(#47→2\)/u);
});

test('фантомный зонтик: githubIssue 0 не считается иссью (живой дефект 18.07)', () => {
  const d = registryDefects([card('a', 0), card('b', 0), card('c', 47), card('d', 47)]);
  assert.doesNotMatch(d.join(' '), /#0/u, 'заглушка 0 не должна давать зонтик');
  assert.match(d.join(' '), /#47→2/u);
});
