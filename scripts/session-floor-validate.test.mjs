/**
 * Зубы валидации уровня 1 (§6 контракта `workshop-wires`).
 *
 * Прогон: `node --test scripts/session-floor-validate.test.mjs`
 */

import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEGRADE_KINDS,
  FLOOR_HEALTH,
  SECOND_LEVEL_STALE_DAYS,
  renderHealth,
  secondLevelState,
  validateFloor,
} from './lib/session-floor-validate.mjs';
import { buildFloor } from './lib/session-floor.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = '2026-07-31T12:00:00Z';

/** Здоровый пол-макет. */
const floor = (over = {}) => ({
  workshops: [{ home: 'scripts', entryVerb: 'yarn scripts:orphans', valid: true }],
  registryState: 'ok',
  registryProblems: [],
  stamps: { local: '2026-07-31' },
  secondLevelAt: NOW,
  ...over,
});

test('два исхода и ни одного третьего', () => {
  assert.deepEqual(Object.values(FLOOR_HEALTH), ['ok', 'degraded']);
  assert.equal(validateFloor(floor(), { now: NOW }).health, FLOOR_HEALTH.OK);
});

test('битый манифест деградирует выдачу, но мастерская остаётся в ней', () => {
  const f = floor({ workshops: [{ home: 'docs/x', entryVerb: 'yarn x', valid: false }] });
  const r = validateFloor(f, { now: NOW });
  assert.equal(r.health, FLOOR_HEALTH.DEGRADED);
  assert.equal(r.reasons[0].kind, DEGRADE_KINDS.MANIFEST);
  assert.match(r.reasons[0].text, /docs\/x/u, 'дом назван поимённо');
  // Убрать её из выдачи значило бы спрятать дом за испорченный паспорт — и сессия пошла бы
  // грепать туда, куда есть законная дверь.
  assert.equal(f.workshops.length, 1);
});

test('нечитаемый реестр — деградация с причиной, а не молчание', () => {
  const r = validateFloor(floor({ registryState: 'invalid', registryProblems: ['schema=(нет)'] }), { now: NOW });
  assert.equal(r.health, FLOOR_HEALTH.DEGRADED);
  assert.match(r.reasons[0].text, /schema=\(нет\)/u);
  // Причина не названа — так и печатается, а не подставляется правдоподобная.
  const blank = validateFloor(floor({ registryState: 'unreadable', registryProblems: [] }), { now: NOW });
  assert.match(blank.reasons[0].text, /причина не названа/u);
});

test('пустая проекция — не «чисто», а пустая проекция', () => {
  const r = validateFloor(floor({ workshops: [] }), { now: NOW });
  assert.equal(r.health, FLOOR_HEALTH.DEGRADED);
  assert.ok(r.reasons.some((x) => x.kind === DEGRADE_KINDS.PROJECTION));
  assert.match(r.reasons.find((x) => x.kind === DEGRADE_KINDS.PROJECTION).text, /проекция пуста, а не дерево/u);
});

test('прочерк у одной мастерской законен, у всех — подозрение на непрочитанные манифесты', () => {
  const one = validateFloor(floor({
    workshops: [{ home: 'a', entryVerb: null, valid: true }, { home: 'b', entryVerb: 'yarn b', valid: true }],
  }), { now: NOW });
  assert.equal(one.health, FLOOR_HEALTH.OK, 'честный прочерк деградацией не является');

  const all = validateFloor(floor({ workshops: [{ home: 'a', entryVerb: null, valid: true }] }), { now: NOW });
  assert.equal(all.health, FLOOR_HEALTH.DEGRADED);
  assert.match(all.reasons[0].text, /не прочитались манифесты/u);
});

test('нет штампов — не заявляем состояние origin', () => {
  const r = validateFloor(floor({ stamps: null }), { now: NOW });
  assert.equal(r.health, FLOOR_HEALTH.DEGRADED);
  assert.match(r.reasons[0].text, /не наблюдалось и не заявляется/u);
});

// ── Второй уровень ────────────────────────────────────────────────────────────────────────

test('второй уровень: «неизвестно» ≠ «просрочен»', () => {
  // Процедура могла ни разу не прогоняться; объявлять её просроченной значит обвинять
  // за несделанное первое.
  assert.equal(secondLevelState(null, NOW), 'неизвестно');
  assert.equal(secondLevelState('вчера', NOW), 'неизвестно');
  assert.equal(secondLevelState(NOW, null), 'неизвестно', 'без момента проверки вывода нет');
});

test('второй уровень: граница недели', () => {
  const day = 24 * 60 * 60 * 1000;
  const fresh = new Date(Date.parse(NOW) - SECOND_LEVEL_STALE_DAYS * day).toISOString();
  assert.equal(secondLevelState(fresh, NOW), 'свеж', 'ровно неделя — ещё не просрочка');
  const stale = new Date(Date.parse(NOW) - (SECOND_LEVEL_STALE_DAYS + 1) * day).toISOString();
  assert.equal(secondLevelState(stale, NOW), 'просрочен');
});

// ── Отчёт ─────────────────────────────────────────────────────────────────────────────────

test('полоса DEGRADED идёт ПЕРВОЙ строкой', () => {
  const lines = renderHealth(validateFloor(floor({ registryState: 'absent', registryProblems: ['реестра нет'] }), { now: NOW }));
  assert.match(lines[0], /^DEGRADED/u, 'читатель узнаёт о неполноте до того, как поверит содержимому');
  assert.ok(lines.some((l) => /автопочинки нет/u.test(l)));
  assert.ok(lines.some((l) => /не блокируется/u.test(l)));
});

test('здоровый пол печатается одной строкой со вторым уровнем', () => {
  const lines = renderHealth(validateFloor(floor(), { now: NOW }));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /инвентарь: ok · второй уровень: свеж/u);
});

test('живое дерево проходит уровень 1 без выдуманных штампов', () => {
  const live = buildFloor(repoRoot, { stamps: { local: 'есть' } });
  const r = validateFloor(live, { now: NOW });
  // Реестр пуст, но валиден; мастерские читаются — деградации быть не должно.
  assert.equal(r.health, FLOOR_HEALTH.OK, JSON.stringify(r.reasons));
});
