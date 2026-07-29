/**
 * Зуб junction-safety (#1436): связь наружу дерева распознаётся до сноса,
 * массовые удаления в main-дереве после операции видны как находка.
 * Фикстуры строятся resolve()-ом — зуб один и тот же на Windows и в Linux-CI.
 */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';

import { newDeletions, resolveLinkTarget, targetIsOutsideTree } from './junction-safety.mjs';

const ROOT = resolve('/practice/Membrana-x');
const NEIGHBOR = resolve('/practice/Membrana');

test('resolveLinkTarget: относительная цель резолвится от каталога линка, абсолютная — как есть', () => {
  const link = resolve(ROOT, 'node_modules/@m/pkg');
  assert.equal(resolveLinkTarget(link, '../../packages/pkg'), resolve(ROOT, 'packages/pkg'));
  assert.equal(resolveLinkTarget(link, resolve(NEIGHBOR, 'packages/pkg')), resolve(NEIGHBOR, 'packages/pkg'));
});

test('targetIsOutsideTree: внутри/снаружи/границы каталога', () => {
  assert.equal(targetIsOutsideTree(resolve(ROOT, 'apps/a'), ROOT), false);
  assert.equal(targetIsOutsideTree(resolve(NEIGHBOR, 'apps/a'), ROOT), true, 'соседнее дерево — наружа');
  assert.equal(targetIsOutsideTree(`${ROOT}y`, ROOT), true, 'префикс имени ≠ вложенность');
  assert.equal(targetIsOutsideTree(ROOT.toUpperCase(), ROOT), false, 'регистр не делает наружу (Windows-семантика)');
  assert.equal(targetIsOutsideTree(ROOT, ROOT), false, 'сам корень — не наружа');
});

test('newDeletions: видит только НОВЫЕ удаления', () => {
  const before = ' D docs/old.md\n M scripts/x.mjs';
  const after = ' D docs/old.md\n D apps/cabinet/App.tsx\n D packages/core/i.ts\n?? tmp.txt';
  assert.deepEqual(newDeletions(before, after), ['apps/cabinet/App.tsx', 'packages/core/i.ts']);
  assert.deepEqual(newDeletions(after, after), []);
});

test('newDeletions: удаление в любой колонке статуса — staged, unstaged, смесь (P2 ревью #1443)', () => {
  const after = 'D  staged/gone.ts\n D unstaged/gone.ts\nDD both/gone.ts\n M kept.ts\n?? new.txt';
  assert.deepEqual(newDeletions('', after), ['staged/gone.ts', 'unstaged/gone.ts', 'both/gone.ts']);
});
