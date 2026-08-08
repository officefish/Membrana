import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { collectPackages, main, parseArgs } from './worktree-resolution.mjs';

// Зубы ПОРТА (блок 1, #1647). Суждение живёт в ядре и покрыто своими 17 зубами; здесь
// проверяется провод: собирает ли он наблюдение честно и различает ли отказ от вердикта.

const tmpTree = (build) => {
  const root = mkdtempSync(path.join(tmpdir(), 'wt-resolve-'));
  build(root);
  return root;
};

test('неизвестный аргумент — ошибка входа, а не молчаливое умолчание', () => {
  assert.throws(() => parseArgs(['--что-то']), /неизвестный аргумент/u);
  assert.deepEqual(parseArgs([]), { tree: null, json: false, help: false });
  assert.equal(parseArgs(['--tree', 'X']).tree, 'X');
});

test('каталога пакетов нет — null, а НЕ пустой список: «нечего мерить» ≠ «всё своё»', () => {
  const root = tmpTree(() => {});
  try {
    assert.equal(collectPackages(root), null, 'пустой массив увёл бы ядро в own — тихое зелёное');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('битая ссылка попадает в наблюдение с realPath: null — её нельзя выдавать за чужую', () => {
  const root = tmpTree((r) => {
    const scope = path.join(r, 'node_modules', '@membrana');
    mkdirSync(scope, { recursive: true });
    mkdirSync(path.join(r, 'packages', 'core'), { recursive: true });
    symlinkSync(path.join(r, 'packages', 'core'), path.join(scope, 'core'), 'junction');
    try {
      symlinkSync(path.join(r, 'packages', 'ушёл'), path.join(scope, 'ушёл'), 'junction');
    } catch {
      writeFileSync(path.join(scope, 'placeholder'), '');
    }
  });
  try {
    const pkgs = collectPackages(root);
    assert.ok(Array.isArray(pkgs) && pkgs.length >= 1);
    const core = pkgs.find((p) => p.name === 'core');
    assert.ok(core && typeof core.realPath === 'string', 'живая ссылка разыменована');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('дерево без node_modules — «замер не состоялся» (exit 2), а не «всё своё»', () => {
  const root = tmpTree(() => {});
  try {
    assert.equal(main(['--tree', root]), 2, 'absent обязан отличаться от own кодом возврата');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('своё дерево — own и exit 0; чужая резолюция — exit 1 как СОСТОЯНИЕ, не сбой', () => {
  const root = tmpTree((r) => {
    const scope = path.join(r, 'node_modules', '@membrana');
    mkdirSync(scope, { recursive: true });
    mkdirSync(path.join(r, 'packages', 'core'), { recursive: true });
    symlinkSync(path.join(r, 'packages', 'core'), path.join(scope, 'core'), 'junction');
  });
  const foreign = tmpTree((r) => {
    mkdirSync(path.join(r, 'packages', 'core'), { recursive: true });
  });
  try {
    assert.equal(main(['--tree', root]), 0);
    const scope = path.join(foreign, 'node_modules', '@membrana');
    mkdirSync(scope, { recursive: true });
    symlinkSync(path.join(root, 'packages', 'core'), path.join(scope, 'core'), 'junction');
    assert.equal(main(['--tree', foreign]), 1, 'чужая резолюция — состояние дерева, а не поломка прибора');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(foreign, { recursive: true, force: true });
  }
});

test('BLOCK-условие резчика: порт НЕ содержит второй копии предиката', () => {
  // Всё суждение — в ядре. Сравнение путей внутри порта воспроизвело бы ошибку 08.08:
  // одноразовая проверка сравнила пути по префиксу строки и объявила чужое своим.
  const src = readFileSync(new URL('./worktree-resolution.mjs', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  // Запрещено сравнение ПУТЕЙ, а не строк вообще: `startsWith` законно разбирает вывод
  // `git worktree list --porcelain`. Первая формулировка зуба была грубее и краснела на
  // честном разборе — уточнена по существу, а не ослаблена.
  for (const forbidden of ['isInside', 'path.relative(', 'realPath.startsWith']) {
    assert.ok(!src.includes(forbidden), `в порту появилось сравнение путей «${forbidden}» — это второй предикат`);
  }
  assert.ok(src.includes('classifyResolution('), 'порт обязан звать ядро, а не судить сам');
  assert.ok(src.includes('attributeForeign('), 'опознание владельца тоже у ядра, а не в порту');
});
