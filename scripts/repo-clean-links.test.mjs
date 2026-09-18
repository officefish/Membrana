/**
 * Зуб кадра 2 сноса (ADR-0020): снятие связей ПЕРЕД `git worktree remove`.
 *
 * Урок 18.09: старый код снимал только связи наружу (#1436) и пропускал внутренние;
 * `node_modules/@membrana/* → apps/*` становились висящими, как только git удалял
 * `apps/`, и `git worktree remove --force` обрывался на первой из них — два дерева
 * подряд остались на диске. Здесь закреплено: после кадра 2 внутри дерева нет НИ ОДНОЙ
 * связи (внешней или внутренней), а цели связей — и внутри, и снаружи — не тронуты.
 * На коде до починки первый тест красный (внутренняя связь оставалась).
 *
 * Связи создаются как junction: на Windows они не требуют прав администратора и
 * это ровно та форма, которую даёт yarn для workspace-пакетов.
 */
import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

import { neutralizeOutboundLinks } from './repo-clean.mjs';

function quietReporter() {
  const lines = [];
  return { lines, log: (t) => lines.push(String(t)), error: (t) => lines.push(String(t)) };
}

/** Все связи внутри дерева (без захода внутрь связей), для проверки «ни одной». */
function linksInside(root) {
  const found = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) found.push(p);
      else if (st.isDirectory()) stack.push(p);
    }
  }
  return found;
}

/**
 * Макет сносимого дерева: apps/cabinet с файлом, внутренняя junction
 * node_modules/@membrana/cabinet → apps/cabinet, внешняя junction
 * node_modules/@membrana/core → соседнее дерево (тоже с файлом).
 */
function makeTree() {
  const base = mkdtempSync(join(tmpdir(), 'repo-clean-links-'));
  const tree = join(base, 'Membrana-dead');
  const neighbor = join(base, 'Membrana-live');
  mkdirSync(join(tree, 'apps', 'cabinet'), { recursive: true });
  mkdirSync(join(tree, 'node_modules', '@membrana'), { recursive: true });
  mkdirSync(join(neighbor, 'packages', 'core'), { recursive: true });
  writeFileSync(join(tree, 'apps', 'cabinet', 'index.ts'), 'export const inside = 1;\n');
  writeFileSync(join(neighbor, 'packages', 'core', 'index.ts'), 'export const outside = 1;\n');
  symlinkSync(join(tree, 'apps', 'cabinet'), join(tree, 'node_modules', '@membrana', 'cabinet'), 'junction');
  symlinkSync(join(neighbor, 'packages', 'core'), join(tree, 'node_modules', '@membrana', 'core'), 'junction');
  return { base, tree, neighbor };
}

test('кадр 2: после снятия связей внутри дерева нет ни одной — ни наружу, ни внутренней', (t) => {
  const { base, tree } = makeTree();
  t.after(() => rmSync(base, { recursive: true, force: true }));
  assert.equal(linksInside(tree).length, 2, 'макет: две связи до кадра 2');

  neutralizeOutboundLinks(tree, quietReporter());

  assert.deepEqual(linksInside(tree), [], 'внутренняя связь не должна пережить кадр 2 — на ней обрывается git');
});

test('кадр 2 снимает связь как связь: цели внутри и снаружи дерева не тронуты', (t) => {
  const { base, tree, neighbor } = makeTree();
  t.after(() => rmSync(base, { recursive: true, force: true }));

  neutralizeOutboundLinks(tree, quietReporter());

  assert.equal(readFileSync(join(tree, 'apps', 'cabinet', 'index.ts'), 'utf8'), 'export const inside = 1;\n');
  assert.equal(readFileSync(join(neighbor, 'packages', 'core', 'index.ts'), 'utf8'), 'export const outside = 1;\n');
  assert.ok(!existsSync(join(tree, 'node_modules', '@membrana', 'cabinet')), 'сам линк снят');
  assert.ok(!existsSync(join(tree, 'node_modules', '@membrana', 'core')), 'сам линк снят');
});

test('кадр 2 называет в отчёте, какая связь наружу, а какая внутренняя', (t) => {
  const { base, tree } = makeTree();
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const out = quietReporter();

  neutralizeOutboundLinks(tree, out);

  const text = out.lines.join('\n');
  assert.match(text, /связь наружу снята: .*core/);
  assert.match(text, /внутренняя связь снята.*cabinet/);
  assert.match(text, /связей наружу снято: 1/);
  assert.match(text, /внутренних связей снято: 1/);
});

test('кадр 2 не заходит внутрь связи и не трогает .git', (t) => {
  const { base, tree } = makeTree();
  t.after(() => rmSync(base, { recursive: true, force: true }));
  // .git у worktree — файл-указатель; внутри связи — чужая территория.
  writeFileSync(join(tree, '.git'), 'gitdir: elsewhere\n');
  writeFileSync(join(tree, 'apps', 'cabinet', 'nested.txt'), 'x');

  neutralizeOutboundLinks(tree, quietReporter());

  assert.equal(readFileSync(join(tree, '.git'), 'utf8'), 'gitdir: elsewhere\n');
  assert.ok(existsSync(resolve(tree, 'apps', 'cabinet', 'nested.txt')));
});
