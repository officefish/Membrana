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
  assert.deepEqual(v, { sha: SHA, verdict: 'LGTM', lead: 'tarasov', at: '2026-07-29T10:00:00Z' });
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
