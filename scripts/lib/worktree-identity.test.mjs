import assert from 'node:assert/strict';
import { test } from 'node:test';

import { attributeForeign, formatAttribution, treeOf } from './worktree-identity.mjs';

// Зубы опознания чужого дерева (блок 2, #1647). Ядро чистое: перечень деревьев приходит
// значением, ни git, ни ФС не нужны.

const TREES = [
  { root: 'C:/Users/u/practice/Membrana', name: 'Membrana', branch: 'codex/hackathon' },
  { root: 'C:/Users/u/practice/Membrana-tooling', name: 'Membrana-tooling', branch: 'fix/office-image' },
  { root: 'C:/Users/u/practice/Membrana/.worktrees/inner', name: 'inner', branch: 'codex/inner' },
];

test('ПРЕФИКСНАЯ ЛОВУШКА: Membrana-tooling не приписывается дереву Membrana', () => {
  // На этом сорвался живой замер 08.08: сравнение по началу строки объявило
  // …/Membrana-tooling/packages/core «своим» для дерева …/Membrana.
  const owner = treeOf('C:/Users/u/practice/Membrana-tooling/packages/core', TREES);
  assert.equal(owner.name, 'Membrana-tooling');
  assert.equal(owner.branch, 'fix/office-image');
});

test('вложенное дерево выигрывает у хозяина — совпадение глубже, значит правдивее', () => {
  const owner = treeOf('C:/Users/u/practice/Membrana/.worktrees/inner/packages/core', TREES);
  assert.equal(owner.name, 'inner', 'иначе пакеты вложенного дерева уедут внешнему');
});

test('дерево вне перечня — null, а не «ближайшее по имени»', () => {
  assert.equal(treeOf('D:/somewhere/else/packages/core', TREES), null);
  assert.equal(treeOf('C:/Users/u/practice/Membrana-OTHER/packages/core', TREES), null, 'похожее имя не делает дерево тем же');
});

test('разные стили разделителей и регистр диска не меняют вердикт', () => {
  const owner = treeOf('c:\\Users\\u\\practice\\Membrana-tooling\\packages\\core', TREES);
  assert.equal(owner?.name, 'Membrana-tooling');
});

test('сводка: чужие пакеты собраны по владельцам, свои не считаются', () => {
  const packages = [
    { name: 'core', realPath: 'C:/Users/u/practice/Membrana-tooling/packages/core' },
    { name: 'agenda', realPath: 'C:/Users/u/practice/Membrana-tooling/packages/agenda' },
    { name: 'own-one', realPath: 'C:/Users/u/practice/Membrana/packages/own-one' },
    { name: 'ghost', realPath: 'D:/elsewhere/packages/ghost' },
    { name: 'broken', realPath: null },
  ];
  const got = attributeForeign(packages, 'C:/Users/u/practice/Membrana', TREES);
  assert.equal(got.owners.length, 1);
  assert.equal(got.owners[0].name, 'Membrana-tooling');
  assert.deepEqual(got.owners[0].packages, ['agenda', 'core'], 'порядок детерминирован');
  assert.deepEqual(got.unknown, ['ghost']);
});

test('порядок владельцев детерминирован: больше пакетов — выше', () => {
  const packages = [
    { name: 'a', realPath: 'C:/Users/u/practice/Membrana/.worktrees/inner/packages/a' },
    { name: 'b', realPath: 'C:/Users/u/practice/Membrana-tooling/packages/b' },
    { name: 'c', realPath: 'C:/Users/u/practice/Membrana-tooling/packages/c' },
  ];
  const got = attributeForeign(packages, 'C:/Users/u/practice/Membrana-archivarius', TREES);
  assert.deepEqual(got.owners.map((o) => o.name), ['Membrana-tooling', 'inner']);
});

test('вывод называет дерево И ветку; неизвестная ветка признаётся, а не выдумывается', () => {
  const lines = formatAttribution({
    owners: [
      { name: 'Membrana-tooling', branch: 'fix/office-image', root: 'x', packages: ['a', 'b'] },
      { name: 'Membrana-old', branch: null, root: 'y', packages: ['c'] },
    ],
    unknown: ['ghost'],
  });
  assert.match(lines[0], /2 пакет\(ов\) ведут в «Membrana-tooling» · ветка fix\/office-image/u);
  assert.match(lines[1], /ветка неизвестна/u);
  assert.match(lines[2], /ВНЕ известных деревьев — владелец не опознан/u);
});

test('на своём дереве добавлять нечего — пустая сводка не печатает строк', () => {
  const got = attributeForeign(
    [{ name: 'core', realPath: 'C:/Users/u/practice/Membrana/packages/core' }],
    'C:/Users/u/practice/Membrana',
    TREES,
  );
  assert.deepEqual(got.owners, []);
  assert.deepEqual(formatAttribution(got), []);
});
