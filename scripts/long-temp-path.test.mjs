import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { makeLongTempDir } from './lib/long-temp-path.mjs';
import { envWithNonInteractiveGitEditor } from './lib/git-noninteractive-editor.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('ATF4-3: makeLongTempDir — абсолютный путь без ~1', () => {
  const dir = makeLongTempDir(root, 'atf4-test-');
  try {
    assert.match(dir, /scripts[\\/]+cache/u);
    assert.ok(!dir.includes('~1'), `короткий путь: ${dir}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ATF4-4: envWithNonInteractiveGitEditor ставит GIT_EDITOR=true', () => {
  const e = envWithNonInteractiveGitEditor({ PATH: '/x' });
  assert.equal(e.GIT_EDITOR, 'true');
  assert.equal(e.EDITOR, 'true');
  assert.equal(e.PATH, '/x');
  const kept = envWithNonInteractiveGitEditor({ GIT_EDITOR: 'vim' });
  assert.equal(kept.GIT_EDITOR, 'vim');
});
