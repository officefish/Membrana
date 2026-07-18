/**
 * Benchmark detectors on data/detectors-benchmark manifest (v0.2 free-v1 catalog).
 *
 * Usage:
 *   yarn benchmark:detectors                                   # канон: v0.2, патчит DETECTOR_BENCHMARK.md
 *   yarn benchmark:detectors -- --manifest data/detectors-benchmark/vdr-hard-gate-pilot/manifest.json
 *   yarn benchmark:detectors -- --manifest <...> --origin-labels
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
import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DATASET_DIR = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const DEFAULT_MANIFEST_PATH = join(DEFAULT_DATASET_DIR, 'manifest.json');
const BENCHMARK_MD = join(ROOT, 'docs', 'DETECTOR_BENCHMARK.md');

function parseArgs(argv) {
  const options = {
    manifestPath: DEFAULT_MANIFEST_PATH,
    originLabels: false,
    reportPath: null,
    // ADR-0006 Р1: боевая конфигурация — умолчание. `defaults` остаётся как
    // ОТЛАДОЧНЫЙ режим и обязан быть помечен в отчёте: цифрой боевой
    // поверхности он называться не вправе.
    config: 'live',
    strictSplit: false,
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
