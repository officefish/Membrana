import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BANNER,
  WIRE_SOURCE_FILES,
  dedupeAcrossParts,
  extractTopLevelDeclarations,
  generateWireSource,
  normalizeDeclaration,
  stripInternalImports,
} from './generate-wire-contract.mjs';

test('stripInternalImports: убирает внутренние импорты, включая многострочные', () => {
  const src = `import type { A } from './a.js';\nimport {\n  b,\n  type C,\n} from './b-c.js';\n\nexport const X = 1;\n`;
  const out = stripInternalImports(src, 'x.ts');
  assert.ok(!out.includes('import'));
  assert.ok(out.includes('export const X = 1;'));
});

test('stripInternalImports: внешний импорт — ошибка (самодостаточность контракта)', () => {
  const src = `import { z } from 'zod';\nexport const X = 1;\n`;
  assert.throws(() => stripInternalImports(src, 'x.ts'), /внешний импорт 'zod'/);
});

test('extractTopLevelDeclarations: находит функции, константы и интерфейсы', () => {
  const src = [
    'function isRecord(v: unknown): v is Record<string, unknown> {',
    "  return typeof v === 'object' && v !== null;",
    '}',
    '',
    'export interface Foo {',
    '  readonly a: string;',
    '}',
    '',
    'export const BAR = 42;',
  ].join('\n');
  const decls = extractTopLevelDeclarations(src);
  const names = decls.map((d) => `${d.kind}:${d.name}`);
  assert.deepEqual(names, ['function:isRecord', 'interface:Foo', 'const:BAR']);
  assert.equal(decls[0].exported, false);
  assert.equal(decls[1].exported, true);
});

test('dedupeAcrossParts: идентичный приватный дубль выбрасывается из второго файла', () => {
  const isRecord = [
    'function isRecord(v: unknown): v is Record<string, unknown> {',
    "  return typeof v === 'object' && v !== null;",
    '}',
  ].join('\n');
  const parts = [
    { fileName: 'a.ts', src: `${isRecord}\n\nexport const A = 1;` },
    { fileName: 'b.ts', src: `${isRecord}\n\nexport const B = 2;` },
  ];
  const [a, b] = dedupeAcrossParts(parts);
  assert.ok(a.includes('isRecord'));
  assert.ok(!b.includes('isRecord'), 'повтор isRecord должен быть вырезан');
  assert.ok(b.includes('export const B = 2;'));
});

test('dedupeAcrossParts: НЕИДЕНТИЧНЫЙ дубль — ошибка, молчаливый выбор запрещён', () => {
  const parts = [
    { fileName: 'a.ts', src: 'function pick(v: unknown) {\n  return v;\n}' },
    { fileName: 'b.ts', src: 'function pick(v: unknown) {\n  return null;\n}' },
  ];
  assert.throws(() => dedupeAcrossParts(parts), /НЕИДЕНТИЧНЫЙ дубль 'pick'/);
});

test('normalizeDeclaration: whitespace-insensitive', () => {
  assert.equal(
    normalizeDeclaration('function  f() {\n  return 1;\n}'),
    normalizeDeclaration('function f() { return 1; }'),
  );
});

test('generateWireSource: детерминирован и идемпотентен на реальных core-исходниках', () => {
  const first = generateWireSource();
  const second = generateWireSource();
  assert.equal(first, second, 'два прогона должны давать байтово идентичный выход');
  assert.ok(first.startsWith(BANNER), 'баннер GENERATED обязателен');
  for (const f of WIRE_SOURCE_FILES) {
    assert.ok(first.includes(`from packages/core/src/contracts/node-realtime/${f}`), `секция ${f}`);
  }
  // Ровно один isRecord после дедупа.
  const count = (first.match(/^function isRecord\(/gm) ?? []).length;
  assert.equal(count, 1, 'isRecord должен остаться в одном экземпляре');
  // Никаких импортов в самодостаточном CJS-файле.
  assert.ok(!/^import /m.test(first), 'генерат не должен содержать import');
});
