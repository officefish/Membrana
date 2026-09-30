/**
 * Зубы ведомости решённого (b1 `ritual-reads-decisions`). Чистое ядро — фикстуры значениями,
 * каждый зуб с порчей: без порчи он не зуб.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CARD_STATE,
  DECISION_KEY,
  closedSprintRunsOf,
  clipDecision,
  dayOf,
  formatDecisionsBlock,
  joinClosedSprintsWithCards,
  ratifiedDecisionsOf,
  staleCandidates,
} from './decisions-ledger.mjs';

const OWNER = { by: 'owner', at: '2026-09-29T15:13:04+03:00', digest: 'x' };

const a11yPlan = {
  path: 'docs/sprint/cut/sample-library-paging-a11y.json',
  plan: {
    schema: 'sprint-cut/1',
    sprintId: 'sample-library-paging-a11y',
    '//why': 'заметка резчика — не решение',
    '//decisions': '(1) aria-current с индикатора СНЯТЬ, индикатор становится role=status; (2) правило фокуса; (3) стрелок не заводить',
    ratification: OWNER,
  },
};

const batchPlan = {
  path: 'docs/sprint/cut/batch-collection-run-contour.json',
  plan: {
    sprintId: 'batch-collection-run-contour',
    '//recut-29-09-retro': 'Перерезка в работе по слову владельца 29.09: девять файлов вне зон добавлены в зоны блоков-владельцев.',
    ratification: { by: 'owner', at: '2026-09-29T19:46:07+03:00', digest: 'y' },
  },
};

const closeRecord = (runId, status, at) => ({
  schema: 'procedure-run-journal@1',
  runId,
  procedureId: 'membrana-local-sprint',
  status,
  at,
  runPhase: 'close',
  subject: `спринт ${runId}: гейт`,
});

test('b1 dayOf: день из ISO с любым смещением; мусор — null', () => {
  assert.equal(dayOf('2026-09-29T15:13:04+03:00'), '2026-09-29');
  assert.equal(dayOf('2026-09-29T13:07:22.415Z'), '2026-09-29');
  assert.equal(dayOf('вчера'), null);
  assert.equal(dayOf(undefined), null);
});

test('b1 решение: //decisions и //recut-* при ratification.by=owner — решения; остальные ключи — нет', () => {
  const out = ratifiedDecisionsOf([a11yPlan, batchPlan]);
  assert.deepEqual(out.map((d) => [d.sprintId, d.key]), [
    ['batch-collection-run-contour', '//recut-29-09-retro'],
    ['sample-library-paging-a11y', '//decisions'],
  ], 'свежее выше; //why не решение');
  assert.equal(out[1].ratifiedAt, '2026-09-29T15:13:04+03:00');
  assert.equal(out[1].path, 'docs/sprint/cut/sample-library-paging-a11y.json');
  assert.match(out[1].text, /aria-current с индикатора СНЯТЬ/u);
});

test('b1 ПОРЧА: план без ratification, с чужим by или без момента — не решение', () => {
  const noNode = { plan: { ...a11yPlan.plan, ratification: undefined } };
  const lead = { plan: { ...a11yPlan.plan, ratification: { ...OWNER, by: 'angelina' } } };
  const noAt = { plan: { ...a11yPlan.plan, ratification: { by: 'owner', at: 'скоро' } } };
  assert.equal(ratifiedDecisionsOf([noNode]).length, 0, 'без узла');
  assert.equal(ratifiedDecisionsOf([lead]).length, 0, 'ратифицировать вправе только владелец');
  assert.equal(ratifiedDecisionsOf([noAt]).length, 0, 'без момента');
  assert.equal(ratifiedDecisionsOf([a11yPlan]).length, 1, 'а с узлом владельца — решение');
});

test('b1 окно: ратификация раньше sinceDay — вне ведомости, в день начала — внутри', () => {
  assert.equal(ratifiedDecisionsOf([a11yPlan], { sinceDay: '2026-09-30' }).length, 0);
  assert.equal(ratifiedDecisionsOf([a11yPlan], { sinceDay: '2026-09-29' }).length, 1);
  assert.equal(ratifiedDecisionsOf([a11yPlan], { sinceDay: '2026-09-22' }).length, 1);
});

test('b1 DECISION_KEY закрыт: //decisions, //decision, //recut, //recut-29-09-retro; НЕ //why, //cutter, //recut_x', () => {
  for (const k of ['//decisions', '//decision', '//recut', '//recut-29-09-retro', '//recut-v2']) assert.ok(DECISION_KEY.test(k), k);
  for (const k of ['//why', '//cutter', '//recut_x', 'decisions', '//decisions-note']) assert.ok(!DECISION_KEY.test(k), k);
});

test('b1 закрытые прогоны: только membrana-local-sprint с runPhase=close; статус сохраняется', () => {
  const records = [
    { runId: 'ritual-day-2026-09-29', procedureId: 'ritual-day', status: 'pass', at: '2026-09-29T11:26:16Z', runPhase: 'close' },
    { runId: 'batch-collection-run-contour', procedureId: 'membrana-local-sprint', status: 'started', at: '2026-09-29T10:00:00Z', runPhase: 'open' },
    closeRecord('batch-collection-run-contour', 'pass', '2026-09-29T16:22:00+03:00'),
    closeRecord('trace-freeze-dual-candidate-sprint', 'fail', '2026-09-29T15:46:30+03:00'),
  ];
  const out = closedSprintRunsOf(records);
  assert.deepEqual(out.map((c) => [c.sprintId, c.status, c.closedDay]), [
    ['batch-collection-run-contour', 'pass', '2026-09-29'],
    ['trace-freeze-dual-candidate-sprint', 'fail', '2026-09-29'],
  ]);
});

test('b1 ПОРЧА: open-запись спринта или закрытие чужой процедуры закрытым спринтом не считаются', () => {
  const onlyOpen = [{ runId: 'x', procedureId: 'membrana-local-sprint', status: 'started', at: '2026-09-29T10:00:00Z', runPhase: 'open' }];
  assert.equal(closedSprintRunsOf(onlyOpen).length, 0);
  const other = [{ runId: 'x', procedureId: 'one-shot', status: 'pass', at: '2026-09-29T10:00:00Z', runPhase: 'close' }];
  assert.equal(closedSprintRunsOf(other).length, 0);
  const noPhase = [{ runId: 'x', procedureId: 'membrana-local-sprint', status: 'pass', at: '2026-09-29T10:00:00Z' }];
  assert.equal(closedSprintRunsOf(noPhase).length, 0, 'без runPhase закрытие не доказано');
});

test('b1 повторное закрытие одного прогона — берётся последнее; окно по дню закрытия', () => {
  const records = [
    closeRecord('s', 'fail', '2026-09-27T10:00:00Z'),
    closeRecord('s', 'pass', '2026-09-29T10:00:00Z'),
  ];
  const out = closedSprintRunsOf(records);
  assert.equal(out.length, 1);
  assert.equal(out[0].status, 'pass');
  assert.equal(closedSprintRunsOf(records, { sinceDay: '2026-09-30' }).length, 0);
});

test('b1 сверка с реестром: карточка active → stale; archived без живых фаз → не stale; фаза active при архивном эпике → stale по фазе; нет карточки → absent', () => {
  const tasks = [
    { id: 'batch-collection-run-contour', status: 'active' },
    { id: 'batch-collection-run-contour-a1', status: 'active', parentEpic: 'batch-collection-run-contour' },
    { id: 'a11y', status: 'archived' },
    { id: 'rrdw', status: 'archived' },
    { id: 'rrdw-b1', status: 'active', parentEpic: 'rrdw' },
    { id: 'rrdw-b2', status: 'archived', parentEpic: 'rrdw' },
  ];
  const closed = [
    closeRecord('batch-collection-run-contour', 'pass', '2026-09-29T16:22:00+03:00'),
    closeRecord('a11y', 'pass', '2026-09-29T15:46:53+03:00'),
    closeRecord('rrdw', 'pass', '2026-09-29T13:07:22Z'),
    closeRecord('ghost', 'pass', '2026-09-29T13:07:22Z'),
  ];
  const out = joinClosedSprintsWithCards(closedSprintRunsOf(closed), tasks);
  const by = Object.fromEntries(out.map((c) => [c.sprintId, c]));
  assert.equal(by['batch-collection-run-contour'].card, CARD_STATE.ACTIVE);
  assert.equal(by['batch-collection-run-contour'].stale, true);
  assert.equal(by['batch-collection-run-contour'].phasesActive, 1);
  assert.equal(by.a11y.card, CARD_STATE.ARCHIVED);
  assert.equal(by.a11y.stale, false, 'архивная карточка без фаз — не долг');
  assert.equal(by.rrdw.card, CARD_STATE.ARCHIVED);
  assert.equal(by.rrdw.stale, true, 'живая фаза при архивном эпике — долг по фазе');
  assert.deepEqual([by.rrdw.phases, by.rrdw.phasesActive], [2, 1]);
  assert.equal(by.ghost.card, CARD_STATE.ABSENT);
});

test('b1 кандидаты: карточка закрытого прогона исключается И называется с причиной; остальные в прежнем порядке', () => {
  const candidates = [
    { id: 'angelina-hostess-impl', zone: null, size: 'L' },
    { id: 'assets-container', zone: null, size: 'L' },
    { id: 'batch-collection-run-contour', zone: null, size: 'L' },
    { id: 'zzz', zone: null, size: 'L' },
  ];
  const closed = joinClosedSprintsWithCards(
    closedSprintRunsOf([closeRecord('batch-collection-run-contour', 'pass', '2026-09-29T16:22:00+03:00')]),
    [{ id: 'batch-collection-run-contour', status: 'active' }],
  );
  const { kept, excluded } = staleCandidates(candidates, closed);
  assert.deepEqual(kept.map((c) => c.id), ['angelina-hostess-impl', 'assets-container', 'zzz']);
  assert.equal(excluded.length, 1);
  assert.equal(excluded[0].id, 'batch-collection-run-contour');
  assert.match(excluded[0].reason, /прогон спринта закрыт 2026-09-29 \(гейт pass\); карточка не архивирована — долг закрытия/u);
});

test('b1 ПОРЧА: без close-записи кандидат остаётся; закрытие красным тоже исключает, но названо цветом', () => {
  const candidates = [{ id: 'batch-collection-run-contour', size: 'L' }];
  assert.equal(staleCandidates(candidates, []).kept.length, 1);
  const red = joinClosedSprintsWithCards(
    closedSprintRunsOf([closeRecord('batch-collection-run-contour', 'fail', '2026-09-29T16:22:00+03:00')]),
    [{ id: 'batch-collection-run-contour', status: 'active' }],
  );
  const { kept, excluded } = staleCandidates(candidates, red);
  assert.equal(kept.length, 0);
  assert.match(excluded[0].reason, /закрыт fail/u);
});

test('b1 блок: закрытые прогоны с карточкой, решения с якорем и обрезкой, нечитаемое — словами', () => {
  const closed = joinClosedSprintsWithCards(
    closedSprintRunsOf([closeRecord('batch-collection-run-contour', 'pass', '2026-09-29T16:22:00+03:00')]),
    [
      { id: 'batch-collection-run-contour', status: 'active' },
      { id: 'batch-collection-run-contour-a1', status: 'active', parentEpic: 'batch-collection-run-contour' },
    ],
  );
  const block = formatDecisionsBlock({
    decisions: ratifiedDecisionsOf([a11yPlan, batchPlan]),
    closedSprints: closed,
    sinceDay: '2026-09-23',
    unreadable: ['docs/sprint/cut/broken.json: Unexpected token'],
    clip: 60,
  });
  assert.match(block, /^## Решённое \(ратифицированные решения и закрытые спринты\)/u);
  assert.match(block, /\*\*batch-collection-run-contour\*\* — прогон закрыт 2026-09-29 \(гейт pass\); карточка НЕ архивирована \(active, фаз active 1\/1\) — долг закрытия, не кандидат в магистраль/u);
  assert.match(block, /\*\*sample-library-paging-a11y\*\* · \/\/decisions · ратифицировано 2026-09-29T15:13:04\+03:00 \(docs\/sprint\/cut\/sample-library-paging-a11y\.json#\/\/decisions\)/u);
  assert.match(block, /aria-current с индикатора СНЯТЬ/u);
  assert.match(block, /…$/mu, 'обрезка по clip');
  assert.match(block, /Не прочитано \(1\): docs\/sprint\/cut\/broken\.json: Unexpected token/u);
  // Порядок: закрытые прогоны раньше решений.
  assert.ok(block.indexOf('### Закрытые прогоны') < block.indexOf('### Ратифицированные решения'));
});

test('b1 ПОРЧА: пустая ведомость говорит «нет», а не молчит', () => {
  const block = formatDecisionsBlock({ decisions: [], closedSprints: [], sinceDay: '2026-09-23' });
  assert.match(block, /за окно закрытых прогонов нет/u);
  assert.match(block, /за окно ратифицированных решений нет/u);
  assert.equal(clipDecision('  a   b  ', 10), 'a b');
});
