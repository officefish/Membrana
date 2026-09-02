/**
 * Зуб DoD 6: блок изолирован структурно, а не на честном слове.
 *
 * Проверяется по исходникам самого каталога: изоляция — свойство файлов, и утверждать её
 * прозой значит не утверждать ничего. Этот же зуб охраняет правило регламента «стаб, доживший
 * до прода, — дефект интеграции»: производственные файлы блока стабов не импортируют.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url));

function listSources(dir: string): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listSources(full);
    return entry.isFile() && entry.name.endsWith('.ts') ? [full] : [];
  });
}

const SOURCES = listSources(MODULE_DIR);
const IMPORT_RE = /from\s+'([^']+)'/g;

function importsOf(file: string): readonly string[] {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(IMPORT_RE)].map((match) => match[1]!);
}

/** Единственные внешние зависимости, которые блок себе позволяет. */
const ALLOWED_EXTERNAL = new Set([
  '@nestjs/common',
  'vitest',
  'node:fs',
  'node:path',
  'node:url',
]);

const isTest = (file: string): boolean => file.endsWith('.test.ts');
const isStub = (file: string): boolean => file.endsWith('.stub.ts');
const isConformance = (file: string): boolean => file.includes('conformance');

describe('изоляция блока ownership', () => {
  it('в каталоге блока есть исходники — иначе зуб проверял бы пустоту', () => {
    expect(SOURCES.length).toBeGreaterThan(5);
  });

  it('ни один файл не импортирует ничего за пределами блока, кроме разрешённого', () => {
    for (const file of SOURCES) {
      for (const specifier of importsOf(file)) {
        if (specifier.startsWith('.')) {
          expect(specifier.startsWith('../..'), `${file} тянет код за пределы блока: ${specifier}`)
            .toBe(false);
          continue;
        }
        expect(
          ALLOWED_EXTERNAL.has(specifier),
          `${file} тянет внешнюю зависимость ${specifier}`,
        ).toBe(true);
      }
    }
  });

  it('блок не импортирует сгенерированный Prisma-клиент: адаптер типизирован структурно', () => {
    for (const file of SOURCES) {
      for (const specifier of importsOf(file)) {
        expect(specifier).not.toContain('prisma/client');
        expect(specifier).not.toBe('@prisma/client');
      }
    }
  });

  it('производственные файлы блока не импортируют стабы и порчу', () => {
    const production = SOURCES.filter(
      (file) => !isTest(file) && !isStub(file) && !isConformance(file),
    );
    expect(production.length).toBeGreaterThan(3);
    for (const file of production) {
      for (const specifier of importsOf(file)) {
        expect(specifier, `${file} тянет стаб в прод`).not.toContain('.stub');
        expect(specifier, `${file} тянет порчу в прод`).not.toContain('conformance');
      }
    }
  });

  it('блок никуда не ходит: ни сети, ни файловой системы в непроверочном коде', () => {
    for (const file of SOURCES.filter((candidate) => !isTest(candidate))) {
      const text = readFileSync(file, 'utf8');
      for (const forbidden of ['fetch(', 'node:fs', 'node:http', 'axios', 'XMLHttpRequest']) {
        expect(text, `${file} содержит ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('блок не пишет в Device.membraneId: ось только читается', () => {
    for (const file of SOURCES.filter((candidate) => !isTest(candidate))) {
      const text = readFileSync(file, 'utf8');
      for (const forbidden of ['prisma.device.update', 'device.update(', 'device.create(']) {
        expect(text, `${file} пишет владение, а кабинет пишет его однократно`).not.toContain(
          forbidden,
        );
      }
    }
  });
});
