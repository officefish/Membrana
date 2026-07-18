import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ISSUE_STATE_REASONS,
  auditRegistry,
  issuesFromRegistry,
  planIssueStateSync,
  registryDefects,
} from './lib/tasks-audit.mjs';

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

// ── issuesFromRegistry: офлайн-вход, воспроизводимость по коммиту (#620, DA1) ────

test('#620: аудит офлайн даёт ТОТ ЖЕ результат, что и по сети', () => {
  const cards = [
    card('a', 10, { githubIssueClosedAt: '2026-06-11', githubIssueStateReason: 'COMPLETED' }),
    card('b', 11, { githubIssueClosedAt: '2026-06-12', githubIssueStateReason: 'NOT_PLANNED' }),
  ];
  const net = auditRegistry(cards, new Map([[10, closed()], [11, closed('NOT_PLANNED')]]));
  const off = auditRegistry(cards, issuesFromRegistry(cards));
  assert.deepEqual(
    { a: off.archive.map((t) => t.id), c: off.cancelled.map((t) => t.id) },
    { a: net.archive.map((t) => t.id), c: net.cancelled.map((t) => t.id) },
    'офлайн и сеть должны сходиться — иначе DA1 не выполнен',
  );
  assert.equal(off.archive[0].id, 'a');
  assert.equal(off.cancelled[0].id, 'b');
});

test('#620: пустое поле = «не знаю», а не «открыта» — карточка не трогается', () => {
  const cards = [card('a', 10)]; // githubIssueClosedAt: null
  const issues = issuesFromRegistry(cards);
  assert.equal(issues.size, 0, 'карточка без даты в карту не попадает');
  const r = auditRegistry(cards, issues);
  assert.equal(r.archive.length + r.cancelled.length + r.manual.length, 0);
});

test('#620: stateReason по умолчанию COMPLETED — молчание не означает «отменено»', () => {
  const cards = [card('a', 10, { githubIssueClosedAt: '2026-06-11' })];
  const r = auditRegistry(cards, issuesFromRegistry(cards));
  assert.equal(r.archive.length, 1, 'без stateReason → сделано, не отменено');
  assert.equal(r.cancelled.length, 0);
});

test('#620: зонтик остаётся зонтиком и офлайн (регресс #47 — H1)', () => {
  const cards = ['single-node', 'real-dataset', 'sample-library', 'neural-tier', 'vdr-hard-gate'].map((id) =>
    card(id, 47, { githubIssueClosedAt: '2026-06-11' }),
  );
  const r = auditRegistry(cards, issuesFromRegistry(cards));
  assert.equal(r.archive.length, 0, 'офлайн-путь не смеет обойти запрет пакетной архивации');
  assert.equal(r.manual.length, 5);
});

// ── planIssueStateSync: контракт писателя (замечания ревью 18.07) ────────────────

test('#620 enum: оба состояния GitHub различаются — NOT_PLANNED не сливается с COMPLETED', () => {
  assert.deepEqual(ISSUE_STATE_REASONS, ['COMPLETED', 'NOT_PLANNED'], 'полнота enum');
  const cards = [card('a', 10), card('b', 11)];
  const { updates } = planIssueStateSync(
    cards,
    new Map([
      [10, { state: 'CLOSED', stateReason: 'COMPLETED', closedAt: '2026-06-11T10:00:00Z' }],
      [11, { state: 'CLOSED', stateReason: 'NOT_PLANNED', closedAt: '2026-06-12T10:00:00Z' }],
    ]),
  );
  assert.deepEqual(updates.map((u) => u.stateReason), ['COMPLETED', 'NOT_PLANNED']);
});

test('#620 enum: неизвестный reason → COMPLETED, молчание не означает «отменено»', () => {
  const { updates } = planIssueStateSync(
    [card('a', 10)],
    new Map([[10, { state: 'CLOSED', stateReason: 'DUPLICATE_XYZ', closedAt: '2026-06-11T10:00:00Z' }]]),
  );
  assert.equal(updates[0].stateReason, 'COMPLETED', 'чужое значение не протекает в реестр');
});

test('#620 downgrade даты РАЗРЕШЁН сознательно: gh — единственный источник истины', () => {
  // Живой случай 18.07: 121 карточка несла дату прогона task:close-github, а не реальную.
  const cards = [card('a', 10, { githubIssueClosedAt: '2026-07-17', githubIssueStateReason: 'COMPLETED' })];
  const { updates } = planIssueStateSync(
    cards,
    new Map([[10, { state: 'CLOSED', stateReason: 'COMPLETED', closedAt: '2026-07-15T09:00:00Z' }]]),
  );
  assert.equal(updates.length, 1, 'более ранняя дата от gh — это исправление, не потеря факта');
  assert.equal(updates[0].closedAt, '2026-07-15');
});

test('#620 идемпотентность: второй прогон по тем же данным не даёт изменений', () => {
  const cards = [card('a', 10, { githubIssueClosedAt: '2026-06-11', githubIssueStateReason: 'COMPLETED' })];
  const issues = new Map([[10, { state: 'CLOSED', stateReason: 'COMPLETED', closedAt: '2026-06-11T10:00:00Z' }]]);
  assert.equal(planIssueStateSync(cards, issues).updates.length, 0);
});

test('#620 переоткрытие: иссью снова OPEN → дата снимается (реестр не врёт «закрыто»)', () => {
  const cards = [card('a', 10, { githubIssueClosedAt: '2026-06-11', githubIssueStateReason: 'COMPLETED' })];
  const { updates } = planIssueStateSync(cards, new Map([[10, { state: 'OPEN' }]]));
  assert.equal(updates[0].kind, 'reopened');
  assert.equal(updates[0].closedAt, null);
});

test('#620 инвариант: пишем ровно gh closedAt, не createdAt/updatedAt (гард Математика)', () => {
  // Живой замер 18.07: с createdAt совпало бы 209 дат, с updatedAt — 175. Совпадение
  // части значений не доказывает источник, поэтому фиксируем выбор поля тестом.
  const { updates } = planIssueStateSync(
    [card('a', 10)],
    new Map([[10, {
      state: 'CLOSED',
      stateReason: 'COMPLETED',
      createdAt: '2026-05-16T10:00:00Z',
      closedAt: '2026-06-11T10:00:00Z',
      updatedAt: '2026-07-01T10:00:00Z',
    }]]),
  );
  assert.equal(updates[0].closedAt, '2026-06-11', 'именно closedAt');
  assert.ok(updates[0].closedAt >= '2026-05-16', 'closedAt >= createdAt');
});

test('#620 error path: OPEN без даты и отсутствие данных — поле не пишется вовсе', () => {
  // C6: «нет данных» не должно превращаться ни в null-запись, ни в сегодняшнюю дату.
  const cards = [card('a', 10), card('b', 11)];
  const { updates } = planIssueStateSync(cards, new Map([[10, { state: 'OPEN' }]]));
  assert.equal(updates.length, 0, 'OPEN без прежней даты и неизвестная иссью — обе не трогаются');
});

test('#620 без иссью дата не выдумывается (обвинение ревью в фабрикации)', () => {
  const cards = [card('a', 0), card('b', null)];
  const { updates } = planIssueStateSync(cards, new Map([[0, { state: 'CLOSED', closedAt: '2026-06-11T10:00:00Z' }]]));
  assert.equal(updates.length, 0, 'карточке без иссью дате взяться неоткуда');
});

test('githubIssue 0 / нечисловое не попадает в NaN-корзину (замечание ревью 18.07)', () => {
  const r = auditRegistry(
    [card('zero', 0), card('bad', 'n/a'), card('ok', 47)],
    new Map([[47, closed()]]),
  );
  assert.equal(r.archive.length, 1);
  assert.equal(r.archive[0].id, 'ok');
  assert.equal(r.manual.length, 0);
});
