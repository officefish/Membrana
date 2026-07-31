/**
 * Зубы освобождения со сроком — условие 2 аудита к §5 контракта `workshop-wires`.
 *
 * Прогон: `node --test scripts/orphan-waiver.test.mjs`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_WAIVER_DAYS,
  WAIVER_STATES,
  activeWaiverPaths,
  partitionWaivers,
  renderWaiverLine,
  validateWaiver,
  waiverState,
} from './lib/orphan-waiver.mjs';

const NOW = '2026-07-31T10:00:00Z';

const waiver = (over = {}) => ({
  path: 'scripts/legacy-tool.mjs',
  issuer: 'dynin',
  ref: '#1467',
  note: 'парковка ждёт правила членства',
  issuedAt: '2026-07-31T09:00:00Z',
  expiry: '2026-08-07T09:00:00Z',
  ...over,
});

// ── Срок как несущее ──────────────────────────────────────────────────────────────────────

test('без expiry освобождение не оформлено — это условие 2, а не придирка', () => {
  const problems = validateWaiver(waiver({ expiry: undefined }));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /срок обязателен/u);
});

test('срок дольше предела — бессрочность окольным путём, дефект формы', () => {
  const long = waiver({ expiry: '2026-09-30T09:00:00Z' });
  assert.match(validateWaiver(long)[0], new RegExp(`дольше предела ${MAX_WAIVER_DAYS}`, 'u'));
  // Ровно предел — годен: граница включительная, иначе «28 дней» на деле означало бы 27.
  const exact = waiver({ issuedAt: '2026-07-01T00:00:00Z', expiry: '2026-07-29T00:00:00Z' });
  assert.deepEqual(validateWaiver(exact), []);
});

test('expiry не позже выдачи — освобождение мертво в момент выдачи', () => {
  assert.match(validateWaiver(waiver({ expiry: '2026-07-31T09:00:00Z' }))[0], /мертво в момент выдачи/u);
  assert.match(validateWaiver(waiver({ expiry: '2026-07-30T09:00:00Z' }))[0], /мертво в момент выдачи/u);
});

test('просроченное перестаёт освобождать САМО — без ручной уборки', () => {
  const stale = waiver({ issuedAt: '2026-07-01T00:00:00Z', expiry: '2026-07-20T00:00:00Z' });
  assert.equal(waiverState(stale, NOW).state, WAIVER_STATES.EXPIRED);
  assert.deepEqual([...activeWaiverPaths([stale], NOW)], [], 'путь вернулся в O(t) сам');
});

test('момент проверки приходит параметром — часы внутрь зуба не пускаются', () => {
  const w = waiver();
  assert.equal(waiverState(w, '2026-08-01T00:00:00Z').state, WAIVER_STATES.ACTIVE);
  assert.equal(waiverState(w, '2026-08-08T00:00:00Z').state, WAIVER_STATES.EXPIRED);
  // Не назван момент — это ошибка зовущего, и тихое «действует» дало бы проход по недосмотру.
  assert.equal(waiverState(w, undefined).state, WAIVER_STATES.INVALID);
  assert.equal(waiverState(w, 'вчера').state, WAIVER_STATES.INVALID);
});

test('daysLeft считается вверх — «остался день» не превращается в ноль', () => {
  const w = waiver({ expiry: '2026-08-01T09:00:00Z' });
  assert.equal(waiverState(w, NOW).daysLeft, 1);
  assert.equal(waiverState(waiver(), NOW).daysLeft, 7);
});

// ── Форма ─────────────────────────────────────────────────────────────────────────────────

test('issuer обязателен: безымянное освобождение = тихий проход', () => {
  assert.match(validateWaiver(waiver({ issuer: '  ' }))[0], /неотличимо от тихого прохода/u);
  assert.match(validateWaiver(waiver({ path: '' }))[0], /path пуст/u);
});

test('ref и note остаются необязательными — вердикт комнаты не ужесточается', () => {
  assert.deepEqual(validateWaiver(waiver({ ref: undefined, note: undefined })), []);
});

// ── Три группы и набор ────────────────────────────────────────────────────────────────────

test('три группы не схлопнуты: действует ≠ просрочено ≠ испорчено', () => {
  const good = waiver();
  const stale = waiver({ path: 'scripts/a.mjs', issuedAt: '2026-07-01T00:00:00Z', expiry: '2026-07-20T00:00:00Z' });
  const broken = waiver({ path: 'scripts/b.mjs', expiry: undefined });
  const part = partitionWaivers([good, stale, broken], NOW);
  assert.deepEqual(part.active, [good]);
  assert.deepEqual(part.expired, [stale]);
  assert.equal(part.invalid.length, 1);
  assert.match(part.invalid[0].problems[0], /срок обязателен/u);
});

test('испорченное НЕ освобождает, хотя автор мог считать иначе', () => {
  const broken = waiver({ expiry: 'скоро' });
  assert.deepEqual([...activeWaiverPaths([broken], NOW)], []);
  assert.match(renderWaiverLine(partitionWaivers([broken], NOW)), /автор мог считать иначе/u);
});

test('дубль пути — дефект НАБОРА: чей срок считать, непроверяемо', () => {
  const a = waiver({ note: 'первое' });
  const b = waiver({ note: 'второе', expiry: '2026-08-05T09:00:00Z' });
  const part = partitionWaivers([a, b], NOW);
  assert.deepEqual(part.duplicates, ['scripts/legacy-tool.mjs']);
  assert.match(renderWaiverLine(part), /дубль пути/u);
});

test('пути сравнимы независимо от разделителя', () => {
  const w = waiver({ path: 'scripts\\legacy-tool.mjs' });
  assert.ok(activeWaiverPaths([w], NOW).has('scripts/legacy-tool.mjs'));
});

test('след печатается ВСЕГДА — ноль действующих не значит «освобождений не было»', () => {
  const empty = renderWaiverLine(partitionWaivers([], NOW));
  assert.match(empty, /освобождений действует 0/u);
  const stale = waiver({ issuedAt: '2026-07-01T00:00:00Z', expiry: '2026-07-20T00:00:00Z' });
  const line = renderWaiverLine(partitionWaivers([stale], NOW));
  assert.match(line, /освобождений действует 0/u);
  assert.match(line, /просрочено 1/u, 'иначе «все просрочены» читалось бы как «их не было»');
});
