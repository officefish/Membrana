/**
 * Зуб шип-гейта (#924): вердикт по HEAD SHA, BLOCK — жёсткий стоп, unknown ≠ pass,
 * обход громкий и с причиной.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  parseVerdict,
  renderVerdictMarker,
  reviewGateDecision,
  sameSha,
  shouldEnsureReview,
  statusFromDecision,
} from './review-gate.mjs';

const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);

test('LGTM по текущему SHA → pass', () => {
  const d = reviewGateDecision({ headSha: SHA, verdict: { sha: SHA, verdict: 'LGTM', lead: 'tarasov' } });
  assert.equal(d.state, 'pass');
  assert.match(d.reason, /LGTM тимлида \(tarasov\)/u);
});

test('BLOCK по текущему SHA → жёсткий стоп (слово владельца 29.07)', () => {
  const d = reviewGateDecision({ headSha: SHA, verdict: { sha: SHA, verdict: 'BLOCK', lead: 'tarasov' } });
  assert.equal(d.state, 'block');
  assert.match(d.reason, /жёсткий стоп/u);
});

test('вердикт с ЧУЖОГО коммита протухает — дописал коммит после ревью, мердж закрыт', () => {
  const d = reviewGateDecision({ headSha: SHA, verdict: { sha: OTHER, verdict: 'LGTM' } });
  assert.equal(d.state, 'block');
  assert.match(d.reason, /протух/u);
});

test('ревью не прогонялось → unknown, НЕ pass (недоступность ≠ прохождение)', () => {
  const d = reviewGateDecision({ headSha: SHA, verdict: null });
  assert.equal(d.state, 'unknown');
  assert.match(d.reason, /yarn code-review:pr/u, 'отказ называет команду ремонта');
  assert.notEqual(d.state, 'pass');
});

test('без HEAD SHA — unknown: не к чему привязывать вердикт', () => {
  assert.equal(reviewGateDecision({ headSha: null, verdict: { sha: SHA, verdict: 'LGTM' } }).state, 'unknown');
});

test('обход владельца: с причиной — pass с громкой пометкой; без причины — block', () => {
  const ok = reviewGateDecision({ headSha: SHA, verdict: null, override: { enabled: true, reason: 'LLM-канал мёртв, партия срочная' } });
  assert.equal(ok.state, 'pass');
  assert.match(ok.reason, /ОБХОД владельца/u);
  assert.match(ok.reason, /НЕ проходилось/u);
  const bad = reviewGateDecision({ headSha: SHA, verdict: null, override: { enabled: true, reason: '  ' } });
  assert.equal(bad.state, 'block');
  assert.match(bad.reason, /без причины/u);
});

test('парсер вердикта: маркер читается туда и обратно; мусор — null', () => {
  const marker = renderVerdictMarker({ sha: SHA, verdict: 'LGTM', lead: 'tarasov', at: '2026-07-29T10:00:00Z' });
  const v = parseVerdict(`# Ревью\n\n${marker}\n\nтело`);
  // `base: null` — маркер без базы (legacy-форма, #1771): поле есть в разборе всегда,
  // значением «база не названа», и это отличается от «поле неизвестно парсеру».
  assert.deepEqual(v, { sha: SHA, base: null, verdict: 'LGTM', lead: 'tarasov', at: '2026-07-29T10:00:00Z' });
  assert.equal(parseVerdict('# просто ревью без маркера'), null);
  assert.equal(parseVerdict('<!-- review-verdict sha:zzz verdict:LGTM -->'), null);
});

test('короткая форма SHA сравнивается корректно, пустое — не совпадение', () => {
  assert.ok(sameSha('a'.repeat(40), 'a'.repeat(7)));
  assert.ok(!sameSha('a'.repeat(40), 'b'.repeat(40)));
  assert.ok(!sameSha('', 'a'.repeat(40)));
  assert.ok(!sameSha('abc', 'abc'), 'короче 7 hex — не доказательство');
});

test('состояние → commit status: pass=success, block=failure, unknown=pending', () => {
  assert.equal(statusFromDecision({ state: 'pass', reason: 'x' }).state, 'success');
  assert.equal(statusFromDecision({ state: 'block', reason: 'x' }).state, 'failure');
  assert.equal(statusFromDecision({ state: 'unknown', reason: 'x' }).state, 'pending');
});

// --- #1465 Ф2: --ensure догоняет только НЕсказанное ---------------------------------------

test('ВЕЩДОК: unknown догоняется автоматически — ручная пересадка 29.07 (PR #1461, #1464)', () => {
  assert.equal(shouldEnsureReview('unknown', true), true);
});

test('BLOCK НЕ переспрашивается: крутить ревью до нужного ответа — не гейт', () => {
  assert.equal(shouldEnsureReview('block', true), false);
});

test('pass догонять нечего', () => {
  assert.equal(shouldEnsureReview('pass', true), false);
});

test('без флага поведение прежнее для любого исхода', () => {
  for (const s of ['pass', 'block', 'unknown']) {
    assert.equal(shouldEnsureReview(s, false), false);
    assert.equal(shouldEnsureReview(s, undefined), false);
  }
});

// --- база вердикта (#1771, карточка review-diff-explicit-base) ---
//
// Вердикт привязывался к одному head и заявлял «осмотрено на этой ревизии», не называя,
// ЧЕМ был осмотренный код. При том же head смена merge-base меняет границы изменения:
// формально тот же коммит — фактически другой набор файлов.

const BASE = 'c'.repeat(40);
const BASE2 = 'd'.repeat(40);

test('маркер несёт базу, и парсер читает её обратно', () => {
  const md = renderVerdictMarker({ sha: SHA, base: BASE, verdict: 'LGTM', lead: 'ozhegov', at: '2026-08-08T15:00:00.000Z' });
  assert.match(md, /base:c{40}/u);
  const parsed = parseVerdict(md);
  assert.equal(parsed.sha, SHA);
  assert.equal(parsed.base, BASE);
  assert.equal(parsed.verdict, 'LGTM');
  assert.equal(parsed.lead, 'ozhegov');
});

test('legacy-маркер без базы читается по-прежнему — их десятки в docs/discussions', () => {
  const legacy = `<!-- review-verdict sha:${SHA} verdict:LGTM lead:tarasov at:2026-08-07T10:00:00.000Z -->`;
  const parsed = parseVerdict(legacy);
  assert.equal(parsed.sha, SHA);
  assert.equal(parsed.base, null);
  assert.equal(parsed.verdict, 'LGTM');
  assert.equal(parsed.lead, 'tarasov');
});

test('renderVerdictMarker без базы пишет прежнюю форму — старые вызовы не задеты', () => {
  const md = renderVerdictMarker({ sha: SHA, verdict: 'LGTM', lead: 'tarasov', at: '2026-08-08T15:00:00.000Z' });
  assert.equal(md.includes('base:'), false);
  assert.equal(parseVerdict(md).base, null);
});

test('совпали head и база → pass', () => {
  const d = reviewGateDecision({
    headSha: SHA,
    currentBase: BASE,
    verdict: { sha: SHA, base: BASE, verdict: 'LGTM', lead: 'ozhegov' },
  });
  assert.equal(d.state, 'pass');
});

test('база разошлась при том же head → unknown, а не block: код не отвергнут, а не осмотрен', () => {
  const d = reviewGateDecision({
    headSha: SHA,
    currentBase: BASE2,
    verdict: { sha: SHA, base: BASE, verdict: 'LGTM', lead: 'ozhegov' },
  });
  assert.equal(d.state, 'unknown');
  assert.match(d.reason, /база разошлась/u);
  assert.match(d.reason, /ДРУГОЙ набор изменений/u);
  // unknown открывает путь «догнать ревью» — ровно то лечение, которого требует случай.
  assert.equal(shouldEnsureReview(d.state, true), true);
});

test('вердикт назвал базу, а посчитать текущую не удалось → unknown: гейт без приборов не открывает мердж', () => {
  const d = reviewGateDecision({
    headSha: SHA,
    currentBase: null,
    verdict: { sha: SHA, base: BASE, verdict: 'LGTM', lead: 'ozhegov' },
  });
  assert.equal(d.state, 'unknown');
  assert.match(d.reason, /посчитать не удалось/u);
});

test('legacy-вердикт без базы открывает мердж как прежде — так ратифицирован план 08.08', () => {
  // Возражение исполнителя блока («legacy становится дырой навсегда») записано долгом в
  // OPEN.md спринта: ломать сегодняшний мердж соседних PR ради него нельзя, срок жизни
  // legacy — отдельное слово владельца.
  const d = reviewGateDecision({
    headSha: SHA,
    currentBase: BASE2,
    verdict: { sha: SHA, base: null, verdict: 'LGTM', lead: 'tarasov' },
  });
  assert.equal(d.state, 'pass');
});

test('порядок веток несущий: протухший head строже разошедшейся базы', () => {
  const d = reviewGateDecision({
    headSha: OTHER,
    currentBase: BASE2,
    verdict: { sha: SHA, base: BASE, verdict: 'LGTM', lead: 'ozhegov' },
  });
  assert.equal(d.state, 'block');
  assert.match(d.reason, /вердикт протух/u);
});

test('порядок веток несущий: разошедшаяся база строже среза — иначе срез проглотит смену базы', () => {
  const d = reviewGateDecision({
    headSha: SHA,
    currentBase: BASE2,
    verdict: { sha: SHA, base: BASE, verdict: 'LGTM', lead: 'ozhegov' },
    scope: { truncated: true, sentChars: 1000 },
  });
  assert.equal(d.state, 'unknown');
  assert.match(d.reason, /база разошлась/u);
});

test('порядок веток несущий: разошедшаяся база строже BLOCK-вердикта', () => {
  const d = reviewGateDecision({
    headSha: SHA,
    currentBase: BASE2,
    verdict: { sha: SHA, base: BASE, verdict: 'BLOCK', lead: 'ozhegov' },
  });
  assert.equal(d.state, 'unknown');
  assert.match(d.reason, /база разошлась/u);
});

test('база совпала, а head сдвинулся → прежнее протухание по head, не молчаливый pass', () => {
  // Зуб назван исполнителем блока при проверке формы: ловит регрессию, где новая ветка
  // «база совпала» случайно перекроет старую «head сдвинулся».
  const d = reviewGateDecision({
    headSha: OTHER,
    currentBase: BASE,
    verdict: { sha: SHA, base: BASE, verdict: 'LGTM', lead: 'ozhegov' },
  });
  assert.equal(d.state, 'block');
  assert.match(d.reason, /вердикт протух/u);
});
