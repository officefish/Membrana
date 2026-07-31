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
