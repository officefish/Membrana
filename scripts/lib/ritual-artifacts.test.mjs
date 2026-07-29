/**
 * Зуб автозабора артефактов ритуала (помеха №1, 28.07): только белый список,
 * чужое остаётся находкой leveling.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { classifyStatus, whitelistFromManifest } from './ritual-artifacts.mjs';

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
