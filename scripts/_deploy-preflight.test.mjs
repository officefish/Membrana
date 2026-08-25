import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { deployPreflight } from './_deploy-preflight.mjs';

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function tempGitRepo() {
  const root = mkdtempSync(join(tmpdir(), 'deploy-preflight-'));
  const remote = mkdtempSync(join(tmpdir(), 'deploy-preflight-remote-'));
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.invalid']);
  git(root, ['config', 'user.name', 'Deploy Preflight Test']);
  git(remote, ['init', '--bare']);
  mkdirSync(join(root, 'packages/background-cabinet/src'), { recursive: true });
  mkdirSync(join(root, 'docs/procedure-runs/trail'), { recursive: true });
  writeFileSync(join(root, 'packages/background-cabinet/src/index.ts'), 'export const ok = true;\n');
  writeFileSync(join(root, 'docs/procedure-runs/trail/.keep'), '');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'init']);
  git(root, ['remote', 'add', 'origin', remote]);
  git(root, ['push', '-u', 'origin', 'main']);
  return root;
}

const refuse = (code) => {
  const err = new Error(`exit:${code}`);
  err.code = code;
  throw err;
};

const context = ['packages/background-cabinet'];

test('deployPreflight: файл вне build context не блокирует DR0', () => {
  const root = tempGitRepo();
  writeFileSync(join(root, 'docs/procedure-runs/trail/2026-08-23.jsonl'), '{}\n');
  const res = deployPreflight({ branch: 'main', cwd: root, buildContextPaths: context, exit: refuse });
  assert.equal(res.clean, true);
  assert.equal(res.dirtyLines.length, 0);
  assert.equal(res.ignoredDirtyLines.length, 1);
});

test('deployPreflight: незакоммиченный файл внутри build context краснит guard', () => {
  const root = tempGitRepo();
  writeFileSync(join(root, 'packages/background-cabinet/src/local-only.ts'), 'export const local = true;\n');
  assert.throws(
    () => deployPreflight({ branch: 'main', cwd: root, buildContextPaths: context, exit: refuse }),
    /exit:1/u,
  );
});

test('deployPreflight: обход без причины запрещён даже при allowDirty', () => {
  const root = tempGitRepo();
  writeFileSync(join(root, 'packages/background-cabinet/src/local-only.ts'), 'export const local = true;\n');
  assert.throws(
    () => deployPreflight({ branch: 'main', cwd: root, buildContextPaths: context, allowDirty: true, allowDirtyReason: null, exit: refuse }),
    /exit:1/u,
  );
});

test('deployPreflight: обход с причиной проходит и возвращает причину', () => {
  const root = tempGitRepo();
  writeFileSync(join(root, 'packages/background-cabinet/src/local-only.ts'), 'export const local = true;\n');
  const res = deployPreflight({
    branch: 'main',
    cwd: root,
    buildContextPaths: context,
    allowDirty: true,
    allowDirtyReason: 'оператор сверил локальный эксперимент, деплой берёт origin/main',
    exit: refuse,
  });
  assert.equal(res.clean, false);
  assert.equal(res.allowDirtyReason, 'оператор сверил локальный эксперимент, деплой берёт origin/main');
});

test('deployPreflight: свежая проба media краснит live-session guard (#2048)', () => {
  const root = tempGitRepo();
  assert.throws(
    () => deployPreflight({
      branch: 'main',
      cwd: root,
      buildContextPaths: context,
      liveSessionProbe: () => ({ lastSampleAt: '2026-08-25T10:00:30.000Z', source: 'test media' }),
      now: new Date('2026-08-25T10:01:00.000Z'),
      exit: refuse,
    }),
    /exit:1/u,
  );
});

test('deployPreflight: обязательный media live-session guard без URL краснит preflight (#2048)', () => {
  const root = tempGitRepo();
  assert.throws(
    () => deployPreflight({
      branch: 'main',
      cwd: root,
      service: 'media',
      buildContextPaths: context,
      env: {},
      exit: refuse,
    }),
    /exit:1/u,
  );
});

test('deployPreflight: сбой live-session probe становится hard problem, а не raw throw', () => {
  const root = tempGitRepo();
  assert.throws(
    () => deployPreflight({
      branch: 'main',
      cwd: root,
      buildContextPaths: context,
      liveSessionProbe: () => {
        throw new Error('media timeout');
      },
      exit: refuse,
    }),
    /exit:1/u,
  );
});

test('deployPreflight: необязательный live-session guard без URL называется явно как skipped', () => {
  const root = tempGitRepo();
  const res = deployPreflight({
    branch: 'main',
    cwd: root,
    buildContextPaths: context,
    env: {},
    exit: refuse,
  });
  assert.equal(res.clean, true);
  assert.equal(res.liveSessionProbeStatus?.status, 'skipped');
});

test('deployPreflight: старая проба media не блокирует деплой', () => {
  const root = tempGitRepo();
  const res = deployPreflight({
    branch: 'main',
    cwd: root,
    buildContextPaths: context,
    liveSessionProbe: () => ({ lastSampleAt: '2026-08-25T09:59:59.000Z', source: 'test media' }),
    now: new Date('2026-08-25T10:01:00.000Z'),
    exit: refuse,
  });
  assert.equal(res.clean, true);
});

test('deployPreflight: проба ровно 60 секунд назад уже не считается живой', () => {
  const root = tempGitRepo();
  const res = deployPreflight({
    branch: 'main',
    cwd: root,
    buildContextPaths: context,
    liveSessionProbe: () => ({ lastSampleAt: '2026-08-25T10:00:00.000Z', source: 'test media' }),
    now: new Date('2026-08-25T10:01:00.000Z'),
    exit: refuse,
  });
  assert.equal(res.clean, true);
});
