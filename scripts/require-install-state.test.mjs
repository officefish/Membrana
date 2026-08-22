import assert from 'node:assert/strict';
import { test } from 'node:test';

import { observeTree } from './require-install-state.mjs';

const io = (files, real = {}) => ({
  exists: (p) => files.includes(String(p).replace(/\\/gu, '/')),
  real: (p) => real[String(p).replace(/\\/gu, '/')] ?? p,
});

test('наблюдение различает «каталога нет» и «каталог есть без завершённой установки»', () => {
  const bare = observeTree('C:/p/t', io([]));
  assert.equal(bare.modulesDir, false);
  assert.equal(bare.stateFile, false);

  const half = observeTree('C:/p/t', io(['C:/p/t/node_modules']));
  assert.equal(half.modulesDir, true);
  assert.equal(half.stateFile, false, 'без .yarn-state.yml установка не считается завершённой');
});

test('наблюдение видит, что node_modules ведёт в чужое дерево (junction/symlink #725)', () => {
  const obs = observeTree(
    'C:/p/Membrana-records',
    io(['C:/p/Membrana-records/node_modules', 'C:/p/Membrana-records/node_modules/.yarn-state.yml'], {
      'C:/p/Membrana-records/node_modules': 'C:/p/Membrana/node_modules',
    }),
  );
  assert.equal(obs.modulesRealRoot.replace(/\\/gu, '/'), 'C:/p/Membrana');
  assert.equal(obs.treeRoot, 'C:/p/Membrana-records');
});

test('установленное дерево наблюдается как своё', () => {
  const obs = observeTree(
    'C:/p/t',
    io(['C:/p/t/node_modules', 'C:/p/t/node_modules/.yarn-state.yml'], { 'C:/p/t/node_modules': 'C:/p/t/node_modules' }),
  );
  assert.equal(obs.modulesDir, true);
  assert.equal(obs.stateFile, true);
  assert.equal(obs.modulesRealRoot.replace(/\\/gu, '/'), 'C:/p/t');
});
