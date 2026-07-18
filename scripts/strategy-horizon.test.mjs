/**
 * Тесты чистого ядра генератора стратегии дня (#592, S1–S3). Все — офлайн: время
 * подаётся параметром, git — данными. Покрывают тест-памятники из DoD спеки
 * (docs/prompts/STRATEGY_DAY_GENERATOR_PROMPT.md) и три ловушки дня из HANDOFF.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  makeHorizon,
  horizonSince,
  externalizeQuery,
  isTimely,
  touchesArea,
  collectHorizonInputs,
  HORIZON_PHASES,
  parseMs,
} from './lib/strategy-horizon.mjs';

const NOW = '2026-07-17T12:00:00Z';
const day = (n) => new Date(Date.parse(NOW) + n * 24 * 60 * 60 * 1000).toISOString();

// ─── S2: горизонт = веха, инвариант d/dt = 0 ────────────────────────────────

test('makeHorizon: неизвестная фаза — явный FAIL, не молчание', () => {
  assert.throws(() => makeHorizon({ gate: 'g1', phase: 'someday' }), /неизвестная фаза/u);
  for (const phase of HORIZON_PHASES) {
    assert.equal(makeHorizon({ gate: 'g1', phase }).phase, phase);
  }
});

test('makeHorizon: gate обязателен', () => {
  assert.throws(() => makeHorizon({ phase: 'mid' }), /gate обязателен/u);
});

test('инвариант d/dt = 0: смена календарной даты НЕ меняет горизонт', () => {
  const h1 = makeHorizon({ gate: 'parser-built', phase: 'approaching', criteria: ['c1', 'c2'] });
  const h2 = makeHorizon({ gate: 'parser-built', phase: 'approaching', criteria: ['c1', 'c2'] });
  // Тождество горизонта не содержит now — два конструирования в разные дни идентичны.
  assert.deepEqual(h1, h2);
  assert.equal(h1.lastGateTransition, null);
});

test('horizonSince: since = max(lastGateTransition, now − N)', () => {
  const recentVeha = makeHorizon({ gate: 'g', phase: 'mid', lastGateTransition: day(-2) });
  // Веха 2 дня назад ближе, чем окно 14 дней → берётся веха.
  assert.equal(horizonSince(recentVeha, NOW, 14), Date.parse(day(-2)));
  // Веха 30 дней назад дальше окна → берётся окно now−5.
  const oldVeha = makeHorizon({ gate: 'g', phase: 'mid', lastGateTransition: day(-30) });
  assert.equal(horizonSince(oldVeha, NOW, 5), Date.parse(day(-5)));
  // Нет вехи → чистое окно.
  const noVeha = makeHorizon({ gate: 'g', phase: 'mid' });
  assert.equal(horizonSince(noVeha, NOW, 5), Date.parse(day(-5)));
});

// ─── externalizeQuery: жаргон → явный FAIL ──────────────────────────────────

test('externalizeQuery: жаргон (ADR, имя пакета) — явный FAIL с читаемым сообщением', () => {
  const cases = [
    'Правильно ли мы применили ADR-0012 к плагинам?',
    'Стоит ли @membrana/detection-ensemble-service выносить на сервер?',
    'Закрывает ли #592 гонку реестра?',
    'Верна ли посылка кристалла magistral-17-07-truth-graph?',
    'Читает ли strategic-plan-day.mjs граф правды?',
  ];
  for (const q of cases) {
    const r = externalizeQuery(q);
    assert.equal(r.ok, false, `должен отклонить: ${q}`);
    assert.ok(r.reason.length > 0 && r.offending.length > 0, 'сообщение и список видимы');
  }
});

test('#599: четыре класса из критерия приёмки отклоняются (утечка 18.07)', () => {
  // Живой прогон аудита 18.07: externalizeQuery('MAIN_DAY_ISSUE') возвращал ok=true,
  // и вопрос с жаргоном ушёл наружу — Perplexity вернул ЕГРЮЛ.
  const cases = [
    ['MAIN_DAY_ISSUE', 'CAPS_SNAKE — имя документа'],
    ['Что в DAILY_CODE_REVIEW.md?', 'имя документа с расширением'],
    ['Стоит ли чинить ritual:day?', 'имя yarn-скрипта'],
    ['Верен ли вердикт C1?', 'метка вопроса повестки'],
    ['Верен ли вердикт M2′?', 'метка со штрихом'],
  ];
  for (const [q, why] of cases) {
    const r = externalizeQuery(q);
    assert.equal(r.ok, false, `должен отклонить (${why}): ${q}`);
    assert.ok(r.offending.length > 0, 'нарушение названо, а не молча');
  }
});

test('#599: законные внешние аббревиатуры НЕ отклоняются (MP3/H264 против метки)', () => {
  // Правило «буквы+цифра» по форме совпадает с меткой повестки; без allowlist гвард
  // убил бы ровно те слова, ради которых сон и задаётся в проекте про звук.
  for (const q of ['MP3 или FLAC для архива звука?', 'Кодек H264 с дрона — что в 2025?']) {
    assert.equal(externalizeQuery(q).ok, true, `ложное отклонение: ${q}`);
  }
});

test('#599: имя скрипта ловится словарём, английские связки — нет', () => {
  const names = ['main-day-issue', 'night-research', 'tasks-audit'];
  assert.equal(externalizeQuery('Читает ли main-day-issue граф?', { internalNames: names }).ok, false);

  // Ключевая причина, по которой список приходит словарём, а не правилом по форме:
  // kebab-эвристика отклоняла бы законные исследовательские связки.
  const legit = [
    'Какие end-to-end подходы к акустической детекции БПЛА?',
    'Что такое state-of-the-art в signal-to-noise для микрофонных решёток?',
  ];
  for (const q of legit) {
    assert.equal(externalizeQuery(q, { internalNames: names }).ok, true, `ложное отклонение: ${q}`);
  }
});

test('externalizeQuery: мирочитаемый вопрос проходит', () => {
  const r = externalizeQuery('Отличают ли CNN-классификаторы дрон от птицы по спектру 2025?');
  assert.equal(r.ok, true);
  assert.equal(r.query.length > 0, true);
});

test('externalizeQuery: пустой вопрос — видимый отказ, не тихий', () => {
  assert.equal(externalizeQuery('   ').ok, false);
});

// ─── S3: isTimely — обе ветви ───────────────────────────────────────────────

const HORIZON = makeHorizon({ gate: 'parser-built', phase: 'approaching', lastGateTransition: day(-3) });

test('isTimely: веха далеко → НЕ подсвечен', () => {
  const insight = { id: 'i1', gate: 'other-gate', area: 'scripts/lib' };
  assert.equal(isTimely(insight, HORIZON, [], { now: NOW }), false);
});

test('isTimely: инсайт без вехи → НЕ подсвечен (названная цена)', () => {
  const insight = { id: 'i1', area: 'scripts/lib' };
  assert.equal(isTimely(insight, HORIZON, [], { now: NOW }), false);
});

test('isTimely: область шумит в окне → НЕ подсвечен', () => {
  const insight = { id: 'i1', gate: 'parser-built', area: 'scripts/lib' };
  const gitLog = [{ date: day(-1), files: ['scripts/lib/strategy-horizon.mjs'] }];
  assert.equal(isTimely(insight, HORIZON, gitLog, { now: NOW }), false);
});

test('isTimely: веха близко И область молчит → подсвечен', () => {
  const insight = { id: 'i1', gate: 'parser-built', area: 'scripts/lib' };
  // Коммит есть, но по ДРУГОЙ области и/или до since — тишина в области инсайта.
  const gitLog = [
    { date: day(-1), files: ['apps/client/src/main.tsx'] },
    { date: day(-10), files: ['scripts/lib/strategy-horizon.mjs'] }, // до since (веха −3д)
  ];
  assert.equal(isTimely(insight, HORIZON, gitLog, { now: NOW }), true);
});

test('touchesArea: по префиксу пути и по тегу', () => {
  assert.equal(touchesArea(['scripts/lib/x.mjs'], { area: 'scripts/lib' }), true);
  assert.equal(touchesArea(['scripts/other.mjs'], { area: 'scripts/lib' }), false);
  assert.equal(touchesArea(['apps/client/device-board/x.ts'], { tags: ['device-board'] }), true);
});

// ─── S1: collectHorizonInputs ───────────────────────────────────────────────

test('дедуп эха: три отражения одного первоисточника → n = 1 (тест на эхо 06.07)', () => {
  // Эхо 06.07: `detection-planning-priorities@06.07` прочитан ТРЕМЯ шагами. Моделируем
  // как три записи одного origin — они схлопываются в один голос.
  const research = [
    { slug: 'r1', topic: 'A', origin: 'detection-planning-priorities@06.07', date: day(-1) },
    { slug: 'r2', topic: 'B', origin: 'detection-planning-priorities@06.07', date: day(-1) },
    { slug: 'r3', topic: 'C', origin: 'detection-planning-priorities@06.07', date: day(-1) },
  ];
  const { highlights } = collectHorizonInputs(HORIZON, { insights: [], research }, { now: NOW });
  assert.equal(highlights.length, 1, 'три отражения одного первоисточника = один голос');
  assert.equal(highlights[0].reflections, 3, 'reflections считает схлопнутые');
});

test('разные инсайты с общей категорией source НЕ склеиваются (баг живого прогона)', () => {
  // `source` — грубая категория (`packaging-epic`), общая у разных инсайтов. Дедуп по
  // ней ложно схлопнул бы 29 инсайтов; первоисточник = собственный id.
  const insights = [
    { id: 'a', title: 'A', source: 'packaging-epic', createdAt: day(-1) },
    { id: 'b', title: 'B', source: 'packaging-epic', createdAt: day(-1) },
    { id: 'c', title: 'C', source: 'packaging-epic', createdAt: day(-1) },
  ];
  const { highlights } = collectHorizonInputs(HORIZON, { insights, research: [] }, { now: NOW });
  assert.equal(highlights.length, 3, 'три разных инсайта — три голоса');
});

test('отсутствующий вход → ВИДИМАЯ пометка «канал мёртв», не null и молчание (регресс 2 мес)', () => {
  const { provenance } = collectHorizonInputs(HORIZON, { insights: [], research: null }, { now: NOW });
  const research = provenance.find((p) => p.channel === 'research');
  const insight = provenance.find((p) => p.channel === 'insight');
  assert.equal(research.present, false);
  assert.match(research.note, /канал мёртв/u);
  assert.equal(insight.present, false); // пустой массив — тоже мёртвый канал, видимо
  assert.match(insight.note, /канал мёртв/u);
});

test('ни один highlight не несёт права на assign (граница структурная, Q1)', () => {
  const insights = [{ id: 'a', title: 'A', source: 's1', createdAt: day(-1) }];
  const research = [{ slug: 'r1', topic: 'T', origin: 'o1', date: day(-1) }];
  const { highlights } = collectHorizonInputs(HORIZON, { insights, research }, { now: NOW });
  for (const h of highlights) {
    assert.ok(!('assign' in h) && !('persona' in h) && !('dod' in h), 'highlight описывает акцент, не назначает');
    assert.ok('timely' in h && 'stale' in h, 'highlight описывает своевременность/свежесть');
  }
});

test('stale: age > веха текущего горизонта → помечен с бейджем даты', () => {
  const insights = [
    { id: 'fresh', title: 'F', source: 'sf', createdAt: day(-1) },
    { id: 'old', title: 'O', source: 'so', createdAt: day(-10) }, // старше вехи −3д
  ];
  const { highlights } = collectHorizonInputs(HORIZON, { insights, research: [] }, { now: NOW });
  const fresh = highlights.find((h) => h.ref === 'fresh');
  const old = highlights.find((h) => h.ref === 'old');
  assert.equal(fresh.stale, false);
  assert.equal(fresh.staleBadge, null);
  assert.equal(old.stale, true);
  assert.equal(old.staleBadge, insights[1].createdAt, 'бейдж = дата артефакта');
});

test('детерминизм: тот же вход → тот же порядок highlights', () => {
  const insights = [
    { id: 'z', title: 'Z', source: 'sz', createdAt: day(-1) },
    { id: 'a', title: 'A', source: 'sa', createdAt: day(-1) },
  ];
  const r1 = collectHorizonInputs(HORIZON, { insights, research: [] }, { now: NOW });
  const r2 = collectHorizonInputs(HORIZON, { insights, research: [] }, { now: NOW });
  assert.deepEqual(r1.highlights, r2.highlights);
});

test('parseMs: битый вход → null, число проходит', () => {
  assert.equal(parseMs('не-дата'), null);
  assert.equal(parseMs(null), null);
  assert.equal(parseMs(1000), 1000);
});
