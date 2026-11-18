import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { countUnpushed } from './unpushed-count.mjs';

// Зубы #2350 (дефект 3): «незапушенное» = коммиты ветки, которых нет ни в origin/<ветка>,
// ни в origin/main, ни в вершине PR. Настоящий git во временном каталоге: форма истории
// (squash, промотка на ствол) и есть предмет проверки, подставной git её бы не держал.

let dir;
const git = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function commit(msg) {
  writeFileSync(join(dir, `${msg}.txt`), msg);
  git(['add', '.']);
  git(['commit', '-q', '-m', msg]);
  return git(['rev-parse', 'HEAD']);
}

/** Прежний подсчёт repo-clean (до #2350) — для красного входа промотанной ветки. */
function legacyUnpushed(branch, prHeadOid) {
  try {
    return Number(git(['rev-list', '--count', `origin/${branch}..${branch}`]));
  } catch {
    /* нет origin-ветки */
  }
  return git(['rev-parse', branch]) === prHeadOid ? 0 : Number(git(['rev-list', '--count', `${prHeadOid}..${branch}`]));
}

const h = {};

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'membrana-unpushed-2350-'));
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.email', 't@example.invalid']);
  git(['config', 'user.name', 't']);
  git(['config', 'commit.gpgsign', 'false']);
  h.root = commit('root');

  // Ветка фичи: два коммита, PR = вершина b.
  git(['checkout', '-q', '-b', 'feat/x']);
  commit('a');
  h.prHead = commit('b');

  // Ствол: squash-коммит фичи + ещё два коммита после мерджа.
  git(['checkout', '-q', 'main']);
  git(['merge', '-q', '--squash', 'feat/x']);
  git(['commit', '-q', '-m', 'squash x (#1)']);
  commit('after-1');
  h.main = commit('after-2');
  git(['update-ref', 'refs/remotes/origin/main', h.main]);

  // 1) обычная влитая: ветка стоит на вершине PR, origin/<ветка> удалена.
  git(['branch', 'merged/plain', h.prHead]);
  // 2) промотанная на ствол: pr:ship перевёл ветку на origin/main после мерджа.
  git(['branch', 'merged/promoted', h.main]);
  // 3) реально незапушенная: поверх вершины PR — локальный коммит.
  git(['checkout', '-q', '-b', 'live/unpushed', h.prHead]);
  h.local = commit('local-only');
  // 3б) та же, но origin/<ветка> жив и стоит на вершине PR.
  git(['branch', 'live/remote', h.local]);
  git(['update-ref', 'refs/remotes/origin/live/remote', h.prHead]);
  git(['checkout', '-q', 'main']);
});

after(() => rmSync(dir, { recursive: true, force: true }));

test('обычная влитая (ветка = вершина PR, origin-ветки нет) → 0', () => {
  assert.equal(countUnpushed({ branch: 'merged/plain', prHeadOid: h.prHead, git }), 0);
});

test('промотанная на ствол после мерджа → 0 (прежний подсчёт давал >0)', () => {
  assert.ok(legacyUnpushed('merged/promoted', h.prHead) > 0, 'красный вход: старое правило считало коммиты ствола');
  assert.equal(countUnpushed({ branch: 'merged/promoted', prHeadOid: h.prHead, git }), 0);
});

test('реально незапушенная поверх PR → 1, дерево остаётся', () => {
  assert.equal(countUnpushed({ branch: 'live/unpushed', prHeadOid: h.prHead, git }), 1);
});

test('живая origin/<ветка> позади локальной → считает только неотправленное', () => {
  assert.equal(countUnpushed({ branch: 'live/remote', prHeadOid: null, git }), 1);
  git(['update-ref', 'refs/remotes/origin/live/remote', h.local]);
  assert.equal(countUnpushed({ branch: 'live/remote', prHeadOid: null, git }), 0);
});

test('без PR и без origin-ветки: против ствола честно (число, а не «хоть что-то» → 1)', () => {
  assert.equal(countUnpushed({ branch: 'merged/promoted', prHeadOid: null, git }), 0);
  // squash-ветка без PR: оба её коммита в стволе только как squash — снаружи их нет.
  assert.equal(countUnpushed({ branch: 'merged/plain', prHeadOid: null, git }), 2);
});

test('fail-closed: неизвестная вершина PR или ветка → 1', () => {
  assert.equal(countUnpushed({ branch: 'merged/plain', prHeadOid: 'f'.repeat(40), git }), 1);
  assert.equal(countUnpushed({ branch: 'no/such-branch', prHeadOid: h.prHead, git }), 1);
  assert.equal(countUnpushed({ branch: 'merged/plain', prHeadOid: h.prHead, git, base: 'origin/nope' }), 1);
});
