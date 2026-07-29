/**
 * Зуб junction-safety (#1436): связь наружу дерева распознаётся до сноса,
 * массовые удаления в main-дереве после операции видны как находка.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { newDeletions, resolveLinkTarget, targetIsOutsideTree } from './junction-safety.mjs';

test('resolveLinkTarget: относительная цель резолвится от каталога линка, абсолютная — как есть', () => {
  const link = 'C:\\practice\\Membrana-x\\node_modules\\@m\\pkg';
  assert.match(resolveLinkTarget(link, '..\\..\\packages\\pkg'), /Membrana-x[\\/]packages[\\/]pkg$/u);
  assert.match(resolveLinkTarget(link, 'C:\\practice\\Membrana\\packages\\pkg'), /Membrana[\\/]packages[\\/]pkg$/u);
});

test('targetIsOutsideTree: внутри/снаружи/границы каталога/регистр Windows', () => {
  const root = 'C:\\practice\\Membrana-x';
  assert.equal(targetIsOutsideTree('C:\\practice\\Membrana-x\\apps\\a', root), false);
  assert.equal(targetIsOutsideTree('C:\\practice\\Membrana\\apps\\a', root), true, 'соседнее дерево — наружа');
  assert.equal(targetIsOutsideTree('C:\\practice\\Membrana-xy\\a', root), true, 'префикс имени ≠ вложенность');
  assert.equal(targetIsOutsideTree('c:\\PRACTICE\\membrana-x\\b', root), false, 'регистр Windows не делает наружу');
  assert.equal(targetIsOutsideTree(root, root), false, 'сам корень — не наружа');
});

test('newDeletions: видит только НОВЫЕ ` D`-строки', () => {
  const before = ' D docs/old.md\n M scripts/x.mjs';
  const after = ' D docs/old.md\n D apps/cabinet/App.tsx\n D packages/core/i.ts\n?? tmp.txt';
  assert.deepEqual(newDeletions(before, after), ['apps/cabinet/App.tsx', 'packages/core/i.ts']);
  assert.deepEqual(newDeletions(after, after), []);
});
