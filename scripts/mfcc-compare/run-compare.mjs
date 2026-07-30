/**
 * СРАВНИТЕЛЬНЫЙ ПРОГОН: один и тот же звук, два пути — MFCC-ядро и гармонический анализ на FFT.
 *
 * Блок `mfcc-compare-run`. Прогон обязан дать результат в любом случае: либо MFCC различает на
 * нашем материале, либо не различает — второе тоже данные. Чего он делать НЕ имеет права:
 * печатать проценты, когда живого набора нет, и выдавать фикстурный прогон за боевой.
 *
 * Запуск:
 *   node scripts/mfcc-compare/run-compare.mjs --at 2026-07-30T18:00:00Z
 *   node scripts/mfcc-compare/run-compare.mjs --fixtures --at <ISO>   # механика без живого набора
 *   node scripts/mfcc-compare/run-compare.mjs --frames 8 --seed 7 --limit 40
 *
 * Время и сид — ПАРАМЕТРЫ: ни `Date.now()`, ни `Math.random()` в стенде нет, иначе два прогона
 * на одних данных дадут разные числа и сравнивать будет нечего.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readWavMono } from '../lib/wav-read.mjs';
import {
  bootstrapAucCi,
  comparisonVerdict,
  corpusBias,
  discriminationVerdict,
  fitCentroidModel,
  groupLeak,
  groupOf,
  meanVector,
  mfccScore,
  seededRng,
  splitByGroups,
} from './compare-lab.mjs';
import { createMelExtractor, openMfccCore } from './mfcc-core-adapter.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORPUS = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const HARMONIC_DIST = join(ROOT, 'packages', 'services', 'detectors', 'harmonic', 'dist', 'index.js');
const FFT_DIST = join(ROOT, 'packages', 'services', 'fft-analyzer', 'dist', 'math', 'fft.js');

/**
 * Сетка под дрон из акта исследования: 16–40 фильтров, 13–30 коэффициентов, кадр 25–100 мс.
 * Кадр назван в миллисекундах, а взят степенью двойки: наш FFT — radix-2, и 25 мс при 48 кГц
 * (1200 сэмплов) он не считает. Ближайшие узлы внутри вилки — 2048 (42.7 мс) и 4096 (85.3 мс);
 * нижний край вилки 25 мс нашим ядром НЕДОСТИЖИМ, и это ограничение, а не выбор.
 */
const GRID = { melBands: [16, 26, 40], coefficients: [13, 20, 30], bufferSizes: [2048, 4096] };

function parseArgs(argv) {
  const val = (name, fallback) => {
    const i = argv.indexOf(name);
    return i > -1 ? argv[i + 1] : fallback;
  };
  return {
    at: val('--at', null),
    frames: Number(val('--frames', 8)),
    seed: Number(val('--seed', 7)),
    bootSeed: Number(val('--boot-seed', 11)),
    limit: Number(val('--limit', 0)),
    corpus: val('--corpus', CORPUS),
    fixtures: argv.includes('--fixtures'),
  };
}

/** Живой набор либо фикстуры — решается наличием файлов, а не флагом настроения. */
async function loadDataset({ corpus, fixtures, limit, seed }) {
  if (!fixtures && existsSync(join(corpus, 'drone')) && existsSync(join(corpus, 'not-drone'))) {
    const items = [];
    for (const [label, dir] of [['drone', join(corpus, 'drone')], ['not-drone', join(corpus, 'not-drone')]]) {
      for (const file of (await readdir(dir)).filter((f) => f.endsWith('.wav'))) {
        const id = file.replace(/\.wav$/, '');
        items.push({ id, truthDrone: label === 'drone', group: groupOf(id), path: join(dir, file) });
      }
    }
    if (items.length > 0) {
      const kept = limit > 0 ? items.filter((_, i) => i % Math.ceil(items.length / limit) === 0) : items;
      for (const it of kept) {
        const { samples, sampleRate } = await readWavMono(it.path);
        it.samples = samples;
        it.sampleRate = sampleRate;
      }
      // Источники записи — не украшение отчёта. MFCC хрупок к рассогласованию канала
      // (акт исследования), поэтому «дроны из двух датасетов против ESC-50» — это набор, на
      // котором высокий AUC может означать узнавание КАНАЛА ЗАПИСИ, а не дрона.
      let sources = null;
      const manifest = join(corpus, 'manifest.json');
      if (existsSync(manifest)) {
        const parsed = JSON.parse(await readFile(manifest, 'utf8'));
        sources = parsed.sources ?? null;
      }
      return { kind: 'live', reason: corpus.replace(ROOT, '.'), items: kept, sources };
    }
  }
  // Фикстуры: детерминированный синтез. Механику проверяют, о материале НЕ говорят.
  const rng = seededRng(seed);
  const sampleRate = 48_000;
  const items = [];
  for (let n = 0; n < 12; n++) {
    const truthDrone = n % 2 === 0;
    const samples = new Float32Array(sampleRate);
    const f0 = 110 + (n % 3) * 20;
    for (let i = 0; i < samples.length; i++) {
      let v = (rng() - 0.5) * 0.2;
      if (truthDrone) for (let h = 1; h <= 6; h++) v += (0.5 / h) * Math.sin((2 * Math.PI * f0 * h * i) / sampleRate);
      samples[i] = v;
    }
    items.push({ id: `fixture-${truthDrone ? 'drone' : 'other'}-${n}`, truthDrone, group: `solo:fixture-${n}`, samples, sampleRate });
  }
  return {
    kind: 'fixtures',
    reason: fixtures ? 'запрошены флагом --fixtures' : `живого набора нет по пути ${corpus.replace(ROOT, '.')}`,
    items,
  };
}

/** Кадры берутся равномерно по записи — детерминированно, без случайного выбора момента. */
function framesOf(samples, bufferSize, count) {
  const out = [];
  const span = Math.max(1, Math.floor((samples.length - bufferSize) / Math.max(1, count - 1)));
  for (let i = 0; i < count; i++) {
    const start = i * span;
    if (start + bufferSize > samples.length) break;
    out.push({ start, samples: samples.slice(start, start + bufferSize) });
  }
  return out;
}

const fmt = (v, d = 3) => (v == null ? '  —  ' : v.toFixed(d));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.at) {
    console.error('Нужен --at <ISO>: время прогона приходит параметром, часов внутри стенда нет.');
    process.exitCode = 1;
    return;
  }

  const { FftCore } = await import(pathToFileURL(FFT_DIST).href);
  const { createHarmonicDetector } = await import(pathToFileURL(HARMONIC_DIST).href);
  const core = await openMfccCore(ROOT);
  const dataset = await loadDataset(args);
  const sampleRate = dataset.items[0].sampleRate;
  const extract = createMelExtractor(FftCore, sampleRate);

  const split = splitByGroups(dataset.items, { seed: args.seed });
  const leak = groupLeak(split.train, split.test);
  const bias = corpusBias(dataset.sources);

  console.log('=== ПРОВЕНАНС ПРОГОНА (читать до чисел) ===');
  console.log(`  время прогона        : ${args.at} (параметр, не часы стенда)`);
  console.log(`  ядро MFCC            : ${core.provenance.core} — ${core.provenance.reason}`);
  console.log('  извлекатель          : reference-melbank-dct (meyda НЕ установлена в дереве)');
  console.log('                         → это НЕ та библиотека, что поедет в прод; числа несравнимы с meyda');
  console.log(`  набор                : ${dataset.kind} — ${dataset.reason}`);
  console.log(`  сэмплов              : ${dataset.items.length} (дронов ${dataset.items.filter((i) => i.truthDrone).length})`);
  console.log(`  сплит по группам     : train ${split.train.length} / test ${split.test.length}, сид ${args.seed}`);
  console.log(`  утечка групп         : ${leak.length === 0 ? '0 групп по обе стороны' : leak.join(', ')}`);
  console.log(`  кадров на сэмпл      : ${args.frames}, равномерно; агрегация — среднее, ОДИНАКОВО для обоих путей`);
  if (dataset.sources) {
    console.log(`  источники дронов     : ${(dataset.sources.drone ?? []).join(' + ') || '—'}`);
    console.log(`  источники не-дронов  : ${(dataset.sources.notDrone ?? []).join(' + ') || '—'}`);
  }
  console.log(`  конфаундер тракта    : ${bias.biased ? 'ЕСТЬ' : 'нет'} — ${bias.reason}`);
  if (bias.biased) {
    console.log('                         → направленный вердикт («MFCC лучше гармоники») ПОНИЖЕН до');
    console.log('                         undecided_corpus_bias по требованию ревью: высокий AUC на таком');
    console.log('                         наборе может означать узнавание канала записи, а не дрона.');
    console.log('                         Снимается набором «один тракт — два класса», которого у нас нет.');
  }
  console.log('  окно гармоники       : detect() внутри берёт ПЕРВЫЕ fftSize сэмплов — поэтому здесь');
  console.log('                         он зовётся покадрово, а не на всю запись: иначе гармоника слышит 43 мс,');
  console.log('                         а MFCC — всю запись, и сравнение врёт в пользу MFCC');
  console.log('  порог гармоники      : 0.55 (калибровка в тестах пакета). На ROC-AUC порог не влияет —');
  console.log('                         AUC ранговый; влияет он на F1, которого здесь нет намеренно');
  if (dataset.kind === 'fixtures') {
    console.log('\n!!! ЖИВОГО НАБОРА НЕТ. Ниже — самопроверка МЕХАНИКИ на синтетике.');
    console.log('    Вердикт о материале: defined:false, причина — ' + dataset.reason);
    console.log('    Переносить эти числа на реальные звуки ЗАПРЕЩЕНО.');
  }

  // --- Гармонический путь: свой прогон на каждый размер кадра ---
  const harmonic = new Map();
  const harmonicMax = new Map();
  for (const bufferSize of GRID.bufferSizes) {
    const detector = createHarmonicDetector({ fftSize: bufferSize, sampleRate });
    const byMean = [];
    const byMax = [];
    for (const item of split.test) {
      const frames = framesOf(item.samples, bufferSize, args.frames);
      const confidences = [];
      for (const frame of frames) {
        const r = await detector.detect({ samples: frame.samples, sampleRate, timestamp: frame.start, durationSec: bufferSize / sampleRate });
        confidences.push(r.confidence);
      }
      const mean = confidences.length === 0 ? 0 : confidences.reduce((a, b) => a + b, 0) / confidences.length;
      byMean.push({ truthDrone: item.truthDrone, maxConfidence: mean });
      byMax.push({ truthDrone: item.truthDrone, maxConfidence: confidences.length === 0 ? 0 : Math.max(...confidences) });
    }
    harmonic.set(bufferSize, bootstrapAucCi(byMean, { seed: args.bootSeed }));
    harmonicMax.set(bufferSize, bootstrapAucCi(byMax, { seed: args.bootSeed }));
  }

  console.log('\n=== ГАРМОНИЧЕСКИЙ ПУТЬ (FFT), тот же неподвижный тест ===');
  console.log('кадр   | AUC (среднее) | 90% интервал      | AUC (максимум) — проверка чувствительности');
  for (const bufferSize of GRID.bufferSizes) {
    const ci = harmonic.get(bufferSize);
    const alt = harmonicMax.get(bufferSize);
    const ms = ((bufferSize / sampleRate) * 1000).toFixed(1);
    console.log(
      ci.defined
        ? `${String(bufferSize).padStart(5)} | ${fmt(ci.value)}         | [${fmt(ci.low)}; ${fmt(ci.high)}] | ${fmt(alt.value)}  (${ms} мс)`
        : `${String(bufferSize).padStart(5)} | НЕ ОПРЕДЕЛЁН: ${ci.reason}`,
    );
  }
  console.log('  Сравнение ведётся по СРЕДНЕМУ (левая колонка). Максимум показан рядом потому, что смена');
  console.log('  агрегации способна перевернуть вердикт: если колонки расходятся, спор идёт о правиле сборки');
  console.log('  кадров в сэмпл, а не о том, что слышит детектор.');

  // --- MFCC путь по сетке параметров ---
  console.log('\n=== MFCC-ПУТЬ ПО СЕТКЕ (фильтры × коэффициенты × кадр) ===');
  console.log('мел | коэф | кадр  | AUC   | 90% интервал      | вердикт различения | против гармоники');
  const rows = [];
  for (const bufferSize of GRID.bufferSizes) {
    const framesByItem = new Map(dataset.items.map((i) => [i.id, framesOf(i.samples, bufferSize, args.frames)]));
    for (const melBands of GRID.melBands) {
      for (const numberOfCoefficients of GRID.coefficients) {
        const config = { melBands, numberOfCoefficients, bufferSize };
        let refusal = null;
        const vectors = new Map();
        for (const item of dataset.items) {
          const frameVectors = [];
          for (const frame of framesByItem.get(item.id)) {
            const window = { samples: frame.samples, sampleRate, startIndex: frame.start, nodeId: null };
            const result = core.processWindow(window, config, extract);
            if (!result.ok) { refusal = result.reason; break; }
            frameVectors.push(result.vector.coefficients);
          }
          if (refusal) break;
          vectors.set(item.id, meanVector(frameVectors));
        }
        if (refusal) {
          console.log(`${String(melBands).padStart(3)} | ${String(numberOfCoefficients).padStart(4)} | ${String(bufferSize).padStart(5)} | ОТКАЗ ЯДРА: ${refusal}`);
          rows.push({ melBands, numberOfCoefficients, bufferSize, refusal });
          continue;
        }
        const withVectors = (items) => items.map((i) => ({ ...i, vector: vectors.get(i.id) }));
        const model = fitCentroidModel(withVectors(split.train));
        if (!model.defined) {
          console.log(`${String(melBands).padStart(3)} | ${String(numberOfCoefficients).padStart(4)} | ${String(bufferSize).padStart(5)} | НЕ ОПРЕДЕЛЁН: ${model.reason}`);
          rows.push({ melBands, numberOfCoefficients, bufferSize, refusal: model.reason });
          continue;
        }
        const score = (items) => items.map((i) => ({ truthDrone: i.truthDrone, maxConfidence: mfccScore(model, i.vector) }));
        const ci = bootstrapAucCi(score(withVectors(split.test)), { seed: args.bootSeed });
        // Балл на TRAIN нужен не ради красоты: настройка выбирается по нему, иначе выбор лучшей
        // строки из восемнадцати делается по тесту и завышает итог отбором.
        const trainCi = bootstrapAucCi(score(withVectors(split.train)), { seed: args.bootSeed });
        const discrimination = discriminationVerdict(ci);
        const comparison = comparisonVerdict(ci, harmonic.get(bufferSize), { bias });
        rows.push({ melBands, numberOfCoefficients, bufferSize, ci, trainCi, discrimination, comparison });
        console.log(
          `${String(melBands).padStart(3)} | ${String(numberOfCoefficients).padStart(4)} | ${String(bufferSize).padStart(5)} | ` +
            `${fmt(ci.value)} | [${fmt(ci.low)}; ${fmt(ci.high)}] | ${discrimination.verdict.padEnd(18)} | ${comparison.verdict} (Δ ${fmt(comparison.delta)})`,
        );
      }
    }
  }

  // --- Итог: предикатами, без пересказа ---
  const scoredRows = rows.filter((r) => r.ci?.defined);
  console.log('\n=== ИТОГ ===');
  if (scoredRows.length === 0) {
    console.log('КОРПУСА НЕТ либо все настройки отвергнуты ядром — сравнения не произошло.');
    console.log('Это отказ с причиной, а не «нарушений 0».');
    return;
  }
  // Настройка выбирается ПО TRAIN, отчёт по ней — на тесте. Строка «лучшая по тесту» печатается
  // рядом справочно и вердикта не несёт: выбор максимума из восемнадцати по тесту и есть тот
  // самый красивый неверный вывод, о котором предупреждал тимлид.
  const best = scoredRows.reduce((a, b) => ((b.trainCi?.value ?? 0) > (a.trainCi?.value ?? 0) ? b : a));
  const bestOnTest = scoredRows.reduce((a, b) => (b.ci.value > a.ci.value ? b : a));
  console.log(`настройка выбрана по TRAIN: мел ${best.melBands} / коэф ${best.numberOfCoefficients} / кадр ${best.bufferSize}`);
  console.log(`  AUC на тесте     : ${fmt(best.ci.value)} [${fmt(best.ci.low)}; ${fmt(best.ci.high)}]`);
  console.log(`  различение       : ${best.discrimination.verdict} — ${best.discrimination.reason}`);
  console.log(`  против гармоники : ${best.comparison.verdict} — ${best.comparison.reason}`);
  console.log(
    `  справочно        : лучшая по ТЕСТУ — мел ${bestOnTest.melBands} / коэф ${bestOnTest.numberOfCoefficients} / ` +
      `кадр ${bestOnTest.bufferSize}, AUC ${fmt(bestOnTest.ci.value)}; вердикта эта строка не несёт (отбор по тесту)`,
  );
  console.log(`настроек отвергнуто: ${rows.filter((r) => r.refusal).length} из ${rows.length}`);
  if (bias.biased) {
    console.log('проверка, снимающая неопределённость: прогнать оба пути на наборе, где дрон и фон');
    console.log('  записаны ОДНИМ трактом. Поднимется гармоника — дело в корпусе; не поднимется — в ней.');
  }
  console.log('порог паритета 0.05 назначен тимлидом ДО измерения — //provisional, не мерянная величина.');
  if (dataset.kind === 'fixtures') {
    console.log('НАБОР ФИКСТУРНЫЙ: вердикт о материале defined:false. Числа выше описывают механику, не звук.');
  }
}

await main();
