/**
 * Зуб единственности носителя подготовки окна.
 *
 * ПОВОД, ЗАМЕРЕННЫЙ 02.08. Обход кадров жил в дереве в ЧЕТЫРЁХ копиях: приватная `iterWindows`
 * в `detector-base/src/analyze-sample.ts` и по одной у гармонического, кепстрального и
 * flux-детекторов. Тела совпадали до символа. Цена дублирования измерена: дефект «детектор
 * слышит первые `fftSize` сэмплов вместо всей записи» починили в одном пакете 01.08, а два
 * других слышали 43 мс вместо пяти секунд ещё сутки.
 *
 * ЗАЧЕМ ЗУБ, А НЕ ВНИМАТЕЛЬНОСТЬ. Пятая копия заводится одной строкой и ничем не выдаёт себя:
 * она компилируется, проходит зубы своего пакета и расходится с носителем молча — ровно как
 * разошлись четыре предыдущие.
 *
 * ЗУБ ЖИВЁТ В КОРНЕВЫХ СКРИПТАХ НАМЕРЕННО. Свойство межпакетное; проверять его изнутри одного
 * пакета значило бы дать пакету читать чужие исходники.
 *
 * Прогон: `node --test scripts/detectors-window-carrier.test.mjs`
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Единственный законный носитель. */
const CARRIER = 'packages/services/detectors/base/src/sample-window.ts';

/** Сам зуб — не носитель: искомые строки лежат в нём литералами. */
const SELF = 'scripts/detectors-window-carrier.test.mjs';

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', '.git']);

/** Исходники пакетов — только `src`, только TypeScript. Сборка и вендор не считаются. */
function listPackageSources() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name));
      } else if (/.(ts|mts|mjs|js)$/u.test(e.name) && !e.name.endsWith('.d.ts')) {
        out.push(join(dir, e.name).slice(repoRoot.length + 1).replaceAll('\\', '/'));
      }
    }
  };
  // Обход шире пакетов: копия обхода кадров в scripts/ или apps/ так же тиха и так же
  // разойдётся с носителем (замечание ревью PR #1648, P2). Фильтр по /src/ снят вместе с
  // сужением: у корневых скриптов такого каталога нет.
  for (const top of ['packages', 'scripts', 'apps']) {
    const root = join(repoRoot, top);
    if (existsSync(root) && statSync(root).isDirectory()) walk(root);
  }
  // Сам зуб из обхода исключён: он держит искомые строки литералами и после расширения
  // обхода на scripts/ немедленно поймал себя — ложное красное на собственном тексте.
  return out.filter((rel) => rel !== SELF);
}

const sources = listPackageSources();
const read = (rel) => readFileSync(join(repoRoot, rel), 'utf8');

test('обход исходников что-то нашёл — иначе зуб проверял бы пустоту', () => {
  assert.ok(sources.length > 50, `файлов в обходе ${sources.length}`);
  assert.ok(sources.includes(CARRIER), `носитель не найден обходом: ${CARRIER}`);
});

test('цикл обхода кадров встречается РОВНО в одном файле — носителе', () => {
  // Ищем тело цикла, а не имя функции: копию легко переименовать, а шаг по кадрам — нет.
  const needle = 'start + fftSize <= samples.length';
  const carriers = sources.filter((rel) => read(rel).includes(needle));
  assert.deepEqual(
    carriers,
    [CARRIER],
    `обход кадров размножился: ${carriers.join(', ')}`,
  );
});

test('дополнение короткого буфера объявлено РОВНО в носителе', () => {
  const decl = 'export function prepareFftSamples';
  const carriers = sources.filter((rel) => read(rel).includes(decl));
  assert.deepEqual(carriers, [CARRIER], `подготовка окна размножилась: ${carriers.join(', ')}`);
});

test('своды спектров объявлены РОВНО в носителе, и их по-прежнему два', () => {
  // Два свода — не дублирование, а два ответа на две природы: арифметика линейным меркам,
  // геометрия кепстру. Зуб держит и единственность объявления, и само их число.
  for (const decl of ['export function averageMagnitudes', 'export function geometricMeanMagnitudes']) {
    const carriers = sources.filter((rel) => read(rel).includes(decl));
    assert.deepEqual(carriers, [CARRIER], `${decl}: ${carriers.join(', ')}`);
  }
});

test('детекторы берут окно из пакета-носителя, а не из соседнего файла', () => {
  const detectors = sources.filter((rel) => /\/detectors\/(harmonic|cepstral|spectral-flux)\/src\//u.test(rel));
  assert.ok(detectors.length >= 3, `детекторных исходников ${detectors.length}`);

  const localImports = detectors.filter((rel) => /from '\.{1,2}\/(core\/)?sample-window\.js'/u.test(read(rel)));
  assert.deepEqual(localImports, [], `остался импорт местной копии: ${localImports.join(', ')}`);
});

/**
 * Укрепления по разбору Дынина 02.08. Прежние пять проверок были ложно-отрицательны в трёх
 * местах: магическая двойка вместо биекции «природа ↔ свод», рецидив по ИМЕНИ приватной
 * функции ловился бы только через тело цикла, и ничто не держало публичность носителя.
 */

/**
 * Своды и природы, которым они отвечают. Список — акт признания: добавить свод значит
 * дописать сюда строку с природой, а не просто объявить функцию.
 */
const EXPECTED_MEANS = Object.freeze([
  ['averageMagnitudes', 'мерка линейна по спектру'],
  ['geometricMeanMagnitudes', 'классификатор берёт логарифм'],
]);

test('сводов ровно столько, сколько признанных природ — биекция, а не число', () => {
  const declared = sources
    .filter((rel) => rel === CARRIER)
    .flatMap((rel) => [...read(rel).matchAll(/export function (\w*Magnitudes)\b/gu)].map((m) => m[1]));

  assert.deepEqual(
    declared.sort(),
    EXPECTED_MEANS.map(([name]) => name).sort(),
    'новый свод заводится ТОЛЬКО вместе со строкой природы в EXPECTED_MEANS',
  );
});

test('приватного обхода кадров по имени в детекторах нет — прямой рецидив 02.08', () => {
  // Пакет-носитель исключён целиком: звать своё же по относительному пути ему законно, и
  // первая редакция зуба ловила именно его — ложное красное на правильном коде.
  const CARRIER_PACKAGE = 'packages/services/detectors/base/';
  const guilty = sources.filter(
    (rel) =>
      !rel.startsWith(CARRIER_PACKAGE) &&
      /\b(iterWindows|fftFrames|sampleWindows)\s*\(/u.test(read(rel)) &&
      !read(rel).includes('@membrana/detector-base'),
  );
  assert.deepEqual(guilty, [], `обход объявлен или зовётся мимо носителя: ${guilty.join(', ')}`);
});

test('носитель доступен через публичный вход пакета, а не глубоким путём', () => {
  const index = read('packages/services/detectors/base/src/index.ts');
  for (const [name] of EXPECTED_MEANS) assert.ok(index.includes(name), `${name} не реэкспортирован`);
  assert.ok(index.includes('fftFrames'), 'fftFrames не реэкспортирован');
  assert.ok(index.includes('prepareFftSamples'), 'prepareFftSamples не реэкспортирован');
});

test('носитель жив: хотя бы один детектор действительно им пользуется', () => {
  // Единственность объявления совместима с мёртвым кодом — живость проверяется отдельно.
  const users = sources.filter(
    (rel) => rel !== CARRIER && read(rel).includes("from '@membrana/detector-base'") && /prepareFftSamples|fftFrames|Magnitudes/u.test(read(rel)),
  );
  assert.ok(users.length >= 3, `потребителей носителя ${users.length}, ожидались три детектора`);
});
