/**
 * Зубы предиката «импортируешь — объяви» (находка 28.08).
 *
 * Предмет: свидетельство берётся из ИСХОДНИКОВ, а не из манифеста. Соседний сторож образов
 * ходит по объявленному графу и потому слеп к необъявленному импорту — эти зубы стерегут то
 * самое слепое пятно.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  declaredWorkspaces,
  importedWorkspaces,
  undeclaredImports,
} from './lib/declared-imports.mjs';

test('импорт узнаётся во ВСЕХ формах, включая динамическую — сервер грузит ядро именно так', () => {
  const src = [
    "import { a } from '@membrana/core';",
    "import type { B } from '@membrana/plugin-contracts';",
    "export { c } from '@membrana/wav-decode';",
    "import '@membrana/side-effect';",
    "const m = await import('@membrana/media-library-service');",
    "const r = require('@membrana/legacy-cjs');",
  ].join('\n');
  assert.deepEqual([...importedWorkspaces(src)].sort(), [
    '@membrana/core',
    '@membrana/legacy-cjs',
    '@membrana/media-library-service',
    '@membrana/plugin-contracts',
    '@membrana/side-effect',
    '@membrana/wav-decode',
  ]);
});

test('многострочный импорт — тоже импорт: список имён через перенос строк не прячет пакет', () => {
  const src = "import {\n  one,\n  two,\n} from '@membrana/core';";
  assert.deepEqual([...importedWorkspaces(src)], ['@membrana/core']);
});

test('чужие пакеты не считаются: судим только свой воркспейс', () => {
  const src = "import x from 'react';\nimport y from '@nestjs/common';";
  assert.equal(importedWorkspaces(src).size, 0);
});

test('объявленным считается любое из трёх полей — тест законно тянет devDependency', () => {
  const declared = declaredWorkspaces({
    dependencies: { '@membrana/a': '*', react: '^18' },
    peerDependencies: { '@membrana/b': '*' },
    devDependencies: { '@membrana/c': '*' },
  });
  assert.deepEqual([...declared].sort(), ['@membrana/a', '@membrana/b', '@membrana/c']);
});

test('импорт без объявления — находка с обоими именами', () => {
  const known = new Set(['@membrana/host', '@membrana/dep']);
  const out = undeclaredImports('@membrana/host', new Set(['@membrana/dep']), new Set(), known);
  assert.deepEqual(out, [{ pkg: '@membrana/host', dep: '@membrana/dep' }]);
});

test('объявленный импорт находкой НЕ является', () => {
  const known = new Set(['@membrana/host', '@membrana/dep']);
  const out = undeclaredImports('@membrana/host', new Set(['@membrana/dep']), new Set(['@membrana/dep']), known);
  assert.deepEqual(out, []);
});

test('обратное включение НЕ требуется: объявленное без импорта — вес, а не ложь', () => {
  const known = new Set(['@membrana/host', '@membrana/unused']);
  const out = undeclaredImports('@membrana/host', new Set(), new Set(['@membrana/unused']), known);
  assert.deepEqual(out, []);
});

test('самоимпорт по имени связью наружу не считается', () => {
  const known = new Set(['@membrana/host']);
  const out = undeclaredImports('@membrana/host', new Set(['@membrana/host']), new Set(), known);
  assert.deepEqual(out, []);
});

test('имя вне воркспейса не судится: это забота install, а не границ', () => {
  const known = new Set(['@membrana/host']);
  const out = undeclaredImports('@membrana/host', new Set(['@membrana/not-ours']), new Set(), known);
  assert.deepEqual(out, []);
});

test('живое дерево: каждый импорт рабочего пакета объявлен', async () => {
  // Зуб на самом репозитории. До починки 29.08 он краснел тремя случаями:
  // background-media → media-library-service (находка Г, дала четыре красных в CI),
  // journal-report-views → core, client → yamnet-detector-service.
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const script = fileURLToPath(new URL('./verify-declared-imports.mjs', import.meta.url));
  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, [script, '--json'], { encoding: 'utf8' });
  } catch (e) {
    out = String(e.stdout ?? '');
    code = e.status ?? 1;
  }
  const parsed = JSON.parse(out);
  assert.equal(code, 0, `необъявленные импорты: ${JSON.stringify(parsed.findings)}`);
  assert.equal(parsed.ok, true);
});
