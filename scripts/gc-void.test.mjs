/**
 * Тесты GC (M5-GC angelina-hostess). Чистые; даты снаружи (без Date.now).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { isDead, isStale, epitaph, recentVoidIds, gcReport, STALE_DAYS, VOID_DIR } from './lib/gc-void.mjs';

test('isDead: rejected ∧ verdictClosed; ни одно поодиночке не приговаривает', () => {
  assert.equal(isDead({ status: 'rejected', verdictClosed: true }), true);
  assert.equal(isDead({ status: 'rejected', verdictClosed: false }), false, 'приговор без закрытого вердикта — GC не судит');
  assert.equal(isDead({ status: 'active', verdictClosed: true }), false);
});

test('isStale: старит штраф по дате вердикта, не по часам', () => {
  assert.equal(isStale({ rejectedAt: '2026-04-01' }, '2026-07-21'), true, `> ${STALE_DAYS} дней`);
  assert.equal(isStale({ rejectedAt: '2026-07-01' }, '2026-07-21'), false);
  assert.equal(isStale({}, '2026-07-21'), false, 'нет даты — не истёк (честная неизвестность)');
});

test('epitaph: несёт кто/за что/когда и предупреждение первой шапкой', () => {
  const e = epitaph({ verdict: 'M5', rejectedReason: 'заменён', rejectedAt: '2026-07-21', rejectedBy: 'owner' });
  assert.match(e, /^---\nstatus: rejected/u);
  assert.match(e, /этот путь МЁРТВ/u);
});

test('recentVoidIds: свежие штрафуются, ghost — нет', () => {
  const ids = recentVoidIds([
    { id: 'fresh', rejectedAt: '2026-07-01' },
    { id: 'ghost', rejectedAt: '2026-01-01' },
  ], '2026-07-21');
  assert.equal(ids.has('fresh'), true);
  assert.equal(ids.has('ghost'), false);
});

test('gcReport: шумный — «перенесено 0» тоже печатается', () => {
  assert.match(gcReport([], '2026-07-21'), /перенесено 0/u);
  assert.match(gcReport([{ id: 'x', rejectedAt: '2026-07-20' }], '2026-07-21'), /† x .*recent_void_penalty/u);
});

test('БАРЬЕР CI: активных ссылок на docs/void/ извне нет (grep-инвариант)', () => {
  // Сканируем docs-корни на ссылки в void; сам void, gc-механика и этот тест — исключены.
  const root = process.cwd();
  const offenders = [];
  const scan = (rel) => {
    const dir = join(root, rel);
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (entry.endsWith('.md') && !p.includes('void')) {
        const text = readFileSync(p, 'utf8');
        if (text.includes('docs/void/') && !text.includes('M5-GC')) offenders.push(rel + '/' + entry);
      }
    }
  };
  scan('docs');
  assert.deepEqual(offenders, [], 'живой документ ссылается в void — возрождение мёртвого пути');
});
