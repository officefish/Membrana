import assert from 'node:assert/strict';
import test from 'node:test';

import { MODE_TO_GATE, SEAM_FINDINGS, planToGate } from './lib/sprint-integration/plan-to-gate.mjs';
import { planToForecast } from './lib/sprint-integration/plan-to-forecast.mjs';
import { cutDigestOf } from './lib/sprint-cut/index.mjs';
import {
  gateStops,
  gateToForecastObserved,
  leadStopsJournal,
} from './lib/sprint-integration/gate-to-forecast.mjs';
import { MODES } from './lib/execution-trace/plan-reader.mjs';
import { OVERSIZED_CHANGED_LINES } from './lib/day-work-diff.mjs';

/**
 * Фикстура плана. Дайджест НЕ выдумывается — считается `cutDigestOf` по телу: подделку блок A
 * не принимает, и это выяснилось на первом же прогоне этого теста. Ровно то поведение, ради
 * которого дайджест и введён: правка тела после согласия сбрасывает ратификацию.
 */
const plan = (over = {}) => {
  const body = {
    sprintId: 'sprint-demo',
    cutBy: 'tarasov',
    window: { from: '2026-07-30T09:00:00Z', to: '2026-07-31T09:00:00Z' },
    revisionAt: '2026-07-30T09:30:00Z',
    blocks: [
      { blockId: 'alpha-one', persona: 'dynin', context: 'dynin', zone: ['scripts/a/**'], estimate: { changedLines: 200 } },
    ],
    ...over,
  };
  if ('ratification' in over) return body;
  return { ...body, ratification: { by: 'owner', at: '2026-07-30T10:00:00Z', digest: cutDigestOf(body) } };
};

// ── A→B ───────────────────────────────────────────────────────────────────────

test('A→B: переименования и нормализация режима в сторону СЛОВА ВЛАДЕЛЬЦА', () => {
  const { planRaw, findings } = planToGate(plan({ mode: 'membrana-flow' }));
  assert.equal(planRaw.planId, 'sprint-demo', 'sprintId → planId');
  assert.equal(planRaw.blocks[0].assigned, 'dynin', 'persona → assigned');
  assert.equal(planRaw.blocks[0].mode, MODES.NO_PERSONAL_RESPONSIBILITY);
  assert.deepEqual(findings, [], 'нормализация — не находка');
  assert.equal(MODE_TO_GATE['membrana-flow'], MODES.NO_PERSONAL_RESPONSIBILITY);
});

test('A→B: молчание режима читается как explicit-honest обеими сторонами одинаково', () => {
  assert.equal(planToGate(plan()).planRaw.blocks[0].mode, MODES.EXPLICIT_HONEST);
});

test('A→B: режим вне двух — НАХОДКА, адаптер не угадывает', () => {
  const { findings } = planToGate(plan({ mode: 'recon' }));
  const f = findings.find((x) => x.toothId === SEAM_FINDINGS.MODE_UNKNOWN);
  assert.ok(f, 'режим вне закрытых двух назван');
  assert.match(f.reason, /не угадывает/u);
});

test('A→B: ratified — ПРЕДИКАТ блока A, а не поле; правка тела сбрасывает', () => {
  assert.equal(planToGate(plan()).planRaw.ratified, true);
  const unratified = plan({ ratification: { by: 'angelina', at: '2026-07-30T10:00:00Z', digest: 'x' } });
  assert.equal(planToGate(unratified).planRaw.ratified, false, 'by ≠ owner — не ратификация');
});

test('A→B: window и revisionAt НЕ изобретаются при отсутствии — иначе мост обходит запрет M2', () => {
  const { planRaw } = planToGate(plan({ window: undefined, revisionAt: undefined }));
  assert.equal(planRaw.window, undefined, 'окно не подставлено');
  assert.equal(planRaw.revisionAt, undefined, 'ревизия не подставлена');
  assert.equal(planRaw.blocks[0].revisionAt, undefined);
});

test('A→B: context ≠ persona — находка шва (ограничение v1, слово владельца)', () => {
  const p = plan({ blocks: [{ blockId: 'alpha-one', persona: 'dynin', context: 'ozhegov', zone: [], estimate: { changedLines: 10 } }] });
  const f = planToGate(p).findings.find((x) => x.toothId === SEAM_FINDINGS.CONTEXT_DIFFERS);
  assert.ok(f);
  assert.equal(f.blockId, 'alpha-one', 'находка адресуема');
  assert.match(f.reason, /обязаны совпадать/u);
});

// ── A→C ───────────────────────────────────────────────────────────────────────

test('A→C: claim считается ОБЩИМ предикатом — граница совпадает с ревью бит-в-бит', () => {
  const at = (n) => planToForecast(plan({ blocks: [{ blockId: 'b-one', persona: 'dynin', context: 'dynin', zone: [], estimate: { changedLines: n } }] })).predicted.blocks[0];
  assert.equal(at(OVERSIZED_CHANGED_LINES).claim, 'fits', '400 влезает');
  assert.equal(at(OVERSIZED_CHANGED_LINES + 1).claim, 'does-not-fit', '401 нет');
  assert.equal(at(OVERSIZED_CHANGED_LINES).threshold, OVERSIZED_CHANGED_LINES, 'порог в записи числом');
});

test('A→C: predictedAt — момент РАТИФИКАЦИИ, не черновика', () => {
  const f = planToForecast(plan());
  assert.equal(f.predictedAt, '2026-07-30T10:00:00Z');
  assert.equal(f.ratifiedBy, 'owner');
  assert.equal(f.personaId, 'tarasov', 'автор предсказания — резчик плана');
  assert.equal(f.subject, 'cut');
});

test('A→C: нератифицированный план даёт легальное «нет» с причиной, а не пустоту', () => {
  const f = planToForecast(plan({ ratification: null }));
  assert.deepEqual(f.ratifiedBy, { none: 'план не ратифицирован владельцем' });
  assert.equal(f.predictedAt, undefined, 'время не подставлено вместо отсутствующей ратификации');
});

// ── B→C ───────────────────────────────────────────────────────────────────────

const report = {
  planId: 'sprint-demo',
  corpusSize: 1,
  checkedBlocks: 2,
  exitCode: 1,
  blocks: [
    { blockId: 'alpha-one', personaId: 'dynin', verdict: 'honest_pair', stopped: false, reason: 'след есть' },
    { blockId: 'beta-two', personaId: 'ozhegov', verdict: 'plan_lied', stopped: true, reason: 'вещдока нет' },
  ],
  disqualified: [],
  inputErrors: [],
};

test('B→C: объём НЕ берётся из гейта — отказ блока B уважается, а не обходится', () => {
  const observed = gateToForecastObserved(report);
  assert.deepEqual(observed.blocks, [], 'без носителя N1 привязки нет — и это пусто, а не ноль строк');
  assert.equal(observed.corpusSize, 1, 'знаменатель проброшен');
  assert.equal(observed.checkedBlocks, 2);
});

test('B→C: вердикты и признак остановки идут сквозняком, переопределения нет', () => {
  const observed = gateToForecastObserved(report);
  assert.deepEqual(observed.verdicts.map((v) => [v.blockId, v.verdict, v.stopped]), [
    ['alpha-one', 'honest_pair', false],
    ['beta-two', 'plan_lied', true],
  ]);
  assert.ok(Object.isFrozen(observed.verdicts), 'C не вправе переопределить признак');
});

test('B→C: gateStop и leadStop разведены — журнал ведущей пуст, а не подменён остановками гейта', () => {
  assert.equal(gateStops(report).length, 1, 'остановка гейта одна');
  assert.deepEqual(leadStopsJournal(), [], 'носителя N2 нет — честный пустой журнал');
  assert.notDeepEqual(gateStops(report), leadStopsJournal(), 'смешать их значило бы мерить одно другим');
});

test('B→C: сегменты, когда носитель появится, проезжают как есть', () => {
  const observed = gateToForecastObserved(report, [{ blockId: 'alpha-one', changedLines: 120 }]);
  assert.deepEqual(observed.blocks, [{ blockId: 'alpha-one', changedLines: 120 }]);
});
