/**
 * Зубы правила «образ несёт данные, которые читает рантайм» (#2287).
 *
 * Отдельный файл, а не хвост `verify-image-workspace-deps.test.mjs`: предикат тот же сторож, но
 * правило другое — там висячий симлинк на КОДЕ, здесь отсутствующий ФАЙЛ ДАННЫХ. Один файл на
 * два правила читался бы как одно.
 *
 * Главное, что здесь удостоверяется: проверка НЕ ищет строку COPY глазами, а моделирует подъём
 * резолвера. Поэтому зубы стоят на исходах «не скопировано» и «скопировано не туда» по
 * отдельности — это разные болезни с разным лечением.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  dockerfileCopyPairs,
  imagePathOfRepoFile,
  lookupConstantsFromSource,
  runtimeFindsFile,
  runtimeReadFindings,
  runtimeWorkdir,
} from './verify-image-workspace-deps.mjs';

/** Исходник рантайма в миниатюре — ровно те две константы, что читает сторож. */
const GRID_SOURCE = [
  "export const TARIFF_GRID_PATH = 'docs/tariffs/tariff-grid.json';",
  'const MAX_LOOKUP_DEPTH = 6;',
].join('\n');

const SERVICE = {
  id: 'cabinet',
  runtimeReads: [{ constantsFrom: 'src/grid.ts', why: 'сетка тарифов' }],
};

const SOURCES = { 'src/grid.ts': GRID_SOURCE };

function dockerfile(copyLine, workdir = '/app/packages/background-cabinet') {
  return [
    'FROM node:20-alpine AS build',
    'WORKDIR /app',
    'COPY packages/background-cabinet packages/background-cabinet',
    'FROM node:20-alpine AS runtime',
    `WORKDIR ${workdir}`,
    'COPY --from=build /app/packages/background-cabinet/dist ./dist',
    ...(copyLine ? [copyLine] : []),
  ].join('\n');
}

test('WORKDIR берётся ПОСЛЕДНИЙ в runtime-стадии — он и станет cwd процесса', () => {
  const df = dockerfile('COPY docs/tariffs /app/docs/tariffs');
  assert.equal(runtimeWorkdir(df), '/app/packages/background-cabinet');
  // WORKDIR стадии сборки не должен подменять рантаймовый: там /app, и вердикт был бы другим.
  assert.notEqual(runtimeWorkdir(df), '/app');
});

test('пара COPY несёт назначение, а не только источник', () => {
  const pairs = dockerfileCopyPairs(dockerfile('COPY docs/tariffs /app/docs/tariffs'), {
    runtimeOnly: true,
  });
  const grid = pairs.find((p) => p.source === 'docs/tariffs');
  assert.equal(grid.destination, '/app/docs/tariffs');
  assert.equal(grid.hasFrom, false);
});

test('путь файла в образе = назначение + путь относительно источника (семантика COPY каталога)', () => {
  const pairs = dockerfileCopyPairs(dockerfile('COPY docs/tariffs /app/docs/tariffs'), {
    runtimeOnly: true,
  });
  assert.equal(
    imagePathOfRepoFile('docs/tariffs/tariff-grid.json', pairs, '/app/packages/background-cabinet'),
    '/app/docs/tariffs/tariff-grid.json',
  );
});

test('константы читаются ИЗ ИСХОДНИКА, а не переписаны в сторожа', () => {
  assert.deepEqual(lookupConstantsFromSource(GRID_SOURCE), {
    lookupPath: 'docs/tariffs/tariff-grid.json',
    maxLookupDepth: 6,
  });
});

test('исходник без известных констант — не молчание, а отказ судить', () => {
  assert.equal(lookupConstantsFromSource('export const SOMETHING_ELSE = 1;'), null);
  const findings = runtimeReadFindings(SERVICE, dockerfile('COPY docs/tariffs /app/docs/tariffs'), {
    'src/grid.ts': 'export const SOMETHING_ELSE = 1;',
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'unreadable');
});

test('файл не копируется вовсе — находка «НЕ копируется» (дефект прода 04.09)', () => {
  const findings = runtimeReadFindings(SERVICE, dockerfile(null), SOURCES);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'runtime-data-missing');
  assert.match(findings[0].detail, /НЕ копируется в образ/u);
});

test('файл копируется, но мимо поля зрения резолвера — ДРУГАЯ находка, не та же', () => {
  const findings = runtimeReadFindings(SERVICE, dockerfile('COPY docs/tariffs /opt/tariffs'), SOURCES);
  assert.equal(findings.length, 1);
  assert.match(findings[0].detail, /копируется в \/opt\/tariffs\/tariff-grid\.json, но рантайм туда не заглядывает/u);
  // Различие несущее: «нет файла» лечится строкой COPY, «не туда» — назначением.
  assert.doesNotMatch(findings[0].detail, /НЕ копируется/u);
});

test('резолвер проверяет САМ рабочий каталог на нулевом шаге — относительное назначение находится', () => {
  // Зафиксировано порчей 05.09: первая редакция комментария в Dockerfile утверждала обратное.
  // Зуб обязан оставаться зелёным здесь, иначе он врал бы о поведении рантайма.
  const findings = runtimeReadFindings(SERVICE, dockerfile('COPY docs/tariffs docs/tariffs'), SOURCES);
  assert.deepEqual(findings, []);
});

test('глубина подъёма соблюдается: за пределом предка файл не считается найденным', () => {
  const verdict = runtimeFindsFile({
    workdir: '/a/b/c/d/e/f/g',
    copyPairs: [{ source: 'docs/tariffs', destination: '/docs/tariffs', hasFrom: false }],
    repoPath: 'docs/tariffs/tariff-grid.json',
    lookupPath: 'docs/tariffs/tariff-grid.json',
    maxLookupDepth: 6,
  });
  // Корень лежит на седьмом предке — резолвер до него не доходит, и зуб обязан это повторить.
  assert.equal(verdict.found, false);
  assert.equal(verdict.checked.length, 6);
});

test('WORKDIR в runtime-стадии отсутствует — судить не о чем, и это сказано вслух', () => {
  const df = ['FROM node:20-alpine AS runtime', 'COPY docs/tariffs /app/docs/tariffs'].join('\n');
  const findings = runtimeReadFindings(SERVICE, df, SOURCES);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'unreadable');
  assert.match(findings[0].detail, /нет WORKDIR/u);
});

test('сервис без объявленных runtimeReads находок не рождает', () => {
  assert.deepEqual(runtimeReadFindings({ id: 'media' }, dockerfile(null), SOURCES), []);
});
