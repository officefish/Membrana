/**
 * fixtures — СТАБЫ СОСЕДЕЙ, придуманные односторонне (см. `EXPECTATIONS.md`).
 *
 * Формы плана нарезки (`cut-contract`), сегментов ревью, журнала остановок и ленты вещдоков
 * (`execution-gate`) до Interface Consilium не существует. Блок живёт на этих стабах и только
 * на них: чужие ветки, деревья и `EXPECTATIONS.md` не читались.
 *
 * Всё время — ЛИТЕРАЛЫ ISO. `Date.now()`/`Math.random()` в блоке отсутствуют полностью.
 * Стабы в интеграционную ветку НЕ мёржатся; стаб, доживший до прода, — дефект интеграции.
 */
import { OVERSIZED_CHANGED_LINES } from '../day-work-diff.mjs';

import { forecastRecordId, makeForecastRecord } from './forecast-record.mjs';
import { isUsefulStop } from './false-stop-rate.mjs';
import { verdictFor } from './cut-accuracy.mjs';

export const SPRINT_ID = 'sprint-fixture-1';
/** Границы окна приходят от соседа вместе с `sprintId` — я их не вычисляю. */
export const WINDOW = Object.freeze({ openedAt: '2026-07-30T07:00:00Z', closedAt: '2026-07-30T20:00:00Z' });
export const PREDICTED_AT = '2026-07-30T08:00:00Z';
export const OBSERVED_AT = '2026-07-30T18:00:00Z';
export const NOW = '2026-07-30T19:00:00Z';

const planRef = { type: 'path', value: 'docs/sprint/cut/fixture-plan.json' };

/** План нарезки — стаб producer'а блока `cut-contract`. */
export const CUT_PLANS = Object.freeze({
  // Вокруг порога 400: 399 и 400 обязаны быть «влезло», 401 — «переполнился».
  exact: {
    sprintId: SPRINT_ID, authorPersonaId: 'vesnin', ratifiedBy: 'owner', createdAt: PREDICTED_AT,
    blocks: [
      { cutBlockId: 'edge-399', contextPersonaId: 'dynin', claim: 'fits' },
      { cutBlockId: 'edge-400', contextPersonaId: 'dynin', claim: 'fits' },
      { cutBlockId: 'edge-401', contextPersonaId: 'kuryokhin', claim: 'does-not-fit' },
    ],
  },
  allMissed: {
    sprintId: SPRINT_ID, authorPersonaId: 'vesnin', ratifiedBy: 'owner', createdAt: PREDICTED_AT,
    blocks: [
      { cutBlockId: 'edge-401', contextPersonaId: 'dynin', claim: 'fits' },
      { cutBlockId: 'edge-399', contextPersonaId: 'kuryokhin', claim: 'does-not-fit' },
    ],
  },
  unratified: {
    sprintId: SPRINT_ID, authorPersonaId: 'vesnin', createdAt: PREDICTED_AT,
    ratifiedBy: { none: 'владелец плана не видел — молчание ратификацией не является' },
    blocks: [{ cutBlockId: 'edge-399', contextPersonaId: 'dynin', claim: 'fits' }],
  },
  singleBlock: {
    sprintId: SPRINT_ID, authorPersonaId: 'vesnin', ratifiedBy: 'owner', createdAt: PREDICTED_AT,
    blocks: [{ cutBlockId: 'edge-399', contextPersonaId: 'dynin', claim: 'fits' }],
  },
});

/** Сегменты ревью — стаб источника исхода нарезки блока `execution-gate`. */
export const REVIEW_SEGMENTS = Object.freeze({
  aroundThreshold: [
    { cutBlockId: 'edge-399', sha: 'aaaaaaa1', pr: 9001, changedLines: OVERSIZED_CHANGED_LINES - 1 },
    { cutBlockId: 'edge-400', sha: 'aaaaaaa2', pr: 9002, changedLines: OVERSIZED_CHANGED_LINES },
    { cutBlockId: 'edge-401', sha: 'aaaaaaa3', pr: 9003, changedLines: OVERSIZED_CHANGED_LINES + 1 },
  ],
  // Привязки к cutBlockId нет — по путям файлов блок не угадывает: `no-attribution`, не 0.
  noAttribution: [
    { cutBlockId: 'not-in-plan', sha: 'bbbbbbb1', pr: 9101, changedLines: 120 },
  ],
  none: [],
});

/** Журнал остановок ведущей — стаб блока `execution-gate`. */
export const STOP_JOURNALS = Object.freeze({
  none: [],
  mixed: [
    stop('s-1', 'stage-contract-signed', 'docs/sprint/cut/fixture-plan.json', '2026-07-30T09:00:00Z', '2026-07-30T12:00:00Z'),
    stop('s-2', 'stage-review-passed', 'docs/sprint/gate/fixture-traces.json', '2026-07-30T10:00:00Z', '2026-07-30T13:00:00Z'),
    stop('s-3', 'stage-profile-run', 'docs/sprint/experience/FORECAST_RECORD.md', '2026-07-30T11:00:00Z', null),
  ],
  allFalse: [
    stop('s-1', 'stage-contract-signed', 'docs/sprint/cut/fixture-plan.json', '2026-07-30T09:00:00Z', '2026-07-30T12:00:00Z'),
    stop('s-2', 'stage-review-passed', 'docs/sprint/gate/fixture-traces.json', '2026-07-30T10:00:00Z', '2026-07-30T13:00:00Z'),
  ],
  allUnresolved: [
    stop('s-1', 'stage-contract-signed', 'docs/sprint/cut/fixture-plan.json', '2026-07-30T09:00:00Z', null),
    stop('s-2', 'stage-review-passed', 'docs/sprint/gate/fixture-traces.json', '2026-07-30T10:00:00Z', null),
  ],
  noObjectRef: [
    { stopId: 's-x', personaId: 'angelina', sprintId: SPRINT_ID, stageId: 'stage-contract-signed', objectRef: null, stoppedAt: '2026-07-30T09:00:00Z', resolvedAt: '2026-07-30T12:00:00Z' },
  ],
});

/** Лента вещдоков окна — источник `changes(objectRef)` для предиката полезности. */
export const CHANGE_FEEDS = Object.freeze({
  // Изменение ПОСЛЕ первой остановки (полезна) и ничего по объекту второй (ложная).
  oneUseful: [
    { objectRef: { type: 'path', value: 'docs/sprint/cut/fixture-plan.json' }, at: '2026-07-30T10:30:00Z', kind: 'contract-version' },
  ],
  // Изменение ДО остановки: остановку оно не оправдывает — окно предиката (stoppedAt, resolvedAt].
  onlyBeforeStops: [
    { objectRef: { type: 'path', value: 'docs/sprint/cut/fixture-plan.json' }, at: '2026-07-30T08:30:00Z', kind: 'sha' },
  ],
  none: [],
  badKind: [
    { objectRef: { type: 'path', value: 'docs/sprint/cut/fixture-plan.json' }, at: '2026-07-30T10:30:00Z', kind: 'что-то поправили' },
  ],
});

/** Признак «окно шло без ведения» (M6). */
export const LEADS = Object.freeze({
  appointed: 'angelina',
  none: { none: 'окно шло без ведения — ведущая не назначалась' },
});

/** Стабы резолвера `Ref`. */
export const resolverAllOk = () => ({ resolved: true });
export const resolverBroken = () => ({ resolved: false, why: 'вещдок не найден в индексе' });

function stop(stopId, stageId, path, stoppedAt, resolvedAt) {
  return {
    stopId, personaId: 'angelina', sprintId: SPRINT_ID, stageId,
    objectRef: { type: 'path', value: path }, stoppedAt, resolvedAt,
  };
}

/** Собрать запись рода `subject: 'cut'` из стаба плана и стаба сегментов ревью. */
export function cutRecordFrom(plan, segments, opts = {}) {
  const threshold = Number.isInteger(opts.threshold) ? opts.threshold : OVERSIZED_CHANGED_LINES;
  // Исход = сегменты ревью КАК ПРИЕХАЛИ. Сегмент, привязанный к чужому `cutBlockId`, из
  // исхода не выбрасывается — иначе «привязки нет» стало бы неотличимо от «ревью не дошло».
  const observedBlocks = segments.map((s) => ({
    cutBlockId: s.cutBlockId, changedLines: s.changedLines, verdict: verdictFor(s.changedLines, threshold),
  }));
  const byBlock = new Map(observedBlocks.map((o) => [o.cutBlockId, o]));
  const hasOutcome = observedBlocks.length > 0;
  const allHit = hasOutcome && plan.blocks.every((b) => {
    const o = byBlock.get(b.cutBlockId);
    if (o === undefined) return false;
    return b.claim === 'fits' ? o.verdict === 'fitted' : o.verdict === 'overflowed';
  });
  return makeForecastRecord({
    id: forecastRecordId({ personaId: plan.authorPersonaId, sprintId: plan.sprintId, subject: 'cut', seq: 1 }),
    subject: 'cut',
    personaId: plan.authorPersonaId,
    sprintId: plan.sprintId,
    predicted: { blocks: plan.blocks },
    predictedAt: plan.createdAt,
    ratifiedBy: plan.ratifiedBy === 'owner' ? 'owner' : plan.ratifiedBy,
    observed: hasOutcome ? { blocks: observedBlocks } : { none: 'сегменты ревью не привязаны к блокам плана' },
    observedAt: hasOutcome ? OBSERVED_AT : null,
    outcome: hasOutcome ? (allHit ? 'hit' : 'miss') : 'not-observed',
    evidence: segments.map((s) => ({ type: 'sha', value: s.sha })),
    provenance: { planRef: planRef.value, traceRef: 'docs/sprint/gate/fixture-traces.json', sessionId: 'fixture-session' },
  });
}

/** Собрать записи рода `subject: 'stop'` из стаба журнала остановок и стаба ленты вещдоков. */
export function stopRecordsFrom(journal, feed) {
  return journal.map((s, i) => {
    const resolved = s.resolvedAt !== null && s.resolvedAt !== undefined;
    const useful = resolved ? isUsefulStop(s, feed) : null;
    const changes = feed
      .filter((c) => c.objectRef.value === s.objectRef.value && s.stoppedAt < c.at && (resolved ? c.at <= s.resolvedAt : false))
      .map((c) => c.objectRef);
    return makeForecastRecord({
      id: forecastRecordId({ personaId: s.personaId, sprintId: s.sprintId, subject: 'stop', seq: i + 1 }),
      subject: 'stop',
      personaId: s.personaId,
      sprintId: s.sprintId,
      predicted: { stopId: s.stopId, stageId: s.stageId, objectRef: s.objectRef, claim: 'stage-not-passed', stoppedAt: s.stoppedAt },
      predictedAt: s.stoppedAt,
      ratifiedBy: { none: 'остановка ведущей ратификации владельца не требует (ратифицируется план нарезки)' },
      observed: resolved ? { resolvedAt: s.resolvedAt, changes, useful } : { none: 'остановка не разрешена — исход ещё не наблюдаем' },
      observedAt: resolved ? s.resolvedAt : null,
      outcome: resolved ? (useful ? 'hit' : 'miss') : 'not-observed',
      evidence: [{ type: 'path', value: s.objectRef.value }],
      provenance: { planRef: planRef.value, traceRef: 'docs/sprint/gate/fixture-stops.json', sessionId: 'fixture-session' },
    });
  });
}

/**
 * Именованные наборы стабов для CLI `--record <набор>`. Каждый — фикстура с ИЗВЕСТНЫМ ответом,
 * включая все четыре крайних случая собственного DoD.
 */
export const STUB_SETS = Object.freeze({
  'cut-exact': { plan: 'exact', segments: 'aroundThreshold', stops: 'mixed', changes: 'oneUseful', lead: 'appointed', expect: 'cutAccuracy 3/3 · falseStopRate 1/2' },
  'cut-all-missed': { plan: 'allMissed', segments: 'aroundThreshold', stops: 'mixed', changes: 'oneUseful', lead: 'appointed', expect: 'cutAccuracy 0/2 · falseStopRate 1/2' },
  'no-stops': { plan: 'exact', segments: 'aroundThreshold', stops: 'none', changes: 'none', lead: 'appointed', expect: 'cutAccuracy 3/3 · falseStopRate НЕ определена (no-stops-recorded)' },
  'all-false-stops': { plan: 'exact', segments: 'aroundThreshold', stops: 'allFalse', changes: 'onlyBeforeStops', lead: 'appointed', expect: 'cutAccuracy 3/3 · falseStopRate 2/2 = 100%' },
  'no-attribution': { plan: 'exact', segments: 'noAttribution', stops: 'mixed', changes: 'oneUseful', lead: 'appointed', expect: 'cutAccuracy НЕ определена (no-attribution)' },
  'unratified': { plan: 'unratified', segments: 'aroundThreshold', stops: 'allUnresolved', changes: 'none', lead: 'appointed', expect: 'cutAccuracy НЕ определена (forecast-not-ratified) · falseStopRate НЕ определена (stops-unresolved)' },
  'empty-corpus': { plan: 'unratified', segments: 'none', stops: 'none', changes: 'none', lead: 'none', expect: 'обе НЕ определены → «КОРПУСА ОПЫТА НЕТ»' },
});

/** Развернуть именованный набор в живые данные. Неизвестное имя — ошибка входа, не «прочее». */
export function resolveStubSet(name) {
  if (!Object.hasOwn(STUB_SETS, name)) {
    throw new Error(`неизвестный набор стабов «${String(name)}»; доступные: ${Object.keys(STUB_SETS).join(', ')}`);
  }
  const s = STUB_SETS[name];
  const plan = CUT_PLANS[s.plan];
  const segments = REVIEW_SEGMENTS[s.segments];
  const stops = STOP_JOURNALS[s.stops];
  const changes = CHANGE_FEEDS[s.changes];
  const lead = LEADS[s.lead];
  const records = [cutRecordFrom(plan, segments), ...stopRecordsFrom(stops, changes)];
  return { name, expect: s.expect, plan, segments, stops, changes, lead, records, window: WINDOW };
}

/**
 * Прогоны для отбора. `rich` — восемь годных (проверяет окно 7 и `beyond-read-budget`),
 * `thin` — два годных (проверяет честное «корпус тонкий: 2 из 5» без добора).
 */
export function runsFixture(kind) {
  const cut = (n, value, blocks) => ({
    runId: `run-cut-${n}`, sprintId: `${SPRINT_ID}-${n}`, subject: 'cut', personaId: 'vesnin',
    predictedAt: PREDICTED_AT, observedAt: `2026-08-${String(n).padStart(2, '0')}T18:00:00Z`,
    ratifiedBy: 'owner', evidence: [{ type: 'sha', value: `cut${n}` }],
    metric: { defined: true, value, numerator: blocks, denominator: blocks, pair: { blocksCount: blocks, overflowRate: { value: 0, numerator: 0, denominator: blocks }, withoutOutcome: 0, unattributed: 0, missOverflow: 0, missOverCut: 0 } },
  });
  const stopRun = (n, value, stops) => ({
    runId: `run-stop-${n}`, sprintId: `${SPRINT_ID}-${n}`, subject: 'stop', personaId: 'angelina',
    predictedAt: PREDICTED_AT, observedAt: `2026-08-${String(n).padStart(2, '0')}T18:00:00Z`,
    ratifiedBy: { none: 'остановке ратификация не требуется' }, evidence: [{ type: 'path', value: `stop${n}` }],
    metric: { defined: true, value, numerator: Math.round(value * stops), denominator: stops, pair: { stopsCount: stops, unresolvedCount: 0, usefulCount: stops - Math.round(value * stops) } },
  });

  if (kind === 'thin') {
    return [
      cut(1, 1, 3),
      stopRun(1, 0, 4),
      // Ниже — заведомо не годные: каждый со своей причиной, добора ими до 5 быть не должно.
      cut(2, 0.5, 4),
      { ...cut(3, 1, 3), ratifiedBy: { none: 'план не ратифицирован' } },
      { ...cut(4, 1, 1) },
      { ...stopRun(2, 0.9, 5), metric: { defined: false, reason: 'no-stops-recorded' } },
    ];
  }
  if (kind === 'rich') {
    return [
      cut(1, 1, 6), cut(2, 1, 5), cut(3, 1, 4), cut(4, 1, 3),
      stopRun(1, 0, 7), stopRun(2, 0.25, 4), stopRun(3, 0.5, 4), stopRun(4, 0.75, 4),
    ];
  }
  throw new Error(`runsFixture: неизвестный набор «${String(kind)}» (thin | rich)`);
}
