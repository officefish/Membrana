/**
 * Зубы моста «приговор → кладбище» (блок b2 спринта `angelina-hostess-impl`).
 *
 * Проекция подаётся значением — фикстурой, а не живым стором: зуб на живом сторе мерил бы
 * стор, а не правило, и на пустом дереве (сегодня стор не заведён) не проверял бы ничего.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isDead, isStale } from './lib/gc-void.mjs';
import {
  epitaphGaps,
  epitaphReady,
  parseEvidenceRef,
  sentencesFromProjection,
} from './lib/void-sentence.mjs';

const FULL = 'at=2026-08-23;by=owner;ref=docs/meeting/angelina-hostess/M5_VERDICT.md';

const some = (subject, value, evidenceRef) => ({
  [`D:${subject}`]: {
    kind: 'Some',
    assertion: { assertionId: `a-${subject}`, axis: 'D', subjectRef: subject, value, evidenceRef },
  },
});

// ── разбор вещдока ────────────────────────────────────────────────────────────

test('evidenceRef объявленной формы разбирается на дату, ответственного и ссылку', () => {
  assert.deepEqual(parseEvidenceRef(FULL), {
    at: '2026-08-23',
    by: 'owner',
    ref: 'docs/meeting/angelina-hostess/M5_VERDICT.md',
  });
});

test('evidenceRef чужой формы остаётся вещдоком целиком — но датой не притворяется', () => {
  const p = parseEvidenceRef('docs/meeting/x/VERDICT.md');
  assert.equal(p.ref, 'docs/meeting/x/VERDICT.md', 'ссылка не теряется');
  assert.equal(p.at, null, 'даты нет — и мост её не выдумывает');
  assert.equal(p.by, null);
});

test('кривая дата в evidenceRef датой не считается', () => {
  // «вчера» и «23.08.26» — не дата: разобрать нельзя, значит её нет.
  assert.equal(parseEvidenceRef('at=вчера;by=owner').at, null);
  assert.equal(parseEvidenceRef('at=23.08.26').at, null);
  assert.equal(parseEvidenceRef('at=2026-08-23').at, '2026-08-23');
});

test('пустой evidenceRef не даёт ничего и не падает', () => {
  for (const bad of [null, undefined, '', '   ', 42, {}]) {
    assert.deepEqual(parseEvidenceRef(bad), { at: null, by: null, ref: null });
  }
});

// ── сбор приговоров ───────────────────────────────────────────────────────────

test('приговор из проекции доходит до ядра кладбища — isDead становится истинным', () => {
  // Ради этого блок и существует: до моста ни один след не мог стать приговорённым.
  const [s] = sentencesFromProjection({ currentAssessments: some('insight-x', 'rejected', FULL) });
  assert.equal(s.status, 'rejected');
  assert.equal(s.verdictClosed, true);
  assert.equal(isDead(s), true, 'ядро кладбища признаёт след мёртвым');
  assert.equal(s.rejectedAt, '2026-08-23');
  assert.equal(s.rejectedBy, 'owner');
});

test('принятое и отложенное на кладбище не идут', () => {
  const p = {
    currentAssessments: {
      ...some('a', 'accepted', FULL),
      ...some('b', 'deferred', FULL),
      ...some('c', 'proposed', FULL),
    },
  };
  assert.deepEqual(sentencesFromProjection(p), [], 'приговор — только rejected');
});

test('оси кроме решения мост не касается', () => {
  const p = { currentAssessments: { 'V:x': { kind: 'Some', assertion: { value: 'archived' } } } };
  assert.deepEqual(sentencesFromProjection(p), [], 'архив по оси видимости приговором не является');
});

test('СПОР не приговор: конфликт закрывает isDead и называется словом', () => {
  const [s] = sentencesFromProjection({
    currentAssessments: { 'D:insight-y': { kind: 'Conflict', assertionIds: ['a1', 'a2'] } },
  });
  assert.equal(s.disputed, true);
  assert.equal(s.verdictClosed, false);
  assert.equal(isDead(s), false, 'пока живы два утверждения, вердикта нет');
  assert.match(epitaphGaps(s).join(' '), /спор/u, 'порт обязан сказать об этом, а не промолчать');
});

test('приговорённые отдаются в устойчивом порядке — вещдок не пляшет между прогонами', () => {
  const p = {
    currentAssessments: {
      ...some('zeta', 'rejected', FULL),
      ...some('alpha', 'rejected', FULL),
    },
  };
  assert.deepEqual(sentencesFromProjection(p).map((s) => s.subjectRef), ['alpha', 'zeta']);
});

test('пустая и битая проекция дают пусто, а не падение', () => {
  assert.deepEqual(sentencesFromProjection({}), []);
  assert.deepEqual(sentencesFromProjection(null), []);
  assert.deepEqual(sentencesFromProjection({ currentAssessments: null }), []);
});

// ── честность эпитафии ────────────────────────────────────────────────────────

test('эпитафия без даты объявляется НЕПОЛНОЙ поимённо, а не собирается на Date.now', () => {
  // DoD вердикта M5 запрещает Date.now прямо: «дата из вердикта». Мост дату не подставляет.
  const [s] = sentencesFromProjection({
    currentAssessments: some('insight-z', 'rejected', 'docs/meeting/x/VERDICT.md'),
  });
  assert.equal(isDead(s), true, 'приговор состоялся — след мёртв');
  assert.equal(epitaphReady(s), false, 'но эпитафия неполна');
  const gaps = epitaphGaps(s);
  assert.match(gaps.join(' '), /дата приговора/u);
  assert.match(gaps.join(' '), /ответственный/u);
  assert.equal(s.rejectedAt, null, 'пустое поле честнее выдуманного');
});

test('полный вещдок даёт полную эпитафию', () => {
  const [s] = sentencesFromProjection({ currentAssessments: some('insight-x', 'rejected', FULL) });
  assert.deepEqual(epitaphGaps(s), []);
  assert.equal(epitaphReady(s), true);
});

test('штраф свежести считается по дате приговора, а без даты молчит', () => {
  const [dated] = sentencesFromProjection({ currentAssessments: some('x', 'rejected', FULL) });
  assert.equal(isStale(dated, '2026-08-24'), false, 'свежий приговор штраф не отпустил');
  assert.equal(isStale(dated, '2027-01-01'), true, 'через 90 дней отпустил');

  const [undated] = sentencesFromProjection({ currentAssessments: some('y', 'rejected', 'ref') });
  assert.equal(isStale(undated, '2027-01-01'), false, 'без даты штраф не судит — и не притворяется');
});
