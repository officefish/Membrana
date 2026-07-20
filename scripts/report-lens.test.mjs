/**
 * Юнит-тесты доклада наружу (R, вердикт M4). Чистые функции — без сети/моков.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  structuralSkeleton, structuralHash, structuralIsomorphic,
  protectedTokens, protectedTokensKept,
  classifyLinkStatus, canPublish, LINK_STATUS,
} from './lib/report-lens.mjs';

const plan = '# План\n\n## Магистраль\n- задача #592 статус OPEN\n- метрика 55/60\n';
const rephrased = '# План\n\n## Главная задача\n- работа #592 статус OPEN\n- показатель 55/60\n';
const structBroken = '# План\n\n## Магистраль\n- задача #592 статус OPEN\n'; // потерян узел

test('structuralSkeleton: типы строк без содержания', () => {
  assert.equal(structuralSkeleton('# A\n\n- x\n| a |'), 'H1||B|R');
});

test('линза-rephraser: слова переписаны, структура изоморфна', () => {
  assert.equal(structuralIsomorphic(plan, rephrased), true, 'тот же скелет');
  assert.equal(structuralHash(plan), structuralHash(rephrased));
});

test('redactor пойман: потеря узла ломает изоморфизм', () => {
  assert.equal(structuralIsomorphic(plan, structBroken), false);
});

test('protectedTokens: числа, статусы, ссылки', () => {
  const t = protectedTokens('#592 OPEN 55 https://x.io GHSA-ab-cd');
  assert.ok(t.includes('#592'));
  assert.ok(t.includes('OPEN'));
  assert.ok(t.includes('55'));
  assert.ok(t.includes('https://x.io'));
  assert.ok(t.includes('GHSA-ab-cd'));
});

test('protectedTokensKept: rephrased сохраняет факты → true', () => {
  assert.equal(protectedTokensKept(plan, rephrased), true);
});

test('protectedTokensKept: искажён факт (#592→#593) → false', () => {
  assert.equal(protectedTokensKept(plan, rephrased.replace('#592', '#593')), false);
  assert.equal(protectedTokensKept(plan, rephrased.replace('OPEN', 'CLOSED')), false, 'смягчён статус');
});

test('classifyLinkStatus: внутренняя — бинарно', () => {
  assert.equal(classifyLinkStatus('internal', { exists: true }), LINK_STATUS.ALIVE);
  assert.equal(classifyLinkStatus('internal', { exists: false }), LINK_STATUS.DEAD);
});

test('classifyLinkStatus: внешняя — dead на 4xx/410, unverifiable на таймаут', () => {
  assert.equal(classifyLinkStatus('external', { status: 200 }), LINK_STATUS.ALIVE);
  assert.equal(classifyLinkStatus('external', { status: 404 }), LINK_STATUS.DEAD);
  assert.equal(classifyLinkStatus('external', { status: 410 }), LINK_STATUS.DEAD);
  assert.equal(classifyLinkStatus('external', { timedOut: true }), LINK_STATUS.UNVERIFIABLE);
  assert.equal(classifyLinkStatus('external', { status: null }), LINK_STATUS.UNVERIFIABLE);
});

test('canPublish: чисто → ok; dead → блок; unverifiable считается, не блокирует', () => {
  assert.equal(canPublish({ structuralIntact: true, protectedTokensKept: true, linkStatuses: [{ kind: 'external', status: LINK_STATUS.ALIVE }] }).ok, true);
  const withDead = canPublish({ structuralIntact: true, protectedTokensKept: true, linkStatuses: [{ kind: 'internal', status: LINK_STATUS.DEAD }] });
  assert.equal(withDead.ok, false);
  const withUnver = canPublish({ structuralIntact: true, protectedTokensKept: true, linkStatuses: [{ kind: 'external', status: LINK_STATUS.UNVERIFIABLE }] });
  assert.equal(withUnver.ok, true);
  assert.equal(withUnver.unverifiable, 1);
});

test('canPublish: сломанная структура → блок с причиной', () => {
  const r = canPublish({ structuralIntact: false, protectedTokensKept: true, linkStatuses: [] });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => /структур/u.test(x)));
});
