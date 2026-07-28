/**
 * Зубы P5/P5b (C6 DoD п.3): day-zero воспроизводим, backfill окна с различимым
 * provenance, дедуп по id, разбор живого формата журнала.
 */
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { readArchive } from './archive-append.mjs';
import { backfillWindow, dayZeroSnapshot, parseJournalMd } from './migrate.mjs';

const MD_TODAY = [
  '# Журнал субъектного опыта — dynin (Математик)',
  '',
  '### 2026-07-27 · позиция · bridge-command-post-m0-order',
  '',
  '> Предикат ребра фиксирую как в leveling/channels M0.',
  '',
  '— источник: `docs/seanses/bridge-command-post-m0-order-2026-07-27.md#reply-1`',
  '',
].join('\n');

const MD_OLD = [
  '# Журнал субъектного опыта — dynin (Математик)',
  '',
  '### 2026-07-23 · позиция · tasks-workshop-m2-set',
  '',
  '> Предикат множества карточек.',
  '',
  '— источник: `docs/seanses/tasks-workshop-m2-set-2026-07-23.md#reply-3`',
  '',
  '### 2026-07-27 · позиция · bridge-command-post-m0-order',
  '',
  '> Предикат ребра фиксирую как в leveling/channels M0.',
  '',
  '— источник: `docs/seanses/bridge-command-post-m0-order-2026-07-27.md#reply-1`',
  '',
].join('\n');

test('parseJournalMd: живой формат разбирается — дата/класс/slug/цитата/источник', () => {
  const e = parseJournalMd(MD_TODAY, 'dynin');
  assert.equal(e.length, 1);
  assert.equal(e[0].class, 'position');
  assert.equal(e[0].id, 'dynin-2026-07-27-bridge-command-post-m0-order');
  assert.ok(e[0].provenance.includes('#reply-1'));
});

test('day-zero: снапшот в архив с source=migration-snapshot; повтор — дедуп', () => {
  const root = mkdtempSync(join(tmpdir(), 'migrate-'));
  const r1 = dayZeroSnapshot(root, 'dynin', MD_TODAY);
  assert.deepEqual([r1.appended, r1.skipped, r1.problems.length], [1, 0, 0]);
  const r2 = dayZeroSnapshot(root, 'dynin', MD_TODAY);
  assert.deepEqual([r2.appended, r2.skipped], [0, 1], 'воспроизводимость: второй прогон — no-op');
  const { records } = readArchive(root, 'dynin');
  assert.equal(records[0].source, 'migration-snapshot');
});

test('backfill: вытесненное окно восстанавливается с git-restore@sha, дедуп против архива', () => {
  const root = mkdtempSync(join(tmpdir(), 'migrate-'));
  dayZeroSnapshot(root, 'dynin', MD_TODAY);
  const r = backfillWindow(root, 'dynin', {
    before: '2026-07-27T00:00:00',
    gitSha: () => 'abcdef1234567890',
    gitShow: () => MD_OLD,
  });
  assert.deepEqual([r.appended, r.skipped, r.problems.length], [1, 1, 0], 'вернулась только потерянная, живая — дедуп');
  const { records } = readArchive(root, 'dynin');
  const restored = records.find((x) => x.id.includes('tasks-workshop'));
  assert.equal(restored.source, 'git-restore@abcdef123456', 'provenance миграции различим (C6)');
  assert.equal(restored.provenance.includes('#reply-3'), true, 'реальный указатель сохранён');
});

test('backfill без коммита-базы — честный отказ, не пустой успех', () => {
  const root = mkdtempSync(join(tmpdir(), 'migrate-'));
  const r = backfillWindow(root, 'dynin', { before: '2020-01-01', gitSha: () => null, gitShow: () => null });
  assert.equal(r.appended, 0);
  assert.ok(r.problems[0].includes('нет коммита'));
});
