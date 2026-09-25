/**
 * Зуб персонального следа (DAY_MEMO блок 2): «сегодня без записей» видимой строкой,
 * гейт #569 взводится без протокола показа, вытеснения из готового отчёта.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PERSONAS,
  buildPersonaTraceLayer,
  displacementLine,
  journalEntriesOn,
  renderPersonaTrace,
} from './day-memo-persona-trace.mjs';

test('журнал: берутся только записи с датой = date, дословно', () => {
  const md = '# Память: x\n- 2026-07-27 · вчерашнее\n- 2026-07-28 · сегодняшнее решение\n- мусор без даты';
  assert.deepEqual(journalEntriesOn(md, '2026-07-28'), ['сегодняшнее решение']);
});

test('строка вытеснений персоны читается из team-memory-report; нет отчёта — null', () => {
  const report = '## dynin\n- записал в оперативку (9): …\n- утонуло в подсознание (10, v1 = ПОТЕРЯНО): a · b\n## farrell\n- утонуло в подсознание: ничего';
  assert.match(displacementLine(report, 'dynin'), /^утонуло в подсознание \(10/u);
  assert.match(displacementLine(report, 'farrell'), /ничего/u);
  assert.equal(displacementLine(null, 'dynin'), null);
});

test('персона без записей — ВИДИМАЯ строка «сегодня без записей», не пропуск блока', () => {
  const md = renderPersonaTrace([{ persona: 'farrell', entries: [], displaced: null }]);
  assert.match(md, /### farrell\n- сегодня без записей/u);
});

test('гейт #569: нет протокола показа → gated=true; слой только декларирует', () => {
  const files = { 'docs/virtual-team/memory/angelina.md': '- 2026-07-28 · решение дня' };
  for (const p of PERSONAS) files[`docs/virtual-team/memory/${p}.md`] ??= '# пусто';
  const r = buildPersonaTraceLayer('/repo', '2026-07-28', {
    readFile: (p) => files[p],
    exists: (p) => p in files,
  });
  assert.equal(r.stats.gated, true);
  assert.equal(r.stats.withEntries, 1);
});

// ── #2418: находка, которая срабатывает КАЖДЫЙ вечер, — не находка ────────────────
//
// КРАСНЫЙ ВХОД: `day-memo` стоит в вечерней цепочке раньше, чем `team-evening-feedback`
// рождает сегодняшний протокол. Значит `gated=true` на момент шага — ВСЕГДА. Через
// `problems` это давало exit 3, и журнал 17, 18, 21, 22.09 получил по непогашенному
// трению за то, что цепочка идёт в своём порядке (12 непогашенных из 16, амандментов 0).
test('#2418 gated=true НЕ попадает в problems — по построению порядка, а не по случаю', () => {
  // Вход чист по всему, кроме гейта: носители на месте, отчёт памяти приложен
  // (шаг team-memory-report стоит в цепочке раньше day-memo, так и бывает вечером).
  const files = { 'docs/seanses/team-memory-report-2026-07-28.md': 'отчёт' };
  for (const p of PERSONAS) files[`docs/virtual-team/memory/${p}.md`] = '# пусто';
  const r = buildPersonaTraceLayer('/repo', '2026-07-28', {
    readFile: (p) => files[p],
    exists: (p) => p in files,
  });
  assert.equal(r.stats.gated, true, 'состояние обязано остаться видимым');
  assert.deepEqual(
    r.problems.filter((x) => x.includes('#569')),
    [],
    'ожидаемое по построению состояние объявлено находкой — вечер краснеет каждый вечер',
  );
  assert.deepEqual(r.problems, [], 'кроме гейта у чистого входа проблем нет');
});

test('#2418 настоящая проблема слоя — отсутствие носителя памяти — в problems остаётся', () => {
  const files = { 'docs/virtual-team/memory/angelina.md': '# пусто' };
  const r = buildPersonaTraceLayer('/repo', '2026-07-28', {
    readFile: (p) => files[p],
    exists: (p) => p in files,
  });
  assert.ok(
    r.problems.some((x) => x.includes('без носителя памяти')),
    'глушить гейт — не значит глушить слой целиком',
  );
});

test('протокол показа есть → gated=false; восемь блоков всегда на месте', () => {
  const files = { 'docs/seanses/team-evening-feedback-2026-07-28.md': 'протокол' };
  for (const p of PERSONAS) files[`docs/virtual-team/memory/${p}.md`] = '# пусто';
  const r = buildPersonaTraceLayer('/repo', '2026-07-28', {
    readFile: (p) => files[p],
    exists: (p) => p in files,
  });
  assert.equal(r.stats.gated, false);
  assert.equal((r.markdown.match(/^### /gmu) ?? []).length, 8);
  assert.equal(r.stats.withoutEntries, 8);
});
