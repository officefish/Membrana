import { test } from 'node:test';
import assert from 'node:assert/strict';

import { affectedPackageDirs } from './build-affected.mjs';

const PKGS = [
  'packages/core',
  'packages/services/fft-analyzer',
  'packages/services/detectors/base',
  'packages/device-board',
  'apps/client',
];

test('матчит изменённый packages/core', () => {
  assert.deepEqual(
    affectedPackageDirs(['packages/core/src/a.ts', 'docs/x.md'], PKGS),
    ['packages/core'],
  );
});

test('вложенный пакет — точный корень (не packages/services)', () => {
  assert.deepEqual(
    affectedPackageDirs(['packages/services/detectors/base/src/types.ts'], PKGS),
    ['packages/services/detectors/base'],
  );
});

test('apps/* игнорируются (build:affected — про dist пакетов)', () => {
  assert.deepEqual(affectedPackageDirs(['apps/client/src/x.tsx'], PKGS), []);
});

test('дедуп + сортировка нескольких пакетов', () => {
  assert.deepEqual(
    affectedPackageDirs(
      [
        'packages/core/src/a.ts',
        'packages/core/src/b.ts',
        'packages/device-board/src/c.tsx',
      ],
      PKGS,
    ),
    ['packages/core', 'packages/device-board'],
  );
});

test('нет изменений в packages → пусто', () => {
  assert.deepEqual(affectedPackageDirs(['README.md', 'apps/cabinet/x.ts'], PKGS), []);
});
