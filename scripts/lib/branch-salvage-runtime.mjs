/**
 * Git/fs adapter for controlled branch salvage.
 */
import { execFile, execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000,
  }).trim();
}

export function fetchOrigin(cwd) {
  git(['fetch', '--prune', 'origin'], cwd);
}

export function loadJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

export function writeJsonAtomic(path, value) {
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  const temp = resolve(dirname(target), `.${basename(target)}.${process.pid}.tmp`);
  try {
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    renameSync(temp, target);
  } catch (error) {
    if (existsSync(temp)) rmSync(temp, { force: true });
    throw error;
  }
}

export function writeText(path, value) {
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value, 'utf8');
}

export function loadCurrentRefs(cwd) {
  const output = git(
    [
      'for-each-ref',
      '--format=%(refname)%00%(objectname)',
      'refs/heads',
      'refs/remotes/origin',
    ],
    cwd,
  );
  return new Map(
    output
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => line.split('\0')),
  );
}

export function listWorktrees(cwd) {
  const output = git(['worktree', 'list', '--porcelain'], cwd);
  const rows = [];
  let row = null;
  for (const line of output.split(/\r?\n/u)) {
    if (line.startsWith('worktree ')) {
      if (row) rows.push(row);
      row = { path: line.slice('worktree '.length).trim(), branch: '' };
    } else if (row && line.startsWith('branch refs/heads/')) {
      row.branch = line.slice('branch refs/heads/'.length).trim();
    }
  }
  if (row) rows.push(row);
  return rows;
}

export function heldBranches(cwd) {
  return new Set(listWorktrees(cwd).map((row) => row.branch).filter(Boolean));
}

export async function snapshotLiveTrees(cwd) {
  return Promise.all(
    listWorktrees(cwd).map(async ({ path }) => {
      if (!existsSync(path)) return { path, state: 'missing', porcelain: '' };
      try {
        const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
          cwd: path,
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
          timeout: 120_000,
        });
        return { path, state: 'ok', porcelain: String(stdout).trimEnd() };
      } catch (error) {
        return {
          path,
          state: 'error',
          error: String(error.message ?? error).split(/\r?\n/u)[0],
          porcelain: '',
        };
      }
    }),
  );
}

export function deleteRef(target, cwd) {
  if (target.action === 'delete-local-ref') {
    const name = target.ref.replace(/^refs\/heads\//u, '');
    git(['branch', '-D', '--', name], cwd);
    return;
  }
  if (target.action === 'delete-remote-ref') {
    const name = target.ref.replace(/^refs\/remotes\/origin\//u, '');
    git(['push', 'origin', '--delete', name], cwd);
    return;
  }
  throw new Error(`unsupported target action: ${target.action}`);
}
