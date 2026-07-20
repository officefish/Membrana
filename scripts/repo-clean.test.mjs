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
} from './lib/repo-clean.mjs';
import { createReporter, parseCli } from './repo-clean.mjs';

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

// ─── worktree: гарды исполнения поверх classifyWorktree (K2, #717) ────────────────

const closed = { class: 'sprint-closed', reasons: ['PR #700 MERGED, дерево чистое — кандидат к сносу'] };

test('sprint-closed без гардов — убрать, причина = provenance классификатора', () => {
  const w = decideWorktree({ path: '/wt/alpha', branch: 'comp/x/alpha' }, closed);
  assert.equal(w.remove, true);
  assert.match(w.reason, /#700 MERGED/);
});

test('canon / sprint-open / unregistered / unknown — не убирать', () => {
  for (const cls of ['canon', 'sprint-open', 'unregistered', 'unknown']) {
    const w = decideWorktree(
      { path: '/wt/x', branch: 'feat/x' },
      { class: cls, reasons: ['причина'] },
    );
    assert.equal(w.remove, false, cls);
    assert.match(w.reason, new RegExp(cls), 'класс виден в причине');
  }
});

test('locked worktree не убирается даже при sprint-closed', () => {
  const w = decideWorktree({ path: '/wt/alpha', branch: 'comp/x/alpha', locked: true }, closed);
  assert.equal(w.remove, false);
  assert.match(w.reason, /locked/);
});

test('главный checkout и текущая сессия не убираются никогда', () => {
  assert.equal(decideWorktree({ path: '/repo', branch: 'x', isMain: true }, closed).remove, false);
  assert.equal(decideWorktree({ path: '/repo', branch: 'x', isCurrent: true }, closed).remove, false);
});

test('базовые ветки канона base/* защищены от чистки', () => {
  const d = decideBranch(
    { name: 'base/tooling', hasRemote: false },
    prs({ number: 1, state: 'MERGED', headRefName: 'base/tooling' }),
  );
  assert.equal(d.delete, false);
  assert.equal(d.reason, KEEP_REASON.protected);
});

// ─── CLI ──────────────────────────────────────────────────────────────────────────

test('CLI: dry-run по умолчанию — удаление только по явному --execute', () => {
  assert.equal(parseCli([]).execute, false);
  assert.equal(parseCli(['--execute']).execute, true);
  assert.equal(parseCli(['--execute', '--remote']).remote, true);
  assert.equal(parseCli(['--execute', '--worktrees']).worktrees, true);
  assert.equal(parseCli(['--remote']).execute, false, '--remote без --execute не удаляет');
});

test('CLI: --report берёт путь следующим аргументом', () => {
  assert.equal(parseCli([]).report, null);
  assert.equal(parseCli(['--report', 'clean.txt']).report, 'clean.txt');
  assert.equal(parseCli(['--execute', '--report', 'out/clean.txt']).report, 'out/clean.txt');
  // --report без пути — не путь, а undefined: писать в файл «undefined» нельзя.
  assert.equal(parseCli(['--report']).report, undefined);
});

test('createReporter копит строки и печатает; stderr тоже попадает в отчёт', () => {
  const logs = [];
  const errs = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (t) => logs.push(t);
  console.error = (t) => errs.push(t);
  try {
    const out = createReporter();
    out.log('строка');
    out.error('ошибка');
    // Ошибка обязана быть в файле: из-за её потери под пайпом флаг и появился.
    assert.deepEqual(out.lines, ['строка', 'ошибка']);
    assert.deepEqual(logs, ['строка']);
    assert.deepEqual(errs, ['ошибка']);
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
});
