/**
 * Benchmark detectors on data/detectors-benchmark manifest (v0.2 free-v1 catalog).
 *
 * Usage:
 *   yarn benchmark:detectors                                   # канон: v0.2, патчит DETECTOR_BENCHMARK.md
 *   yarn benchmark:detectors -- --manifest data/detectors-benchmark/vdr-hard-gate-pilot/manifest.json
 *   yarn benchmark:detectors -- --manifest <...> --origin-labels
 *   yarn benchmark:detectors -- --mfcc-strictness strict      # рабочая точка тембрового
 *
 * vdr-hg3: `--manifest` — прогон на альтернативном корпусе (отчёт пишется в
 * reports/ ЭТОГО корпуса; канонический DETECTOR_BENCHMARK.md и v0.2 latest.json
 * НЕ трогаются). `--origin-labels` — ПРЕДВАРИТЕЛЬНЫЙ прогон по originLabel
 * (провенанс, НЕ операторская истина — консилиум vdr-validation-scope-2026-07-03);
 * отчёт помечается preliminaryOriginLabels и не является gate-результатом.
 */
import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { detectorMetrics, sortNumbers } from './lib/benchmark-metrics.mjs';
import { patchDetectorBenchmarkMd } from './lib/benchmark-report-md.mjs';
import { loadCalibrationPreset } from './lib/calibration-preset.mjs';
import { filterCuratedSamples } from './lib/manifest-labels.mjs';
import {
  MFCC_DEFAULT_STRICTNESS,
  MFCC_STRICTNESS_LEVELS,
  mfccConfigFromHash,
  mfccPipeSpec,
  mfccPresetProblem,
  mfccSelfMeasurement,
  mfccVectorsOf,
} from './lib/mfcc-benchmark.mjs';
import { frames } from './lib/mfcc-gates.mjs';
import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DATASET_DIR = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const DEFAULT_MANIFEST_PATH = join(DEFAULT_DATASET_DIR, 'manifest.json');
const BENCHMARK_MD = join(ROOT, 'docs', 'DETECTOR_BENCHMARK.md');

// Экспортируется для зубов (`benchmark-detectors.test.mjs`): закрытые списки аргументов —
// ровно то место, где молчаливая подстановка умолчания меняет вердикт, не роняя прогон.
export function parseArgs(argv) {
  const options = {
    manifestPath: DEFAULT_MANIFEST_PATH,
    originLabels: false,
    reportPath: null,
    // ADR-0006 Р1: боевая конфигурация — умолчание. `defaults` остаётся как
    // ОТЛАДОЧНЫЙ режим и обязан быть помечен в отчёте: цифрой боевой
    // поверхности он называться не вправе.
    config: 'live',
    strictSplit: false,
    // Рабочая точка тембрового детектора. Умолчание — то, с которым живёт прибор; выбирать
    // уровень по итогу прогона значило бы отобрать порог по тесту.
    mfccStrictness: MFCC_DEFAULT_STRICTNESS,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--manifest' && argv[i + 1]) {
      options.manifestPath = resolve(ROOT, argv[++i]);
    } else if (argv[i] === '--origin-labels') {
      options.originLabels = true;
    } else if (argv[i] === '--config' && argv[i + 1]) {
      const value = argv[++i];
      if (value !== 'live' && value !== 'defaults') {
        throw new Error(`--config принимает live|defaults, получено: ${value}`);
      }
      options.config = value;
    } else if (argv[i] === '--mfcc-strictness' && argv[i + 1]) {
      const value = argv[++i];
      if (!MFCC_STRICTNESS_LEVELS.includes(value)) {
        throw new Error(
          `--mfcc-strictness принимает ${MFCC_STRICTNESS_LEVELS.join('|')}, получено: ${value}`,
        );
      }
      options.mfccStrictness = value;
    } else if (argv[i] === '--strict-split') {
      // Внешний корпус (напр. DADS) обязан нести собственный test-split:
      // подмена сплита всем корпусом на нём выдаёт чужую цифру за тестовую.
      options.strictSplit = true;
    } else if (argv[i] === '--report' && argv[i + 1]) {
      // drift-anchor code-anchor (#404): отчёт в сторону, канонические
      // reports/latest.json и DETECTOR_BENCHMARK.md НЕ трогаются.
      options.reportPath = resolve(ROOT, argv[++i]);
    }
  }
  // Канонический MD патчится ТОЛЬКО дефолтным (v0.2) прогоном по операторским меткам.
  options.isCanonicalRun =
    options.manifestPath === DEFAULT_MANIFEST_PATH && !options.originLabels && !options.reportPath;
  return options;
}

/**
 * Эффективные метки: операторская label; при --origin-labels для unlabeled
 * берётся originLabel (провенанс) — только предварительный пайплайн-смоук.
 */
function applyOriginLabels(samples) {
  return samples.map((entry) =>
    entry.label === 'unlabeled' && (entry.originLabel === 'drone' || entry.originLabel === 'not-drone')
      ? { ...entry, label: entry.originLabel }
      : entry,
  );
}
// Экспортируются для detector-compare-export.mjs (#452): один источник путей
// dist и curated-шаблонов, чтобы сравнение гоняло РОВНО ту же конфигурацию.
export const TEMPLATE_MATCH_DIST = join(
  ROOT,
  'packages',
  'services',
  'detectors',
  'template-match',
  'dist',
  'index.js',
);
// Шаблоны — конфиг детектора, не корпус: всегда из канонического v0.2.
export const CURATED_TEMPLATES_JSON = join(DEFAULT_DATASET_DIR, 'curated-drone-templates.json');
const DETECTOR_BASE_DIST = join(ROOT, 'packages', 'services', 'detectors', 'base', 'dist', 'index.js');

export const DSP_DETECTORS = [
  {
    name: 'harmonic',
    dist: join(ROOT, 'packages', 'services', 'detectors', 'harmonic', 'dist', 'index.js'),
    label: 'harmonic-detector',
    create: (mod) => mod.createHarmonicDetector(),
    fftSize: (mod) => mod.DEFAULT_FFT_SIZE,
  },
  {
    name: 'cepstral',
    dist: join(ROOT, 'packages', 'services', 'detectors', 'cepstral', 'dist', 'index.js'),
    label: 'cepstral-detector',
    create: (mod) => mod.createCepstralDetector(),
    fftSize: (mod) => mod.DEFAULT_FFT_SIZE,
  },
  {
    name: 'spectral-flux',
    dist: join(ROOT, 'packages', 'services', 'detectors', 'spectral-flux', 'dist', 'index.js'),
    label: 'spectral-flux-detector',
    create: (mod) => mod.createSpectralFluxDetector(),
    fftSize: (mod) => mod.DEFAULT_FFT_SIZE,
  },
];

export async function ensureBuilt(distPath, label) {
  try {
    await access(distPath);
  } catch {
    throw new Error(
      `${label} not built. Run: yarn benchmark:detectors (builds detector packages via turbo)`,
    );
  }
}

/**
 * Reused by `drift-anchor-data.mjs` (data-anchor producer, ADR 0004): гоняет
 * тот же детектор на произвольном `{id,path,label}[]` (напр. сэмплы, скачанные
 * с background-media __tariff_dataset__ во временный каталог) — сигнатура
 * не завязана на канонический v0.2 манифест.
 */
export async function runDetector(manifestSamples, spec, datasetDir, sampleOptions = {}) {
  await ensureBuilt(spec.dist, spec.label);
  const { analyzeSample } = await import(pathToFileURL(DETECTOR_BASE_DIST).href);
  const mod = await import(pathToFileURL(spec.dist).href);
  const detector = spec.create(mod);
  const fftSize = spec.fftSize(mod);

  /** @type {{ id: string; truthDrone: boolean; predDrone: boolean; maxConfidence: number }[]} */
  const perSample = [];
  const allLatencies = [];

  for (const entry of manifestSamples) {
    const wavPath = join(datasetDir, entry.path);
    const { samples, sampleRate } = await readWavMono(wavPath);
    const { verdict, frameLatenciesMs } = await analyzeSample(samples, sampleRate, detector, {
      fftSize,
      // Пресет калиброван на детектор по имени; пусто = дефолты пакета
      // (отладочный режим либо детектор, которого в пресете нет).
      ...(sampleOptions[spec.name] ?? {}),
    });
    const truthDrone = entry.label === 'drone';
    perSample.push({
      id: entry.id,
      truthDrone,
      predDrone: verdict.isDrone,
      maxConfidence: verdict.confidence,
    });
    allLatencies.push(...frameLatenciesMs);
  }

  const sortedLat = sortNumbers(allLatencies);

  return {
    name: spec.name,
    family: 'dsp',
    status: 'benchmarked',
    metrics: detectorMetrics(perSample, sortedLat),
    perSample,
  };
}

/**
 * Curated-шаблоны DRONE_TIGHT из канонического v0.2 (fallback — дефолт пакета).
 * Reused by detector-compare-export.mjs — сравнение обязано использовать те же
 * шаблоны, что канонический бенчмарк.
 */
export async function readCuratedDroneTemplates(mod) {
  try {
    return JSON.parse(await readFile(CURATED_TEMPLATES_JSON, 'utf8'));
  } catch {
    return mod.DEFAULT_CURATED_DRONE_TEMPLATES;
  }
}

export async function runTemplateMatch(manifestSamples, datasetDir) {
  await ensureBuilt(TEMPLATE_MATCH_DIST, 'template-match-detector');
  const mod = await import(pathToFileURL(TEMPLATE_MATCH_DIST).href);

  const detector = mod.createTemplateMatchDetector({
    templates: mod.resolveTemplateMatchCatalog(await readCuratedDroneTemplates(mod)),
  });

  /** @type {{ id: string; truthDrone: boolean; predDrone: boolean; maxConfidence: number }[]} */
  const perSample = [];
  const allLatencies = [];

  for (const entry of manifestSamples) {
    const wavPath = join(datasetDir, entry.path);
    const { samples, sampleRate } = await readWavMono(wavPath);
    const verdict = await mod.analyzeTemplateMatch(samples, sampleRate, detector);
    perSample.push({
      id: entry.id,
      truthDrone: entry.label === 'drone',
      predDrone: verdict.isDrone,
      maxConfidence: verdict.confidence,
    });
    allLatencies.push(verdict.latencyMsTotal);
  }

  const sortedLat = sortNumbers(allLatencies);

  return {
    name: 'template-match',
    family: 'dsp',
    status: 'benchmarked',
    metrics: detectorMetrics(perSample, sortedLat),
    perSample,
  };
}

export const YAMNET_NODE_DIST = join(
  ROOT,
  'packages',
  'services',
  'detectors',
  'yamnet',
  'dist',
  'node.js',
);

/**
 * ND3 — yamnet: zero-shot нейро-детектор (бандленные веса + WASM-бэкенд).
 * Паритет с клиентским плагином: весь клип одним AudioWindow (YAMNet сам
 * нарезает фреймы 0.96 с, clip-score = среднее). warmUp до замера — latencyMs
 * детектора не включает одноразовую загрузку графа.
 */
export async function runYamnet(manifestSamples, datasetDir) {
  await ensureBuilt(YAMNET_NODE_DIST, 'yamnet-detector (dist/node.js)');
  const mod = await import(pathToFileURL(YAMNET_NODE_DIST).href);
  const detector = mod.createYamnetDetectorNode();
  await detector.warmUp();

  /** @type {{ id: string; truthDrone: boolean; predDrone: boolean; maxConfidence: number }[]} */
  const perSample = [];
  const allLatencies = [];

  for (const entry of manifestSamples) {
    const wavPath = join(datasetDir, entry.path);
    const { samples, sampleRate } = await readWavMono(wavPath);
    const result = await detector.detect({
      samples,
      sampleRate,
      timestamp: 0,
      durationSec: samples.length / sampleRate,
    });
    perSample.push({
      id: entry.id,
      truthDrone: entry.label === 'drone',
      predDrone: result.isDrone,
      maxConfidence: result.confidence,
    });
    allLatencies.push(result.latencyMs);
  }

  const sortedLat = sortNumbers(allLatencies);

  return {
    name: 'yamnet',
    family: 'neural',
    status: 'benchmarked',
    metrics: detectorMetrics(perSample, sortedLat),
    perSample,
  };
}

export const MFCC_CORE_DIST = join(
  ROOT,
  'packages',
  'services',
  'mfcc-analyzer',
  'dist',
  'index.js',
);

/**
 * Пресет тембрового детектора — КОНФИГ ДЕТЕКТОРА, НЕ КОРПУС, поэтому всегда из канонического
 * v0.2, как и curated-шаблоны выше. Прогон на пилоте судит теми же воротами, иначе строки
 * двух прогонов были бы про разные детекторы.
 *
 * Читается из `data/`, а не переписывается сюда третьей копией: `data/` и есть серверная
 * сторона калибровки (клиентский `presets.ts` — её копия для сборки, и он это про себя
 * говорит). Ворота пересняли — `yarn calibrate:mfcc`, и измеритель поедет на новых без правок.
 */
export const MFCC_PRESET_JSON = join(DEFAULT_DATASET_DIR, 'reports', 'mfcc-gates-first-cut.json');

/**
 * Пресет калибровки с проверкой пригодности. Отказ — с причиной и с названным лекарством:
 * негодный пресет обязан остановить прогон здесь, а не всплыть отказом судьи на сотом файле.
 */
export async function readMfccPreset(strictness = MFCC_DEFAULT_STRICTNESS) {
  const report = JSON.parse(await readFile(MFCC_PRESET_JSON, 'utf8'));
  if (report.preset == null) {
    throw new Error(`${MFCC_PRESET_JSON}: нет ключа preset — снимите ворота: yarn calibrate:mfcc`);
  }
  const problem = mfccPresetProblem(report.preset, strictness);
  if (problem !== null) {
    throw new Error(
      `пресет тембрового детектора негоден: ${problem}\n  источник: ${MFCC_PRESET_JSON}\n  пересъёмка: yarn calibrate:mfcc`,
    );
  }
  // Корпус, на котором СНЯТЫ ворота, едет вместе с пресетом: без него не сказать, судит
  // прибор чужой звук или тот самый, из которого выведены его же коридоры.
  return { ...report.preset, calibratedOn: report.corpus?.path ?? null };
}

/**
 * ND4 — mfcc: тембровый детектор пакета `@membrana/mfcc-analyzer-service` в общей таблице.
 *
 * ЗАЧЕМ ШЕСТЫМ. Критерий приёмки распознавания объявлен владельцем 15.08 ПО MFCC, а обвязка о
 * нём не знала: считались пять других способов, и приёмочное число по заявленному критерию
 * получить было нечем.
 *
 * ЧЕМ СУДИТ. Ровно тем же, чем прибор: труба пакета (`evaluatePipe`) по воротам калибровки.
 * Своей математики здесь нет и быть не должно — измеритель, судящий собственной копией счёта,
 * мерит себя (урок 31.07).
 *
 * ЧЕМ СЧИТАЕТ. `meyda` — той самой библиотекой, которой сняты ворота. СОБСТВЕННЫМ
 * экземпляром настроек, а не глобальным объектом: настройки на общей `Meyda` — общее
 * состояние, и второй потребитель молча перебил бы число фильтров, а вектор продолжал бы
 * ехать под тем же отпечатком (замер и приговор — `mfccExtractor.ts`). Настройки задаются
 * СВОЙСТВАМИ объекта: параметр вызова `Meyda.extract` молча игнорируется.
 *
 * КАДРИРОВАНИЕ. Тем же `frames()`, что и калибровка: подряд, без перекрытия, хвост короче
 * кадра отброшен. Иначе ворота сняты на одном кадрировании, а вердикт вынесен на другом.
 *
 * ОТКАЗ — НЕ ОТРИЦАТЕЛЬНЫЙ ОТВЕТ. Судья отказал (чужая частота, чужой отпечаток, все кадры
 * немые) — прогон падает с именем файла. Записать сюда `predDrone: false` значило бы выдать
 * «судить было нечем» за «дрона нет» и посчитать по этому метрику.
 */
export async function runMfcc(manifestSamples, datasetDir, strictness = MFCC_DEFAULT_STRICTNESS) {
  await ensureBuilt(MFCC_CORE_DIST, 'mfcc-analyzer (dist/index.js)');
  const { evaluatePipe } = await import(pathToFileURL(MFCC_CORE_DIST).href);
  const Meyda = (await import('meyda')).default;

  const preset = await readMfccPreset(strictness);
  const config = mfccConfigFromHash(preset.configHash);
  const spec = mfccPipeSpec(preset, strictness);
  const instance = {
    ...Meyda,
    bufferSize: config.bufferSize,
    melBands: config.melBands,
    numberOfMFCCCoefficients: config.numberOfCoefficients,
    // Частота ЯВНО: банк мел-фильтров строится от неё, и вектор, снятый на умолчании
    // библиотеки, несравним с воротами так же, как кадр чужой длины (#1603).
    sampleRate: config.sampleRate,
  };

  /** @type {{ id: string; truthDrone: boolean; predDrone: boolean; maxConfidence: number }[]} */
  const perSample = [];
  const allLatencies = [];

  for (const entry of manifestSamples) {
    const wavPath = join(datasetDir, entry.path);
    const { samples, sampleRate } = await readWavMono(wavPath);
    if (sampleRate !== config.sampleRate) {
      // Пересчитать вектор под чужие ворота нельзя, поэтому запись не считается, а не
      // подгоняется. Прибор поступает так же и по той же причине.
      throw new Error(
        `${entry.id}: частота записи ${sampleRate} ≠ ${config.sampleRate}, на которой сняты ворота «${preset.configHash}» — несравнимо`,
      );
    }

    const frameVectors = [];
    let startIndex = 0;
    for (const frame of frames(samples, config.bufferSize)) {
      const t0 = performance.now();
      const raw = instance.extract('mfcc', frame);
      allLatencies.push(performance.now() - t0);
      if (!Array.isArray(raw) || raw.length !== config.numberOfCoefficients) {
        throw new Error(
          `${entry.id}: считалка вернула ${Array.isArray(raw) ? `${raw.length} значений` : 'не массив'}, ожидалось ${config.numberOfCoefficients}`,
        );
      }
      if (raw.some((v) => !Number.isFinite(v))) {
        // NaN переживёт любое усреднение и всплывёт метрикой, которую никто не считал.
        throw new Error(`${entry.id}: считалка вернула нечисловое значение (NaN или Infinity)`);
      }
      frameVectors.push({ startIndex, coefficients: raw });
      startIndex += config.bufferSize;
    }

    const outcome = evaluatePipe(mfccVectorsOf(frameVectors, preset.configHash), spec);
    if (!outcome.ok) {
      throw new Error(`${entry.id}: судья отказал — ${outcome.reason}`);
    }
    perSample.push({
      id: entry.id,
      truthDrone: entry.label === 'drone',
      predDrone: outcome.report.detected,
      // Доля прошедших кадров среди судимых — единственная непрерывная величина трубы, и
      // именно по ней прибор объявляет детекцию. Ранговые метрики (ROC-AUC) считаются по ней.
      maxConfidence: outcome.report.passRate,
    });
  }

  const sortedLat = sortNumbers(allLatencies);

  return {
    name: 'mfcc',
    family: 'dsp',
    status: 'benchmarked',
    metrics: detectorMetrics(perSample, sortedLat),
    perSample,
    // Паспорт рабочей точки (ADR-0006 Р3): цифра тембрового детектора без ворот, уровня
    // строгости и порога немого кадра неинтерпретируема.
    passport: {
      configHash: preset.configHash,
      strictness,
      minInBandRatio: spec.minInBandRatio,
      minPassRate: spec.minPassRate,
      minMagnitude: spec.minMagnitude,
      judgedCoefficients: preset.judgedCoefficients,
      situationsCalibrated: preset.situationsCalibrated ?? null,
      presetSource: MFCC_PRESET_JSON.replace(`${ROOT}`, '').replace(/^[/\\]/, '').replace(/\\/g, '/'),
      calibratedOn: preset.calibratedOn,
      // Самозамер обязан доехать до отчёта, а не остаться предупреждением в консоли: цифру
      // читают из JSON, а не из вывода прогона.
      selfMeasurement: mfccSelfMeasurement(preset.calibratedOn, datasetDir),
    },
  };
}

/**
 * Отбор сэмплов канонического прогона: только curated-метки, test-split при
 * наличии. Reused by detector-compare-export.mjs — тот же корпус, что бенчмарк.
 */
export function selectBenchmarkSamples(samples) {
  const curated = filterCuratedSamples(samples);
  const withSplit = curated.filter((s) => s.split === 'test');
  // splitFallback — НЕ деталь исполнения: при пустом test-split прогон меряет
  // весь корпус, включая train, и цифра перестаёт быть тестовой. Раньше это
  // происходило молча (отчёт всё равно печатал «test-split: N файлов»).
  // Флаг обязан доехать до отчёта и до канона.
  const splitFallback = withSplit.length === 0;
  return {
    testSamples: splitFallback ? curated : withSplit,
    skippedUnlabeled: samples.length - curated.length,
    splitFallback,
  };
}

const SCAFFOLD_DETECTORS = [
  { name: 'clap', family: 'neural', status: 'scaffold' },
  { name: 'agentic-claude', family: 'agentic', status: 'scaffold' },
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const datasetDir = dirname(options.manifestPath);
  const reportJson = options.reportPath ?? join(datasetDir, 'reports', 'latest.json');
  await ensureBuilt(DETECTOR_BASE_DIST, 'detector-base');

  const manifest = JSON.parse(await readFile(options.manifestPath, 'utf8'));
  const effectiveSamples = options.originLabels
    ? applyOriginLabels(manifest.samples)
    : manifest.samples;
  const { testSamples, skippedUnlabeled, splitFallback } =
    selectBenchmarkSamples(effectiveSamples);
  if (skippedUnlabeled > 0) {
    console.log(`Skipping ${skippedUnlabeled} unlabeled samples`);
  }
  if (testSamples.length === 0) {
    throw new Error(
      'No labeled samples in manifest — разметьте корпус (или используйте --origin-labels для предварительного прогона)',
    );
  }
  // Подмена сплита всем корпусом перестала быть тихой: на внешнем корпусе она
  // роняет прогон (--strict-split), на каноническом — кричит и едет в отчёт.
  if (splitFallback) {
    if (options.strictSplit) {
      throw new Error(
        `В манифесте нет ни одного сэмпла со split: "test" (${options.manifestPath}).\n` +
          'Прогон по всему корпусу выдал бы train-данные за тестовую цифру. ' +
          'Заведите test-split или снимите --strict-split осознанно.',
      );
    }
    console.warn(
      `⚠ split-fallback: сэмплов со split: "test" нет — меряем ВЕСЬ корпус (${testSamples.length}), включая train.\n` +
        '  Это НЕ тестовая цифра. Для внешнего корпуса используйте --strict-split.',
    );
  }

  // ADR-0006 Р1: боевая конфигурация по умолчанию.
  const preset = options.config === 'live' ? await loadCalibrationPreset() : null;
  const sampleOptions = preset?.options ?? {};
  const configPassport = {
    mode: options.config,
    source:
      options.config === 'live'
        ? 'data/detectors-benchmark/v0.2/calibration-preset.json'
        : 'дефолты пакетов детекторов',
    presetGeneratedAt: preset?.generatedAt ?? null,
    detectorsCalibrated: Object.keys(sampleOptions).sort(),
  };

  if (options.originLabels) {
    console.log(
      'ПРЕДВАРИТЕЛЬНЫЙ прогон по originLabel (провенанс, не операторская истина) — не gate-результат.',
    );
  }
  if (options.config === 'defaults') {
    console.warn(
      '⚠ ОТЛАДОЧНЫЙ прогон на дефолтах пакетов — НЕ конфигурация боевой поверхности (ADR-0006).',
    );
  }
  console.log(`Benchmark: ${testSamples.length} samples (dataset v${manifest.version})`);
  console.log(
    `Конфигурация: ${configPassport.mode} (${configPassport.source})` +
      (configPassport.detectorsCalibrated.length > 0
        ? ` — калиброваны: ${configPassport.detectorsCalibrated.join(', ')}`
        : ''),
  );

  const benchmarked = [];
  for (const spec of DSP_DETECTORS) {
    const result = await runDetector(testSamples, spec, datasetDir, sampleOptions);
    benchmarked.push(result);
    const m = result.metrics;
    console.log(
      `${spec.name}: precision=${m.precision?.toFixed(3) ?? '—'} recall=${m.recall?.toFixed(3) ?? '—'} F1=${m.f1?.toFixed(3) ?? '—'}`,
    );
  }

  const templateResult = await runTemplateMatch(testSamples, datasetDir);
  benchmarked.push(templateResult);
  {
    const m = templateResult.metrics;
    console.log(
      `template-match: precision=${m.precision?.toFixed(3) ?? '—'} recall=${m.recall?.toFixed(3) ?? '—'} F1=${m.f1?.toFixed(3) ?? '—'}`,
    );
  }

  // ND3: zero-shot нейро-эшелон в общей таблице (сравнение с DRONE_TIGHT).
  const yamnetResult = await runYamnet(testSamples, datasetDir);
  benchmarked.push(yamnetResult);
  {
    const m = yamnetResult.metrics;
    console.log(
      `yamnet: precision=${m.precision?.toFixed(3) ?? '—'} recall=${m.recall?.toFixed(3) ?? '—'} F1=${m.f1?.toFixed(3) ?? '—'}`,
    );
  }

  // ND4: тембровый эшелон в общей таблице — критерий приёмки владельца объявлен по нему.
  const mfccResult = await runMfcc(testSamples, datasetDir, options.mfccStrictness);
  benchmarked.push(mfccResult);
  {
    const m = mfccResult.metrics;
    console.log(
      `mfcc: precision=${m.precision?.toFixed(3) ?? '—'} recall=${m.recall?.toFixed(3) ?? '—'} F1=${m.f1?.toFixed(3) ?? '—'}`,
    );
    const p = mfccResult.passport;
    console.log(
      `  ворота «${p.configHash}» · строгость ${p.strictness} (${p.minInBandRatio} кадра / ${p.minPassRate} серии) · ` +
        `судимые коэффициенты ${p.judgedCoefficients.join(',')}` +
        (p.minMagnitude === 0 ? ' · порог немого кадра 0 — ЗАЩИТЫ НЕТ' : ` · порог немого кадра ${p.minMagnitude}`) +
        (p.situationsCalibrated === false ? ' · обстановки владельца НЕ откалиброваны' : ''),
    );
    if (p.selfMeasurement.self) {
      console.warn(
        `⚠ mfcc — САМОЗАМЕР: ${p.selfMeasurement.reason}.\n` +
          '  Коридоры выведены перцентилями по классу цели ЭТИХ ЖЕ записей, поэтому цифра выше —\n' +
          '  верхняя оценка, а не ожидание на новом звуке. Сравнимая с соседями цифра снимается\n' +
          '  на корпусе, которого ворота не видели.',
      );
    }
  }

  const detectors = [
    ...benchmarked,
    ...SCAFFOLD_DETECTORS.map((d) => ({ ...d, metrics: null, perSample: null })),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    datasetVersion: `v${manifest.version}`,
    curatedOnly: true,
    preliminaryOriginLabels: options.originLabels,
    skippedUnlabeled,
    groundTruth: manifest.groundTruth ?? null,
    sampleCount: testSamples.length,
    // Паспорт прогона (ADR-0006 Р3): цифра без указания конфигурации
    // неинтерпретируема — двусмысленность канона выросла из его отсутствия.
    config: configPassport,
    splitFallback,
    manifestPath: options.manifestPath.replace(`${ROOT}`, '').replace(/^[/\\]/, '').replace(/\\/g, '/'),
    detectors,
  };

  await mkdir(dirname(reportJson), { recursive: true });
  await writeFile(reportJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${reportJson}`);

  if (options.isCanonicalRun) {
    const md = await readFile(BENCHMARK_MD, 'utf8');
    const patched = patchDetectorBenchmarkMd(md, report);
    await writeFile(BENCHMARK_MD, patched, 'utf8');
    console.log(`Updated ${BENCHMARK_MD}`);
  } else {
    console.log(
      'Канонический DETECTOR_BENCHMARK.md не тронут (не-v0.2 манифест или --origin-labels).',
    );
  }
}

// Guard обязателен: с 2026-07-13 файл ещё и БИБЛИОТЕКА (drift-anchor-data.mjs импортирует
// runDetector/runTemplateMatch/runYamnet/DSP_DETECTORS) — без guard любой import.mjs, а не
// только прямой запуск, тихо перезаписывал бы канонический DETECTOR_BENCHMARK.md.
if (process.argv[1]?.endsWith('benchmark-detectors.mjs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
