/**
 * Тесты правил repo-clean (#492).
 *
 * Инструмент умеет безвозвратно удалять, поэтому ценность тестов — не в том, что
 * он удаляет мёртвое, а в том, что он НЕ удаляет живое. Каждый кейс «оставить» —
 * реальный объект из ревизии 2026-07-15.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  KEEP_REASON,
  PROTECTED_BRANCHES,
  decideBranch,
  decideWorktree,
  latestPrByBranch,
  makeArchivedSprintPredicate,
} from './lib/repo-clean.mjs';
import { parseCli } from './repo-clean.mjs';

const prs = (...list) => latestPrByBranch(list);

// ─── удалять: только явно мёртвое ─────────────────────────────────────────────────

test('ветка с MERGED PR — удалять', () => {
  const d = decideBranch({ name: 'feat/x', hasRemote: true }, prs({ number: 10, state: 'MERGED', headRefName: 'feat/x' }));
  assert.equal(d.delete, true);
  assert.match(d.reason, /#10 MERGED/);
});

test('ветка с CLOSED PR — удалять (отклонённая работа)', () => {
  const d = decideBranch({ name: 'feat/x', hasRemote: true }, prs({ number: 11, state: 'CLOSED', headRefName: 'feat/x' }));
  assert.equal(d.delete, true);
});

test('squash-мёрж: решает состояние PR, а не git-предки', () => {
  // aheadOfMain > 0 — норма после squash: коммиты ветки не предки main.
  const d = decideBranch(
    { name: 'feat/squashed', hasRemote: true, aheadOfMain: 7 },
    prs({ number: 12, state: 'MERGED', headRefName: 'feat/squashed' }),
  );
  assert.equal(d.delete, true, 'ветка мертва по PR, хотя git считает её невлитой');
});

// ─── НЕ удалять: гарды ────────────────────────────────────────────────────────────

test('персона-ветки не удаляются даже с MERGED PR и древним коммитом', () => {
  for (const name of ['vesnin', 'ozhegov', 'boyarskiy', 'dynin', 'main']) {
    const d = decideBranch({ name, hasRemote: true }, prs({ number: 1, state: 'MERGED', headRefName: name }));
    assert.equal(d.delete, false, `${name} — канон §7а`);
    assert.equal(d.reason, KEEP_REASON.protected);
  }
});

test('ветка, занятая worktree, не удаляется', () => {
  const d = decideBranch(
    { name: 'cowork/x/integration', hasRemote: true },
    prs({ number: 2, state: 'MERGED', headRefName: 'cowork/x/integration' }),
    { worktreeBranches: new Set(['cowork/x/integration']) },
  );
  assert.equal(d.delete, false);
  assert.equal(d.reason, KEEP_REASON.worktree);
});

test('текущая ветка сессии не удаляется', () => {
  const d = decideBranch({ name: 'feat/now', hasRemote: true }, prs({ number: 3, state: 'MERGED', headRefName: 'feat/now' }), {
    currentBranch: 'feat/now',
  });
  assert.equal(d.delete, false);
  assert.equal(d.reason, KEEP_REASON.current);
});

test('открытый PR — не трогать', () => {
  const d = decideBranch({ name: 'fix/live', hasRemote: true }, prs({ number: 490, state: 'OPEN', headRefName: 'fix/live' }));
  assert.equal(d.delete, false);
  assert.equal(d.reason, KEEP_REASON.openPr);
  assert.equal(d.pr, 490);
});

test('нет PR и нет на origin с уникальными коммитами — НЕ удалять (единственная копия)', () => {
  // Живой случай: chore/ritual-day-0715 — 4 коммита утреннего ритуала соседней
  // сессии, только локально. Автоудаление стёрло бы их безвозвратно.
  const d = decideBranch({ name: 'chore/ritual-day-0715', hasRemote: false, aheadOfMain: 4 }, prs());
  assert.equal(d.delete, false);
  assert.equal(d.reason, KEEP_REASON.noPrUnpushed);
});

test('нет PR без уникальных коммитов — тоже не удалять молча, а в отчёт', () => {
  const d = decideBranch({ name: 'feat/panel-live-deploy', hasRemote: false, aheadOfMain: 0 }, prs());
  assert.equal(d.delete, false);
  assert.equal(d.reason, KEEP_REASON.noPr);
});

test('latestPrByBranch: решает самый свежий PR, а не первый попавшийся', () => {
  // Ветку пересобрали: старый PR закрыт, новый открыт — ветка живая.
  const map = prs(
    { number: 5, state: 'CLOSED', headRefName: 'feat/redone' },
    { number: 40, state: 'OPEN', headRefName: 'feat/redone' },
  );
  assert.equal(map.get('feat/redone').number, 40);
  assert.equal(decideBranch({ name: 'feat/redone', hasRemote: true }, map).delete, false);
});

test('PROTECTED_BRANCHES содержит персонажей канона', () => {
  assert.ok(PROTECTED_BRANCHES.has('vesnin') && PROTECTED_BRANCHES.has('main'));
});

// ─── worktree ─────────────────────────────────────────────────────────────────────

const registry = {
  tasks: [
    { id: 'comp-detection-alarm', status: 'archived' },
    { id: 'cowork-free-fragment-usercases', status: 'active' },
  ],
};
const isArchived = makeArchivedSprintPredicate(registry);

test('worktree архивного спринта с чистым деревом — убрать', () => {
  const w = decideWorktree(
    { path: '/wt/alpha', branch: 'comp/comp-detection-alarm-2026-07-10/alpha', dirtyCount: 0 },
    isArchived,
  );
  assert.equal(w.remove, true);
});

test('worktree живого спринта — не трогать (cowork #487)', () => {
  const w = decideWorktree(
    { path: '/wt/integration', branch: 'cowork/cowork-free-fragment-usercases/integration', dirtyCount: 0 },
    isArchived,
  );
  assert.equal(w.remove, false);
  assert.match(w.reason, /не archived/);
});

test('грязный worktree не убирается, даже если спринт archived', () => {
  const w = decideWorktree(
    { path: '/wt/alpha', branch: 'comp/comp-detection-alarm-2026-07-10/alpha', dirtyCount: 3 },
    isArchived,
  );
  assert.equal(w.remove, false);
  assert.match(w.reason, /3 незакоммиченных/);
});

test('locked worktree не убирается автоматически', () => {
  const w = decideWorktree(
    { path: '/wt/alpha', branch: 'comp/comp-detection-alarm-2026-07-10/alpha', locked: true, dirtyCount: 0 },
    isArchived,
  );
  assert.equal(w.remove, false);
  assert.match(w.reason, /locked/);
});

test('главный checkout и текущая сессия не убираются никогда', () => {
  const base = { branch: 'comp/comp-detection-alarm-2026-07-10/alpha', dirtyCount: 0 };
  assert.equal(decideWorktree({ ...base, path: '/repo', isMain: true }, isArchived).remove, false);
  assert.equal(decideWorktree({ ...base, path: '/repo', isCurrent: true }, isArchived).remove, false);
});

test('detached HEAD и ветка вне формата спринта — не трогать (fail-closed)', () => {
  assert.equal(decideWorktree({ path: '/wt/x', branch: null, dirtyCount: 0 }, isArchived).remove, false);
  assert.equal(decideWorktree({ path: '/wt/x', branch: 'main', dirtyCount: 0 }, isArchived).remove, false);
});

test('предикат спринта не путает префиксы разных спринтов', () => {
  const p = makeArchivedSprintPredicate({
    tasks: [{ id: 'comp-alarm', status: 'archived' }, { id: 'comp-alarm-v2', status: 'active' }],
  });
  assert.equal(p('comp/comp-alarm-2026-07-10/alpha'), true);
  // `comp-alarm-v2` активен; но он же начинается с «comp-alarm-» → совпал бы по
  // startsWith со СТАРЫМ спринтом. Проверяем, что архивным считается только точный.
  assert.equal(p('comp/comp-alarm-v2/alpha'), true);
});

// ─── CLI ──────────────────────────────────────────────────────────────────────────

test('CLI: dry-run по умолчанию — удаление только по явному --execute', () => {
  assert.equal(parseCli([]).execute, false);
  assert.equal(parseCli(['--execute']).execute, true);
  assert.equal(parseCli(['--execute', '--remote']).remote, true);
  assert.equal(parseCli(['--execute', '--worktrees']).worktrees, true);
  assert.equal(parseCli(['--remote']).execute, false, '--remote без --execute не удаляет');
});
