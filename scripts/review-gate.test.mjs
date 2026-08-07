/**
 * Зубы шип-гейта. Спутник `scripts/review-gate.mjs` + `scripts/lib/review-gate.mjs`
 * (правило спутника, вердикт M8 заседания workshop-wires: тест наследует дом предмета).
 *
 * Теста у ворот, стоящих перед КАЖДЫМ мерджем, не было вовсе — заведён 31.07 вместе с
 * правкой по #1550.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PUBLISH_ATTEMPTS,
  PUBLISH_PAUSE_MS,
  REVIEW_STATUS_CONTEXT,
  publishReviewStatus,
  statusPublishArgs,
  parseVerdict,
  renderScopeMarker,
  reviewGateDecision,
  scopeFromBody,
  shouldEnsureReview,
  statusFromDecision,
} from './lib/review-gate.mjs';

const SHA = '163a759e163a759e163a759e163a759e163a759e';
const verdict = (v) => ({ sha: SHA, verdict: v, lead: 'vesnin', at: null });
const CUT = { truncated: true, sentChars: 120_000 };

test('scopeFromBody: метка среза читается, чистое тело не срабатывает', () => {
  assert.deepEqual(scopeFromBody('<!-- review-scope: truncated sent=120000 -->'), {
    truncated: true,
    sentChars: 120_000,
  });
  assert.deepEqual(scopeFromBody('# Ревью\n\nВердикт: LGTM'), { truncated: false, sentChars: null });
  assert.deepEqual(scopeFromBody(null), { truncated: false, sentChars: null });
});

test('#1550: вердикт по СРЕЗУ — не вердикт В ЛЮБУЮ сторону', () => {
  // Ложный BLOCK стоит круга; ложный LGTM пропускает в ствол дефект из непоказанной
  // части. Канон ставит ошибку в сторону остановки дешевле ошибки в сторону мерджа,
  // поэтому симметрия несущая: зелёный по срезу так же недопустим, как красный.
  assert.equal(reviewGateDecision({ headSha: SHA, verdict: verdict('BLOCK'), scope: CUT }).state, 'unknown');
  assert.equal(reviewGateDecision({ headSha: SHA, verdict: verdict('LGTM'), scope: CUT }).state, 'unknown');
});

test('#1550: без среза поведение НЕ изменилось', () => {
  assert.equal(reviewGateDecision({ headSha: SHA, verdict: verdict('BLOCK') }).state, 'block');
  assert.equal(reviewGateDecision({ headSha: SHA, verdict: verdict('LGTM') }).state, 'pass');
});

test('#1550: unknown по срезу НЕ пропускает и называет ремонт', () => {
  const d = reviewGateDecision({ headSha: SHA, verdict: verdict('LGTM'), scope: CUT });
  assert.notEqual(d.state, 'pass', 'ворота не ослаблены: unknown не есть проход');
  assert.match(d.reason, /ПО СРЕЗУ/u);
  assert.match(d.reason, /120000/u, 'сколько именно ушло ревьюеру — в причине, а не в догадке');
  assert.match(d.reason, /Резать PR/u, 'отказ обязан называть ремонт');
  assert.equal(statusFromDecision(d).state, 'pending', 'наружу — pending, не failure и не success');
});

test('срез догоняется --ensure: unknown ждёт ревью, block и pass — нет', () => {
  // Прямое следствие: PR по срезу попадает в тот же путь, что «ревью не прогонялось».
  assert.equal(shouldEnsureReview('unknown', true), true);
  assert.equal(shouldEnsureReview('block', true), false);
  assert.equal(shouldEnsureReview('pass', true), false);
});

test('обход владельца сильнее среза — но требует причины', () => {
  const withReason = reviewGateDecision({
    headSha: SHA,
    verdict: verdict('BLOCK'),
    scope: CUT,
    override: { enabled: true, reason: 'дифф больше порога, слово владельца' },
  });
  assert.equal(withReason.state, 'pass');
  assert.match(withReason.reason, /ОБХОД владельца/u);

  const silent = reviewGateDecision({ headSha: SHA, verdict: verdict('LGTM'), override: { enabled: true } });
  assert.equal(silent.state, 'block', 'молчаливый обход = дыра, ради которой гейт и строился');
});

test('протухший вердикт остаётся block даже по срезу: смотрели другой коммит', () => {
  // Порядок проверок важен: «вердикт не о ЭТОМ коде» строже, чем «код прочитан не весь».
  const stale = reviewGateDecision({
    headSha: SHA,
    verdict: { sha: 'aaaaaaaa'.repeat(5), verdict: 'LGTM', lead: 'x', at: null },
    scope: CUT,
  });
  assert.equal(stale.state, 'block');
  assert.match(stale.reason, /протух/u);
});

test('parseVerdict: маркер вердикта читается вместе с меткой среза', () => {
  const md = [
    '<!-- review-scope: truncated sent=120000 -->',
    `<!-- review-verdict sha:${SHA} verdict:BLOCK lead:vesnin at:2026-07-31T09:00:00Z -->`,
    '',
    '# Ревью',
  ].join('\n');
  assert.equal(parseVerdict(md)?.verdict, 'BLOCK');
  assert.equal(scopeFromBody(md).truncated, true);
  // Совместное поведение документируется здесь же: тело с обеими метками даёт unknown.
  // Добавлено по P2 ревью 31.07 — тест уже держал подготовленный md и молчал об итоге.
  const decision = reviewGateDecision({ headSha: SHA, verdict: parseVerdict(md), scope: scopeFromBody(md) });
  assert.equal(decision.state, 'unknown');
});

test('«ревью не прогонялось» и «ревью по срезу» — РАЗНЫЕ причины при одном unknown', () => {
  // P1 ревью 31.07: оба исхода дают unknown, и --ensure подхватывает оба одинаково —
  // но означают они разное. «Нет вердикта» = ревью не было; «срез» = было, но неполно.
  // Причина обязана их различать, иначе догоняющий прогон повторит то же усечение.
  const noReview = reviewGateDecision({ headSha: SHA, verdict: null, scope: CUT });
  assert.equal(noReview.state, 'unknown');
  assert.match(noReview.reason, /не найдено/u, 'при отсутствии вердикта причина — про отсутствие');
  assert.doesNotMatch(noReview.reason, /ПО СРЕЗУ/u, 'срез не подменяет собой факт «ревью не было»');

  const bySlice = reviewGateDecision({ headSha: SHA, verdict: verdict('LGTM'), scope: CUT });
  assert.match(bySlice.reason, /ПО СРЕЗУ/u);
  assert.notEqual(noReview.reason, bySlice.reason);
});

test('sentChars=0 читается как «неизвестно», а не как «ноль символов»', () => {
  // P2 ревью 31.07: ноль в причине выглядел утверждением о размере, которого не знаем.
  const d = reviewGateDecision({ headSha: SHA, verdict: verdict('BLOCK'), scope: { truncated: true, sentChars: 0 } });
  assert.match(d.reason, /неизвестно сколько/u);
  assert.doesNotMatch(d.reason, /0 символов/u);
});

test('renderScopeMarker ↔ scopeFromBody: писатель и читатель делят определение', () => {
  // P1 ревью 31.07: формат метки жил строкой в писателе и регэкспом в читателе.
  // Круг замкнут — расхождение теперь невозможно молча.
  const marker = renderScopeMarker({ sentChars: 120_000 });
  assert.deepEqual(scopeFromBody(marker), { truncated: true, sentChars: 120_000 });
  assert.deepEqual(scopeFromBody(renderScopeMarker({ sentChars: null })), { truncated: true, sentChars: 0 });
});

// ─── диагноз «нет вердикта»: два разных случая (блок e1, вещдок PR #1713) ────────

test('артефакта нет — прежний текст «ревью не найдено»', () => {
  const d = reviewGateDecision({ headSha: SHA, verdict: null, artifact: { exists: false, path: 'docs/discussions/pr-1-code-review.md' } });
  assert.equal(d.state, 'unknown');
  assert.match(d.reason, /ревью тимлида по этому PR не найдено/u);
});

test('артефакт есть, маркера нет — диагноз называет ЭТО, а не «не найдено» (PR #1713)', () => {
  const path = 'docs/discussions/pr-1713-code-review.md';
  const d = reviewGateDecision({ headSha: SHA, verdict: null, artifact: { exists: true, path } });
  assert.equal(d.state, 'unknown', 'исход прежний: закрытый список состояний не расширяется');
  assert.match(d.reason, /маркер вердикта в нём не записан/u);
  assert.match(d.reason, /перепрогнать/u);
  assert.ok(d.reason.includes(path), 'путь артефакта назван — искать не надо');
  assert.doesNotMatch(d.reason, /не найдено/u, 'старый текст лгал: файл лежит на диске');
});

test('без признака artifact поведение прежнее — старые вызовы не ломаются', () => {
  const d = reviewGateDecision({ headSha: SHA, verdict: null });
  assert.equal(d.state, 'unknown');
  assert.match(d.reason, /ревью тимлида по этому PR не найдено/u);
});

test('признак artifact на вердикт НЕ влияет: есть вердикт — судит он', () => {
  const withArtifact = { exists: true, path: 'docs/discussions/pr-2-code-review.md' };
  assert.equal(reviewGateDecision({ headSha: SHA, verdict: verdict('LGTM'), artifact: withArtifact }).state, 'pass');
  assert.equal(reviewGateDecision({ headSha: SHA, verdict: verdict('BLOCK'), artifact: withArtifact }).state, 'block');
});

test('--ensure догоняет оба случая: исход unknown, значит повтор законен', () => {
  const noFile = reviewGateDecision({ headSha: SHA, verdict: null, artifact: { exists: false } });
  const noMarker = reviewGateDecision({ headSha: SHA, verdict: null, artifact: { exists: true, path: 'p.md' } });
  assert.ok(shouldEnsureReview(noFile.state, true) && shouldEnsureReview(noMarker.state, true));
  assert.ok(!shouldEnsureReview(reviewGateDecision({ headSha: SHA, verdict: verdict('BLOCK') }).state, true), 'BLOCK не переспрашивается');
});

// ─── публикация статуса с повторами ───────────────────────────────────────────
//
// Вещдок 07.08 (PR #1774): вердикт `pass` (LGTM тимлида по 7e12fd4c), публикация статуса
// упала ОДНИМ таймаутом, гейт вернул 2, и pr:ship встал до мерджа — при exit code 0 у всей
// цепочки. Тот же вызов руками прошёл с первой попытки. Гейт сам печатал «вердикт в силе,
// но защита его не увидит», то есть знал, что дело не в вердикте.

test('statusPublishArgs: форма вызова фиксирована и содержит контекст гейта', () => {
  const a = statusPublishArgs('abc123', { state: 'success', description: 'LGTM (vesnin)' });
  assert.equal(a[0], 'api');
  assert.ok(a.includes('repos/{owner}/{repo}/statuses/abc123'));
  assert.ok(a.includes(`context=${REVIEW_STATUS_CONTEXT}`));
  assert.ok(a.includes('state=success'));
  assert.ok(a.includes('description=LGTM (vesnin)'));
});

test('публикация с первой попытки — повторов нет, паузы нет', () => {
  let calls = 0;
  let slept = 0;
  const r = publishReviewStatus({
    run: () => { calls += 1; },
    sleep: () => { slept += 1; },
    headSha: 'abc',
    status: { state: 'success', description: 'ok' },
  });
  assert.deepEqual(r, { ok: true, attempt: 1 });
  assert.equal(calls, 1);
  assert.equal(slept, 0, 'успех не должен стоить паузы');
});

test('транзиентный таймаут переживается повтором — зелёный вердикт не роняется', () => {
  let calls = 0;
  const r = publishReviewStatus({
    run: () => {
      calls += 1;
      if (calls === 1) throw new Error('ETIMEDOUT');
    },
    sleep: () => {},
    headSha: 'abc',
    status: { state: 'success', description: 'ok' },
  });
  assert.equal(r.ok, true);
  assert.equal(r.attempt, 2, 'вторая попытка обязана считаться успехом, а не отказом');
});

test('отказ ПОСЛЕ повторов остаётся отказом: защита без статуса всё равно не пустит', () => {
  let calls = 0;
  const r = publishReviewStatus({
    run: () => { calls += 1; throw new Error('403 forbidden'); },
    sleep: () => {},
    headSha: 'abc',
    status: { state: 'success', description: 'ok' },
  });
  assert.equal(r.ok, false);
  assert.equal(calls, 3, 'три попытки — не одна');
  assert.equal(r.attempts, 3);
  assert.match(r.lastError, /403/u, 'причина обязана доехать до человека');
});

test('пауза стоит МЕЖДУ попытками, а не после последней', () => {
  const pauses = [];
  publishReviewStatus({
    run: () => { throw new Error('boom'); },
    sleep: (ms) => pauses.push(ms),
    headSha: 'abc',
    status: { state: 'success', description: 'ok' },
    attempts: 3,
    pauseMs: 50,
  });
  assert.deepEqual(pauses, [50, 50], 'после последней попытки ждать нечего');
});

test('число попыток и пауза — из библиотеки, а не из головы вызывающего', () => {
  assert.equal(PUBLISH_ATTEMPTS, 3);
  assert.equal(PUBLISH_PAUSE_MS, 2_000);
});
