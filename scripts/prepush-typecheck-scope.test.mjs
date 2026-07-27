import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nonDocsFiles, planPrepushTypecheck, yarnBin } from './prepush-typecheck-scope.mjs';

const PKGS = ['packages/device-board', 'packages/services/telemetry-journal', 'apps/docs'];

test('nonDocsFiles: отсекает .md и .mdx', () => {
  assert.deepEqual(
    nonDocsFiles(['a.md', 'b.mdx', 'c.ts', 'docs.json']),
    ['c.ts', 'docs.json'],
  );
});

test('#1168 docs-only внутри пакета → skip (markdown не поднимает билд пакета)', () => {
  const p = planPrepushTypecheck(
    ['packages/device-board/DEVICE_BOARD_CONCEPT.md', 'apps/docs/nodes/x.mdx'],
    { packageDirs: PKGS },
  );
  assert.equal(p.mode, 'skip');
});

test('#1168 живой кейс: .md в пакете + docs.json в apps/docs → scoped к apps/docs, НЕ к device-board', () => {
  const p = planPrepushTypecheck(
    ['packages/device-board/DEVICE_BOARD_CONCEPT.md', 'apps/docs/docs.json'],
    { packageDirs: PKGS },
  );
  assert.equal(p.mode, 'scoped');
  assert.deepEqual(p.dirs, ['apps/docs']); // device-board НЕ попал (его правка — только .md)
});

test('код в пакете → scoped к нему', () => {
  const p = planPrepushTypecheck(['packages/device-board/src/x.ts'], { packageDirs: PKGS });
  assert.equal(p.mode, 'scoped');
  assert.deepEqual(p.dirs, ['packages/device-board']);
});

test('корневой конфиг → full', () => {
  const p = planPrepushTypecheck(['tsconfig.base.json', 'packages/device-board/src/x.ts'], { packageDirs: PKGS });
  assert.equal(p.mode, 'full');
});

test('только корневые скрипты (не пакет, не docs) → skip (turbo их не типизирует)', () => {
  const p = planPrepushTypecheck(['scripts/pr-ship.mjs', 'scripts/pr-ship.test.mjs'], { packageDirs: PKGS });
  assert.equal(p.mode, 'skip');
});

test('корневой package.json + скрипты → skip, НЕ full (не глобальная зависимость turbo; иначе vite 127 на себе)', () => {
  const p = planPrepushTypecheck(['package.json', 'scripts/pr-ship.mjs', '.githooks/pre-push'], { packageDirs: PKGS });
  assert.equal(p.mode, 'skip');
});

test('пустой список → skip', () => {
  assert.equal(planPrepushTypecheck([], { packageDirs: PKGS }).mode, 'skip');
});

test('yarnBin: Windows hook запускает yarn.cmd, не голый yarn', () => {
  assert.equal(yarnBin('win32'), 'yarn.cmd');
  assert.equal(yarnBin('linux'), 'yarn');
});
