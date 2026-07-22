#!/usr/bin/env node
/**
 * yarn git:rebase-continue — `git rebase --continue` с GIT_EDITOR=true (#972).
 *
 * Usage: yarn git:rebase-continue [-- <git args…>]
 */

import { spawnSync } from 'node:child_process';

import { envWithNonInteractiveGitEditor } from './lib/git-noninteractive-editor.mjs';

const extra = process.argv.slice(2);
const dash = extra.indexOf('--');
const gitArgs = dash >= 0 ? extra.slice(dash + 1) : [];

const r = spawnSync('git', ['rebase', '--continue', ...gitArgs], {
  env: envWithNonInteractiveGitEditor(),
  stdio: 'inherit',
  shell: false,
});

process.exitCode = r.status === null ? 1 : r.status;
