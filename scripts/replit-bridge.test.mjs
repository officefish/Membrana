/**
 * Тесты чистого либа моста Replit (replit-bridge). Офлайн, без git.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  taskBranchName,
  demoWorkspacePath,
  taskDocPath,
  validateSlug,
  buildTaskBrief,
  registerWorkspace,
  flagValue,
  positionalArgs,
} from './lib/replit-bridge.mjs';

test('пути и имя ветки', () => {
  assert.equal(taskBranchName('my-demo'), 'replit/my-demo');
  assert.equal(demoWorkspacePath('my-demo'), 'apps/demos/my-demo');
  assert.equal(taskDocPath('my-demo'), 'docs/replit-tasks/my-demo.md');
});

test('validateSlug: kebab-case проходит, мусор — явный FAIL', () => {
  assert.equal(validateSlug('spectrum-live'), 'spectrum-live');
  assert.equal(validateSlug('  a1-b2  '), 'a1-b2');
  for (const bad of ['Foo', 'a_b', 'a b', '-x', 'x-', 'a--b', 'путь', '']) {
    assert.throws(() => validateSlug(bad), /slug/u, `должен отклонить: «${bad}»`);
  }
  assert.throws(() => validateSlug('a'.repeat(65)), /длинный/u);
});

test('buildTaskBrief: встраивает рамки, папку и стек-канон', () => {
  const md = buildTaskBrief({ slug: 'wave-viz', demoName: 'wave-viz', brief: 'Построй визуализацию спектра.' });
  assert.match(md, /Построй визуализацию спектра\./u);
  assert.match(md, /ТОЛЬКО внутри `apps\/demos\/wave-viz\/`/u);
  assert.match(md, /replit\/wave-viz/u);
  assert.match(md, /DEMO_STACK\.md/u);
  assert.match(md, /React `\^18\.3\.1`/u);
  assert.match(md, /replit:pull-demo wave-viz wave-viz/u);
});

test('buildTaskBrief: пустой бриф помечается, не молчит', () => {
  const md = buildTaskBrief({ slug: 'x', demoName: 'x', brief: '' });
  assert.match(md, /бриф не задан/u);
});

test('registerWorkspace: добавляет рядом с demos, идемпотентно', () => {
  const pkg = { workspaces: ['packages/*', 'apps/*', 'apps/demos/Research-Tree'] };
  const r1 = registerWorkspace(pkg, 'wave-viz');
  assert.equal(r1.changed, true);
  // вставлен сразу после последнего apps/demos/*
  const idxRT = r1.pkg.workspaces.indexOf('apps/demos/Research-Tree');
  assert.equal(r1.pkg.workspaces[idxRT + 1], 'apps/demos/wave-viz');
  // идемпотентность
  const r2 = registerWorkspace(r1.pkg, 'wave-viz');
  assert.equal(r2.changed, false);
});

test('registerWorkspace: вайлдкард apps/demos/* → не трогаем', () => {
  const pkg = { workspaces: ['apps/demos/*'] };
  const r = registerWorkspace(pkg, 'wave-viz');
  assert.equal(r.changed, false);
});

test('registerWorkspace: нет demos-записей → в конец', () => {
  const pkg = { workspaces: ['packages/*'] };
  const r = registerWorkspace(pkg, 'wave-viz');
  assert.deepEqual(r.pkg.workspaces, ['packages/*', 'apps/demos/wave-viz']);
});

test('positionalArgs: значения --demo/--brief-file не попадают в бриф', () => {
  const argv = ['my-slug', '--demo', 'Foo', 'бриф', 'текст'];
  assert.deepEqual(positionalArgs(argv, ['--demo', '--brief-file', '--base']), [
    'my-slug',
    'бриф',
    'текст',
  ]);
  assert.equal(flagValue(argv, '--demo'), 'Foo');
  assert.equal(flagValue(['--demo'], '--demo'), null);
});
