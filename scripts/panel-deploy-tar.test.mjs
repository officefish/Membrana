import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';

import { tarArgsForDirectory } from './_ssh-panel-deploy.mjs';

test('panel deploy tar не получает абсолютный Windows archive path (#2432)', () => {
  const sourceDir = 'C:\\repo\\apps\\panel\\dist';
  const archivePath = 'C:\\repo\\scripts\\cache\\panel-dist-1.tgz';
  const { cwd, args } = tarArgsForDirectory({ archivePath, sourceDir });

  assert.equal(cwd, sourceDir);
  assert.deepEqual(args, ['-czf', '../../../scripts/cache/panel-dist-1.tgz', '.']);
  assert.doesNotMatch(args[1], /^[A-Za-z]:/u);
});

test('panel deploy tar отказывает, если archive path нельзя сделать относительным (#2432)', () => {
  const sourceDir = 'C:\\repo\\apps\\panel\\dist';
  const archivePath = join('D:\\other', 'panel-dist-1.tgz');

  assert.throws(
    () => tarArgsForDirectory({ archivePath, sourceDir }),
    /archive path must be relative for tar/u,
  );
});
