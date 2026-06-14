import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import {
  collectTempDrafts,
  parseGitHubRemote,
  readBounded,
  resolveGitHubRepo,
} from './_daily-standup.mjs';

test('parseGitHubRemote: https and ssh', () => {
  assert.deepEqual(parseGitHubRemote('https://github.com/officefish/Membrana.git'), {
    owner: 'officefish',
    repo: 'Membrana',
  });
  assert.deepEqual(parseGitHubRemote('git@github.com:officefish/Membrana.git'), {
    owner: 'officefish',
    repo: 'Membrana',
  });
  assert.equal(parseGitHubRemote('https://gitlab.com/x/y'), null);
});

test('readBounded обрезает длинный текст', () => {
  const dir = mkdtempSync(join(tmpdir(), 'standup-'));
  const file = join(dir, 'big.txt');
  writeFileSync(file, 'x'.repeat(500));
  const out = readBounded(file, 100);
  assert.ok(out.includes('обрезано'));
  assert.ok(out.length < 200);
});

test('collectTempDrafts находит вложенные файлы', () => {
  const prev = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), 'standup-temp-'));
  const tempRoot = join(dir, 'packages', 'temp', 'fft');
  mkdirSync(tempRoot, { recursive: true });
  writeFileSync(join(tempRoot, 'Widget.tsx'), 'export const W = 1;\n');
  process.chdir(dir);
  try {
    const { fileCount, text } = collectTempDrafts({ full: false });
    assert.equal(fileCount, 1);
    assert.match(text, /Widget\.tsx/);
    assert.match(text, /export const W/);
  } finally {
    process.chdir(prev);
  }
});

test('resolveGitHubRepo из env', () => {
  const prevOwner = process.env.GITHUB_OWNER;
  const prevRepo = process.env.GITHUB_REPO;
  process.env.GITHUB_OWNER = 'test-owner';
  process.env.GITHUB_REPO = 'test-repo';
  try {
    assert.deepEqual(resolveGitHubRepo(), { owner: 'test-owner', repo: 'test-repo' });
  } finally {
    if (prevOwner === undefined) delete process.env.GITHUB_OWNER;
    else process.env.GITHUB_OWNER = prevOwner;
    if (prevRepo === undefined) delete process.env.GITHUB_REPO;
    else process.env.GITHUB_REPO = prevRepo;
  }
});
