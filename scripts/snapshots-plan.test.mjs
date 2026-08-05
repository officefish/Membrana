/**
 * Зубы пересборки производных снимков (Ф1 санитарного пакета 30.07).
 *
 * Сторожат то, на чём 29.07 трижды спотыкались: снимок отстаёт от источника молча.
 * И отдельно — различение «находка» и «отказ»: путать их значит либо врать
 * «сломалось», либо прятать дефект.
 *
 * Проверяется в том числе ЖИВАЯ декларация, а не только фикстуры.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  checkable,
  declarationFindings,
  rebuildPlan,
  resultFindings,
  stepOutcome,
} from './lib/snapshots-plan.mjs';

const LIVE = JSON.parse(
  readFileSync(new URL('../docs/tooling-atlas/snapshots.json', import.meta.url), 'utf8'),
);

// ─── живая декларация ───────────────────────────────────────────────────────────

test('живая декларация честна: форма полна, у каждого «нет» есть причина', () => {
  assert.deepEqual(declarationFindings(LIVE), []);
});

// Проверяется НЕ-ПОТЕРЯ шести исторических, а не «ровно шесть»: декларация заведена
// затем, чтобы новый снимок был строкой в ней, а не правкой кода, — и равенство
// списков делало бы каждое законное пополнение красным зубом (поймано 05.08, когда
// пара `workflow-pages` вошла седьмой). Что список не пуст и форма честна — соседние зубы.
test('шесть снимков, найденных в дереве 30.07, из декларации не пропали', () => {
  const ids = new Set(LIVE.snapshots.map((s) => s.id));
  for (const id of ['cases', 'evidence', 'nominations', 'precedents', 'tasks-readme', 'tooling-atlas']) {
    assert.ok(ids.has(id), `снимок «${id}» пропал из декларации — пары не удаляют молча`);
  }
});

test('снимки, у которых проверки нет, названы поимённо и с причиной', () => {
  const без = LIVE.snapshots.filter((s) => !s.checkCmd);
  assert.ok(без.length > 0, 'если проверки есть у всех — тест устарел, обновить');
  for (const s of без) {
    assert.ok(String(s.checkNote ?? '').trim().length > 10, `${s.id}: причина отсутствия проверки не названа`);
  }
});

test('кейсы и номинации схлопнуты в один проход — дважды не гоняем', () => {
  const plan = rebuildPlan(LIVE);
  const step = plan.find((p) => p.ids.includes('cases'));
  assert.ok(step.ids.includes('nominations'), 'номинации пересобираются тем же проходом');
  assert.equal(plan.length, LIVE.snapshots.length - 1, 'кейсы и номинации делят проход — проходов на один меньше, чем снимков');
});

// ─── форма декларации ───────────────────────────────────────────────────────────

test('неполная запись ловится поимённо по полю', () => {
  const f = declarationFindings({ snapshots: [{ id: 'x', snapshot: 'a.md' }] });
  assert.ok(f.some((x) => x.where === 'x.source'));
  assert.ok(f.some((x) => x.where === 'x.rebuildCmd'));
});

test('снимок без проверки и без причины — находка, а не молчание', () => {
  const f = declarationFindings({ snapshots: [{ id: 'y', snapshot: 'a', source: 'b', rebuildCmd: ['x'] }] });
  assert.equal(f.length, 1);
  assert.equal(f[0].where, 'y.checkCmd');
  assert.match(f[0].reason, /checkNote/u);
});

test('дубль id ловится', () => {
  const one = { id: 'z', snapshot: 'a', source: 'b', rebuildCmd: ['x'], checkCmd: ['c'] };
  const f = declarationFindings({ snapshots: [one, one] });
  assert.ok(f.some((x) => /дважды/u.test(x.reason)));
});

test('нечитаемая декларация — одна находка, не падение', () => {
  const f = declarationFindings(null);
  assert.equal(f.length, 1);
  assert.equal(f[0].toothId, 'snapshots_shape');
});

// ─── находка против отказа ──────────────────────────────────────────────────────

test('успех — пересобрано', () => {
  assert.equal(stepOutcome({ findingsExit: false }, true, ''), 'rebuilt');
});

test('ненулевой код у инструмента с семантикой находок — пересобрано С НАХОДКАМИ', () => {
  const out = 'precedent:register --rebuild → снимок пересобран (20 записей, дефектных 1).';
  assert.equal(stepOutcome({ findingsExit: true }, false, out), 'rebuilt_with_findings');
});

test('ненулевой код без признака пересборки — отказ, даже у такого инструмента', () => {
  assert.equal(stepOutcome({ findingsExit: true }, false, 'ENOENT: файла нет'), 'failed');
});

test('ненулевой код у обычного инструмента — отказ, находкой не прикрывается', () => {
  const out = 'снимок пересобран, но код 1';
  assert.equal(stepOutcome({ findingsExit: false }, false, out), 'failed');
});

// ─── проверка дрейфа ────────────────────────────────────────────────────────────

test('проверяемых снимков ровно столько, сколько объявлено с checkCmd', () => {
  assert.equal(checkable(LIVE).length, LIVE.snapshots.filter((s) => Array.isArray(s.checkCmd)).length);
});

test('отставший снимок называется ИМЕНЕМ СНИМКА, а не «команда упала»', () => {
  const f = resultFindings([{ id: 'cases', ok: false, detail: 'снимок отстал от файлов' }]);
  assert.equal(f.length, 1);
  assert.equal(f[0].toothId, 'snapshot_stale');
  assert.equal(f[0].where, 'cases');
  assert.match(f[0].reason, /отстал/u);
});

test('успешные проверки находок не дают', () => {
  assert.deepEqual(resultFindings([{ id: 'a', ok: true }, { id: 'b', ok: true }]), []);
});
