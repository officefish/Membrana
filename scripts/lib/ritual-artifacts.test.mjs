/**
 * Зуб автозабора артефактов ритуала (помеха №1, 28.07): только белый список,
 * чужое остаётся находкой leveling.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  classifyStatus,
  pathFromProduces,
  sweepDates,
  whitelistFromManifest,
} from './ritual-artifacts.mjs';

const MANIFEST = {
  steps: [
    { produces: ['docs/archive/daily-day/<date>/'] },
    { produces: ['docs/DAILY_CODE_REVIEW.md'] },
    { produces: ['отчёт в stdout', 'rag index'] },
    { produces: ['docs/seanses/team-memory-report-<дата>.md'] },
  ],
};

test('белый список из produces: пути с датой, без «отчёт в stdout»', () => {
  const w = whitelistFromManifest(MANIFEST, '2026-07-28');
  assert.ok(w.includes('docs/archive/daily-day/2026-07-28'));
  assert.ok(w.includes('docs/DAILY_CODE_REVIEW.md'));
  assert.ok(w.includes('docs/seanses/team-memory-report-2026-07-28.md'));
  assert.ok(!w.some((x) => x.includes('stdout') || x.includes('rag')));
});

test('classify: продукты цепочки и датированные протоколы забираются, чужое остаётся', () => {
  const w = whitelistFromManifest(MANIFEST, '2026-07-28');
  const porcelain = [
    '?? docs/archive/daily-day/2026-07-28/plan.md',
    ' M docs/DAILY_CODE_REVIEW.md',
    '?? docs/seanses/workspace-level-2026-07-28.md',
    '?? docs/bridge/2026-07-28/RECEIPT.md',
    ' M scripts/чужой-скрипт.mjs',
    '?? docs/HANDOFF.md',
  ].join('\n');
  const { take, leave } = classifyStatus(porcelain, w, '2026-07-28');
  assert.deepEqual(take.sort(), [
    'docs/DAILY_CODE_REVIEW.md',
    'docs/archive/daily-day/2026-07-28/plan.md',
    'docs/bridge/2026-07-28/RECEIPT.md',
    'docs/seanses/workspace-level-2026-07-28.md',
  ]);
  assert.deepEqual(leave.sort(), ['docs/HANDOFF.md', 'scripts/чужой-скрипт.mjs']);
});

test('вчерашние протоколы не забираются сегодняшним прогоном (дата в имени решает)', () => {
  const { take, leave } = classifyStatus('?? docs/seanses/team-evening-feedback-2026-07-27.md', [], '2026-07-28');
  assert.deepEqual(take, []);
  assert.equal(leave.length, 1);
});

test('пустой status — пустой план (честный no-op)', () => {
  assert.deepEqual(classifyStatus('', [], '2026-07-28'), { take: [], leave: [] });
});

// Помеха 29.07: утренняя цепочка спотыкалась о СВОИ артефакты — produces[] утреннего
// манифеста были пусты, белый список автозабора не брал ничего. Зуб держит наполнение.
test('утренний манифест даёт непустой белый список с ключевыми артефактами утра', async () => {
  const { readFileSync } = await import('node:fs');
  const manifest = JSON.parse(readFileSync(new URL('../../docs/tasks/morning-ritual-steps.json', import.meta.url), 'utf8'));
  const w = whitelistFromManifest(manifest, '2026-07-29');
  for (const must of ['docs/STRATEGY_DAY.md', 'docs/DAY_PLAN.md', 'docs/DAILY_STANDUP.md', 'docs/MAIN_DAY_ISSUE.md', 'docs/DAILY_CODE_REVIEW.md', 'docs/security/deps-watch-snapshot.json', 'docs/tasks/morning-gates-state.json']) {
    assert.ok(w.includes(must), `в белом списке утра нет ${must}`);
  }
});

// ── Щель между автозаборами, 29.08. Три утра подряд ведущая разгребала хвост руками;
// причин оказалось три, и лечатся они порознь. ────────────────────────────────────────

test('#2 путь ВНЕ docs/ больше не выбрасывается: SCRIPTS_LIST объявлен и обязан забираться', () => {
  // Отбор «оставить только docs/» молча терял scripts/registry/SCRIPTS_LIST.md — он объявлен
  // в produces вечера, но живёт не в docs/. Механизм был, и он смотрел не туда.
  const wl = whitelistFromManifest(
    { steps: [{ produces: ['scripts/registry/SCRIPTS_LIST.md', 'docs/DAY_PLAN.md'] }] },
    '2026-08-29',
  );
  assert.ok(wl.includes('scripts/registry/SCRIPTS_LIST.md'));
  assert.ok(wl.includes('docs/DAY_PLAN.md'));
});

test('#2 путь отличается от фразы по первой лексеме, а не по префиксу каталога', () => {
  assert.equal(pathFromProduces('docs/tasks/morning-gates-state.json — swallow.claimsProbe'), 'docs/tasks/morning-gates-state.json');
  assert.equal(pathFromProduces('scripts/registry/SCRIPTS_LIST.md'), 'scripts/registry/SCRIPTS_LIST.md');
  assert.equal(pathFromProduces('отчёт в stdout'), null);
  assert.equal(pathFromProduces('rag index'), null);
  assert.equal(pathFromProduces('коммит артефактов ритуала (git)'), null);
});

test('#2 плейсхолдер не про дату даёт префикс, а не буквальную строку «<id>»', () => {
  const wl = whitelistFromManifest({ steps: [{ produces: ['docs/void/<id>/'] }] }, '2026-08-29');
  assert.deepEqual(wl, ['docs/void']);
});

test('#3 окно забора: со вчера хвост вечера узнаётся своим', () => {
  const dates = sweepDates('2026-08-29', { includeYesterday: true });
  assert.deepEqual(dates, ['2026-08-29', '2026-08-28']);
  const wl = whitelistFromManifest(
    { steps: [{ produces: ['docs/virtual-team/memory/op-log', 'docs/archive/daily-day/<date>/'] }] },
    dates,
  );
  assert.ok(wl.includes('docs/archive/daily-day/2026-08-28'), 'вчерашний архив в списке');
  assert.ok(wl.includes('docs/archive/daily-day/2026-08-29'), 'сегодняшний тоже');
});

test('#3 БЕЗ флага окно прежнее — вчерашнее чужим и остаётся', () => {
  assert.deepEqual(sweepDates('2026-08-29'), ['2026-08-29']);
  const wl = whitelistFromManifest({ steps: [{ produces: ['docs/archive/daily-day/<date>/'] }] }, sweepDates('2026-08-29'));
  assert.ok(!wl.includes('docs/archive/daily-day/2026-08-28'));
});

test('#3 окно шире суток НЕ растёт: два дня — стык вечера и утра, дальше это git add -A', () => {
  assert.equal(sweepDates('2026-08-29', { includeYesterday: true }).length, 2);
});

test('ЖИВОЙ ХВОСТ 28.08: забирается весь, чужое остаётся чужим', () => {
  // Ровно тот git status, на котором ведущая вставала три утра подряд.
  const porcelain = [
    ' M docs/comms/sent-log.jsonl',
    '?? docs/comms/drafts/swallow-day-2026-08-28.md',
    '?? docs/virtual-team/memory/op-log/angelina/2026-08-28.jsonl',
    '?? docs/virtual-team/memory/op-log/vesnin/2026-08-28.jsonl',
    ' M scripts/registry/SCRIPTS_LIST.md',
    '?? apps/client/src/foreign.ts',
  ].join('\n');
  const dates = sweepDates('2026-08-29', { includeYesterday: true });
  const wl = whitelistFromManifest(
    {
      steps: [
        { produces: ['docs/virtual-team/memory', 'docs/virtual-team/memory/op-log', 'scripts/registry/SCRIPTS_LIST.md'] },
        { produces: ['docs/comms/drafts', 'docs/comms/sent-log.jsonl'] },
      ],
    },
    dates,
  );
  const { take, leave } = classifyStatus(porcelain, wl, dates);
  assert.equal(take.length, 5, `забрано: ${take.join(', ')}`);
  assert.deepEqual(leave, ['apps/client/src/foreign.ts'], 'чужое остаётся находкой leveling');
});

test('ЖИВЫЕ МАНИФЕСТЫ: продукты памяти персон и ласточки объявлены — иначе их никто не заберёт', async () => {
  const { readFileSync: rf } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const ev = JSON.parse(rf(fileURLToPath(new URL('../../docs/tasks/evening-ritual-steps.json', import.meta.url)), 'utf8'));
  const wl = whitelistFromManifest(ev, '2026-08-29');
  for (const need of ['docs/virtual-team/memory/op-log', 'docs/comms/drafts', 'docs/comms/sent-log.jsonl']) {
    assert.ok(wl.includes(need), `${need} обязан быть объявлен продуктом вечера`);
  }
});
