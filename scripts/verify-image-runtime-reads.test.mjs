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
  buildContextFindings,
  contextDecision,
  dockerfileCopyPairs,
  parseDockerignore,
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

/**
 * Зубы правила «источник COPY доезжает до build-контекста» (#2287, вторая правка 05.09).
 *
 * Правило заведено после того, как зуб выше оказался ЗЕЛЁНЫМ на образе, который не собрался:
 * строка `COPY docs/tariffs` в Dockerfile была, а `.dockerignore` исключал `docs` дважды.
 * Проверка судила инструкцию и не читала контекст — отвечала не на тот вопрос, что задавал прод.
 */
const IGNORE = [
  '**/node_modules',
  'docs',
  'docs/**',
  '!docs/truth/',
  '!docs/truth/registry.json',
].join('\n');

const CONTEXT_FILES = [
  'docs/tariffs/tariff-grid.json',
  'docs/truth/registry.json',
  'packages/background-cabinet/package.json',
];

function contextDockerfile(copyLine) {
  return ['FROM node:20-alpine AS runtime', 'WORKDIR /app', copyLine].join('\n');
}

test('источник исключён из контекста — находка называет ВИНОВНОЕ правило', () => {
  const findings = buildContextFindings(
    { id: 'cabinet' },
    contextDockerfile('COPY docs/tariffs /app/docs/tariffs'),
    IGNORE,
    CONTEXT_FILES,
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'excluded-from-context');
  assert.match(findings[0].detail, /исключён из build-контекста правилом «docs\/\*\*»/u);
  // Текст обязан назвать и то, чем это кончится: иначе читатель не свяжет находку с падением.
  assert.match(findings[0].detail, /not found/u);
});

test('исключение возвращает путь в контекст — находки нет', () => {
  const findings = buildContextFindings(
    { id: 'cabinet' },
    contextDockerfile('COPY docs/tariffs /app/docs/tariffs'),
    `${IGNORE}\n!docs/tariffs/\n!docs/tariffs/tariff-grid.json`,
    CONTEXT_FILES,
  );
  assert.deepEqual(findings, []);
});

test('последнее совпавшее правило побеждает — как у docker', () => {
  const rules = parseDockerignore(`${IGNORE}\n!docs/tariffs/\n!docs/tariffs/tariff-grid.json`);
  assert.equal(contextDecision(rules, 'docs/tariffs/tariff-grid.json').included, true);
  assert.equal(contextDecision(rules, 'docs/WHITE_PAPER.md').included, false);
  // Исключение каталога уносит содержимое: совпадением считается и предок пути.
  assert.equal(contextDecision(parseDockerignore('docs'), 'docs/a/b.json').included, false);
});

test('COPY --from стадии сборки контекстом не судится: у него источник не из дерева', () => {
  const df = [
    'FROM node:20-alpine AS runtime',
    'WORKDIR /app',
    'COPY --from=build /app/docs/tariffs /app/docs/tariffs',
  ].join('\n');
  assert.deepEqual(buildContextFindings({ id: 'cabinet' }, df, IGNORE, CONTEXT_FILES), []);
});

test('источника нет в дереве вовсе — это ДРУГАЯ находка, чем «исключён»', () => {
  const findings = buildContextFindings(
    { id: 'cabinet' },
    contextDockerfile('COPY docs/tarrifs /app/docs/tariffs'),
    IGNORE,
    CONTEXT_FILES,
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'not-in-tree');
  // Опечатка и исключение лечатся разным: первое — правкой Dockerfile, второе — .dockerignore.
  assert.doesNotMatch(findings[0].detail, /\.dockerignore/u);
});

test('уцелел ХОТЯ БЫ один файл каталога — каталог доезжает', () => {
  // Docker копирует содержимое: каталог, из которого не прошло ничего, для него не существует.
  const findings = buildContextFindings(
    { id: 'office' },
    contextDockerfile('COPY docs/truth /app/docs/truth'),
    IGNORE,
    CONTEXT_FILES,
  );
  assert.deepEqual(findings, []);
});

test('парность исключений НЕ судится — ствол доказал, что правило было догадкой', () => {
  // Офис копирует docs/WHITE_PAPER.md при исключённом `docs` и без строки `!docs/` — и
  // собирается зелёным. Требование пары дало бы три ложных красных на работающем образе.
  const rules = parseDockerignore('docs\n!docs/WHITE_PAPER.md');
  assert.equal(contextDecision(rules, 'docs/WHITE_PAPER.md').included, true);
  const findings = buildContextFindings(
    { id: 'office' },
    contextDockerfile('COPY docs/WHITE_PAPER.md /app/docs/WHITE_PAPER.md'),
    'docs\n!docs/WHITE_PAPER.md',
    ['docs/WHITE_PAPER.md'],
  );
  assert.deepEqual(findings, []);
});

test('комментарии и пустые строки .dockerignore правилами не считаются', () => {
  const rules = parseDockerignore('# комментарий\n\n  docs  \n');
  assert.deepEqual(rules, [{ pattern: 'docs', negated: false }]);
});
