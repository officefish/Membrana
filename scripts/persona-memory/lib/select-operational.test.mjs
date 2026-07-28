/**
 * Зубы P2+P3 (C2 DoD п.9 + C6 DoD п.2): pinned не вытесняется; expired раньше
 * active insight; ФИКСТУРА 27.07 — recency-only воспроизводит потерю, comparator
 * НЕТ; overflow — ошибка, не truncate; проекция читаема потребителями.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { projectMarkdown } from './project-markdown.mjs';
import {
  importanceLevel, isExpired, normalizeMeta, selectOperational,
} from './select-operational.mjs';

const NOW = '2026-07-28T12:00:00Z';
const mk = (id, cls, ts, extra = {}) => ({
  id, personaId: 'dynin', ts, provenance: `prov:${id}`, source: 's', kind: 'verbatim',
  text: 'x'.repeat(extra.size ?? 100), class: cls, ...extra,
});

// Фикстура 27.07: пять старых position мастерской + семь свежих routine дня.
const WORKSHOP = [1, 2, 3, 4, 5].map((i) => mk(`ws-${i}`, 'position', '2026-07-23T10:00:00Z'));
const DAILY = [1, 2, 3, 4, 5, 6, 7].map((i) => mk(`day-${i}`, 'routine', '2026-07-27T18:00:0' + i + 'Z'));

test('ФИКСТУРА 27.07: recency-only теряет мастерскую; comparator C2 — удерживает', () => {
  const budget = { limit: 800, nowIso: NOW }; // влезает 8 записей по 100
  // recency-only (антиобразец): сортировка только по свежести.
  const byRecency = [...WORKSHOP, ...DAILY].sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  const naiveRetained = byRecency.slice(0, 8).map((r) => r.id);
  assert.ok(WORKSHOP.some((w) => !naiveRetained.includes(w.id)), 'антиобразец: мастерская теряется при recency-only');

  const { retained, transferred } = selectOperational([...WORKSHOP, ...DAILY], null, budget);
  const ids = retained.map((r) => r.id);
  for (const w of WORKSHOP) assert.ok(ids.includes(w.id), `position ${w.id} удержана (класс выше рутины)`);
  assert.ok(transferred.every((t) => t.record.class === 'routine'), 'вытесняется только рутина');
  assert.ok(transferred.every((t) => t.reason === 'class_routine' || t.reason === 'expired_ttl'));
});

test('pinned не вытесняется под давлением; provenance-join importance', () => {
  const importance = { entries: { 'prov:ws-1': { level: 'pinned' } } };
  assert.equal(importanceLevel(importance, 'prov:ws-1'), 'pinned');
  assert.equal(importanceLevel(importance, 'prov:чужое'), 'normal');
  assert.equal(importanceLevel(null, 'prov:ws-1'), 'normal', 'нет файла — все normal');

  const tiny = { limit: 150, nowIso: NOW }; // место лишь на ~1 запись
  const { retained, report } = selectOperational([...WORKSHOP, ...DAILY], importance, tiny);
  assert.ok(retained.some((r) => r.id === 'ws-1'), 'pinned удержан при любом давлении');
  assert.equal(report.status, 'ok');
});

test('pinned overflow — fail-closed отчётом, не молчаливое усечение', () => {
  const importance = { entries: Object.fromEntries(WORKSHOP.map((w) => [w.provenance, { level: 'pinned' }])) };
  const { retained, report } = selectOperational(WORKSHOP, importance, { limit: 200, nowIso: NOW });
  assert.equal(report.status, 'pinned_overflow');
  assert.equal(retained.length, WORKSHOP.length, 'pinned не усечён');
  assert.equal(report.pinned.length, 5, 'список provenance в отчёте');
});

test('TTL: routine протухает по default 168h; insight — никогда авто', () => {
  const oldRoutine = mk('r-old', 'routine', '2026-07-10T00:00:00Z');
  const oldInsight = mk('i-old', 'insight', '2026-07-01T00:00:00Z');
  assert.equal(isExpired(oldRoutine, NOW), true);
  assert.equal(isExpired(oldInsight, NOW), false, 'авто-TTL важных классов запрещён');
  assert.equal(isExpired(mk('r-ttl', 'routine', '2026-07-27T00:00:00Z', { ttlUntil: '2026-07-27T06:00:00Z' }), NOW), true, 'явный ttlUntil уважается');

  const { transferred } = selectOperational([oldRoutine, oldInsight], null, { limit: 10_000, nowIso: NOW });
  const tr = transferred.find((t) => t.record.id === 'r-old');
  assert.equal(tr?.reason, 'expired_ttl');
  assert.ok(!transferred.some((t) => t.record.id === 'i-old'), 'старый insight в бюджете остаётся');
});

test('expired уходит раньше active insight; настройки по умолчанию честны', () => {
  assert.deepEqual(normalizeMeta({ id: 'x' }).class, 'routine');
  assert.deepEqual(normalizeMeta({ id: 'x' }).lifecycle, 'active');
});

test('проекция: путь/структура журнала сохранены, легенда говорит правду', () => {
  const { retained, report } = selectOperational([...WORKSHOP.slice(0, 2)], null, { limit: 10_000, nowIso: NOW });
  const md = projectMarkdown({ personaId: 'dynin', retained, report, archiveRel: 'docs/virtual-team/memory/archive/dynin.jsonl' });
  assert.ok(md.startsWith('# Журнал субъектного опыта — dynin'));
  assert.ok(md.includes('### 2026-07-23 · позиция ·'), 'формат записей потребителей сохранён');
  assert.ok(md.includes('importance.json ПРОВОДИТСЯ в отбор'), 'легенда обновлена (DoD C2 п.7)');
  assert.ok(md.includes('archive_from:'), 'meta проекции на месте');
});
