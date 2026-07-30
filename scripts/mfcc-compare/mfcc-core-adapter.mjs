/**
 * ДВА ШВА, КОТОРЫЕ НАДО ЧЕСТНО НАЗВАТЬ: чем считается MFCC и кто проверяет контракт кадра.
 *
 * 1. Ядро `@membrana/mfcc-analyzer-service` (блок `mfcc-core-wrapper`) написано на TypeScript,
 *    но `dist` у него нет и `tsconfig.json` нет: из `.mjs` его импортировать нечем. Чинить
 *    `packages/**` мне запрещено зоной блока, поэтому здесь стоит загрузчик: **есть сборка —
 *    берём ядро; нет — берём подставку и говорим об этом в каждой строке отчёта**.
 * 2. `meyda` не установлена нигде в дереве (`require.resolve` падает и от корня, и от демо,
 *    и от самого пакета). Ядро принимает извлекатель ПАРАМЕТРОМ — тип шва `MfccExtractor`, —
 *    поэтому запасной извлекатель (мел-фильтробанк + DCT поверх нашего же FFT) живёт здесь,
 *    в зоне harness. Это «запасной путь» из `docs/tasks/research/mfcc-lib-choice-DECISION.md`,
 *    а не подмена библиотеки украдкой: провенанс печатается рядом с каждым числом.
 *
 * Вердикт тимлида по этой развилке: harness обязан нести запасной извлекатель и пометить в
 * отчёте, каким извлекателем считано. Отчёт не имеет права выдать эти числа за meyda.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CORE_DIST = ['packages', 'services', 'mfcc-analyzer', 'dist', 'index.js'];

/**
 * Подставка ядра — ТОЛЬКО три отказа из контракта `types.ts` и ничего сверх.
 * Она не «маленькое ядро»: у неё нет ни движка, ни накопления, и ни одно число из неё
 * не имеет права попасть в отчёт без метки `core: stand-in`.
 */
function standInProcessWindow(window, config, extract) {
  if (!Number.isInteger(config.melBands) || config.melBands < 1) {
    return { ok: false, reason: `melBands=${config.melBands} — не целое ≥ 1` };
  }
  if (config.numberOfCoefficients > config.melBands) {
    return { ok: false, reason: `numberOfCoefficients=${config.numberOfCoefficients} > melBands=${config.melBands}` };
  }
  if (window.samples.length !== config.bufferSize) {
    return { ok: false, reason: `длина кадра ${window.samples.length} ≠ bufferSize ${config.bufferSize}` };
  }
  const raw = extract(window.samples, config);
  if (!Array.isArray(raw) || raw.length !== config.numberOfCoefficients) {
    return { ok: false, reason: `извлекатель вернул ${Array.isArray(raw) ? raw.length : 'не массив'}` };
  }
  if (raw.some((v) => !Number.isFinite(v))) return { ok: false, reason: 'нечисловое значение в векторе' };
  return {
    ok: true,
    vector: {
      coefficients: Float32Array.from(raw),
      windowStartIndex: window.startIndex,
      configHash: `mel${config.melBands}-c${config.numberOfCoefficients}-buf${config.bufferSize}`,
    },
  };
}

/**
 * Открыть ядро. Возвращает `processWindow` и провенанс: `built` — настоящее ядро блока 1,
 * `stand-in` — подставка с причиной. Причина едет наружу целиком, а не как флаг.
 */
export async function openMfccCore(root) {
  const dist = join(root, ...CORE_DIST);
  if (existsSync(dist)) {
    try {
      const mod = await import(pathToFileURL(dist).href);
      return { provenance: { core: 'built', reason: dist }, processWindow: mod.processWindow };
    } catch (error) {
      return {
        provenance: { core: 'stand-in', reason: `сборка есть, но не грузится: ${error.message}` },
        processWindow: standInProcessWindow,
      };
    }
  }
  return {
    provenance: {
      core: 'stand-in',
      reason: `нет ${dist.replace(root, '.')} (у пакета нет dist и нет tsconfig.json; правка packages/** вне зоны блока)`,
    },
    processWindow: standInProcessWindow,
  };
}

const hzToMel = (hz) => 2595 * Math.log10(1 + hz / 700);
const melToHz = (mel) => 700 * (10 ** (mel / 2595) - 1);

/** Треугольный мел-фильтробанк по бинам FFT. Зависит от (melBands, bufferSize, sampleRate). */
function buildFilterBank(melBands, fftSize, sampleRate) {
  const bins = fftSize / 2;
  const points = [];
  const maxMel = hzToMel(sampleRate / 2);
  for (let i = 0; i < melBands + 2; i++) {
    points.push(Math.floor((melToHz((i * maxMel) / (melBands + 1)) * fftSize) / sampleRate));
  }
  const bank = [];
  for (let m = 1; m <= melBands; m++) {
    const [lo, mid, hi] = [points[m - 1], points[m], points[m + 1]];
    const weights = new Float64Array(bins);
    for (let k = lo; k < Math.min(hi, bins); k++) {
      if (k < mid) weights[k] = mid === lo ? 1 : (k - lo) / (mid - lo);
      else weights[k] = hi === mid ? 1 : (hi - k) / (hi - mid);
    }
    bank.push(weights);
  }
  return bank;
}

/**
 * Запасной извлекатель: |FFT| → мел-энергии → log → DCT-II. Библиотеки нет, математика
 * известна (акт исследования назвал этот путь запасным явно).
 *
 * Спектр кадра кешируется по объекту кадра: сетка параметров гоняет один и тот же кадр
 * до восемнадцати раз, и пересчитывать FFT ради разного числа фильтров — сжигать время
 * без изменения результата. Кеш детерминизма не трогает.
 */
export function createMelExtractor(FftCore, sampleRate) {
  const ffts = new Map();
  const banks = new Map();
  const spectra = new WeakMap();
  return (samples, config) => {
    const size = config.bufferSize;
    if (!ffts.has(size)) ffts.set(size, new FftCore(size));
    let cached = spectra.get(samples);
    if (!cached || cached.size !== size) {
      cached = { size, magnitudes: ffts.get(size).computeMagnitudes(samples) };
      spectra.set(samples, cached);
    }
    const bankKey = `${config.melBands}-${size}`;
    if (!banks.has(bankKey)) banks.set(bankKey, buildFilterBank(config.melBands, size, sampleRate));
    const bank = banks.get(bankKey);

    const logEnergies = bank.map((weights) => {
      let acc = 0;
      for (let k = 0; k < weights.length; k++) acc += weights[k] * cached.magnitudes[k];
      // Пол под логарифмом: тишина в кадре не имеет права превратиться в -Infinity и
      // отравить усреднение молча.
      return Math.log(Math.max(acc, 1e-10));
    });

    const out = [];
    for (let k = 0; k < config.numberOfCoefficients; k++) {
      let acc = 0;
      for (let n = 0; n < logEnergies.length; n++) {
        acc += logEnergies[n] * Math.cos((Math.PI * k * (n + 0.5)) / logEnergies.length);
      }
      out.push(acc);
    }
    return out;
  };
}
