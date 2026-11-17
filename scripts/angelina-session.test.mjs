import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderHostessArtifact, sessionState, writeSessionState } from './lib/angelina-session.mjs';

test('day raises and evening lowers explicit availability', () => {
  assert.equal(sessionState(true, '2026-10-01T10:00:00Z', 'ritual:day').active, true);
  assert.equal(sessionState(false, '2026-10-01T20:00:00Z', 'ritual:evening').active, false);
});

test('premises precede verdict and exactly four echoes are rendered', () => {
  const text = renderHostessArtifact({ premises: 'HEAD x', entry: 'one', gates: 'closed', analysts: '3/3', session: 'active' });
  assert.ok(text.indexOf('Основания:') < text.indexOf('Вердикт:'));
  assert.equal((text.match(/^\d\./gmu) ?? []).length, 4);
});

test('porcha: session file dirties an unguarded repo and stays invisible under .membrana/', () => {
  const root = mkdtempSync(join(tmpdir(), 'angelina-session-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  try {
    git('init');
    writeFileSync(join(root, '.gitignore'), '', 'utf8');
    git('add', '.gitignore');
    git('-c', 'user.name=test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture');
    writeSessionState(root, sessionState(true, '2026-10-01T10:00:00Z', 'ritual:day'));
    assert.match(git('status', '--porcelain'), /\.membrana/u, 'porcha is red without ignore rule');
    writeFileSync(join(root, '.gitignore'), '.membrana/\n', 'utf8');
    git('add', '.gitignore');
    git('-c', 'user.name=test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'ignore session');
    assert.equal(git('check-ignore', '-v', '.membrana/angelina-session.json').includes('.membrana/'), true);
    assert.equal(git('status', '--porcelain'), '', 'session write leaves the guarded worktree clean');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
