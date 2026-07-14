/**
 * Экспортёр борда detector-compare (#452): trends DRONE_TIGHT vs yamnet
 * по бенчмарк-корпусу → docs/reports/detector-compare/latest.json (в git).
 *
 * Usage:
 *   yarn detector:compare:export                      # канон: v0.2 → docs/reports/detector-compare/latest.json
 *   yarn detector:compare:export -- --audio-out <dir> # + копия wav корпуса как <id>.wav (бандл ВНЕ git)
 *
 * Консилиум detector-compare-board-2026-07-14: офлайн-прогон на инфраструктуре
 * benchmark:detectors (те же детекторы/манифест/шаблоны/пороги), пояснения —
 * детерминированные шаблоны (без LLM), детекторные пакеты и office не трогаются.
 * Идемпотентность: при неизменном содержимом файл не перезаписывается
 * (generatedAt сохраняется) — повторный прогон не меняет JSON.
 */
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  CURATED_TEMPLATES_JSON,
  TEMPLATE_MATCH_DIST,
  YAMNET_NODE_DIST,
  ensureBuilt,
  readCuratedDroneTemplates,
  selectBenchmarkSamples,
} from './benchmark-detectors.mjs';
import {
  buildCompareReport,
  buildSampleRecord,
  buildTrendsVerdict,
  buildYamnetVerdict,
  reportsEqualIgnoringGeneratedAt,
} from './lib/detector-compare-lib.mjs';
import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST_PATH = join(ROOT, 'data', 'detectors-benchmark', 'v0.2', 'manifest.json');
const DEFAULT_OUT_PATH = join(ROOT, 'docs', 'reports', 'detector-compare', 'latest.json');
const YAMNET_INDEX_DIST = join(dirname(YAMNET_NODE_DIST), 'index.js');

function parseArgs(argv) {
  const options = { manifestPath: DEFAULT_MANIFEST_PATH, outPath: DEFAULT_OUT_PATH, audioOut: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--manifest' && argv[i + 1]) {
      options.manifestPath = resolve(ROOT, argv[++i]);
    } else if (argv[i] === '--out' && argv[i + 1]) {
      options.outPath = resolve(ROOT, argv[++i]);
    } else if (argv[i] === '--audio-out' && argv[i + 1]) {
      options.audioOut = resolve(ROOT, argv[++i]);
    }
  }
  return options;
}

/** Detailed-прогон trends (DRONE_TIGHT, движок template-match) — вердикт + breakdown. */
async function runTrendsDetailed(testSamples, datasetDir) {
  await ensureBuilt(TEMPLATE_MATCH_DIST, 'template-match-detector');
  const mod = await import(pathToFileURL(TEMPLATE_MATCH_DIST).href);
  const templates = mod.resolveTemplateMatchCatalog(await readCuratedDroneTemplates(mod));

  const verdicts = new Map();
  for (const entry of testSamples) {
    const { samples, sampleRate } = await readWavMono(join(datasetDir, entry.path));
    // Тот же путь, что ядро TemplateMatchDetector.detect (бенчмарк-паритет):
    // detect() внутри вызывает runTemplateMatchSampleAnalysis с этим же конфигом.
    const analysis = await mod.analyzeTemplateMatchDetailed(samples, sampleRate, { templates });
    verdicts.set(entry.id, buildTrendsVerdict(analysis));
  }
  return verdicts;
}

/** Прогон yamnet (ND3-паритет: весь клип одним AudioWindow, warmUp до замеров). */
async function runYamnetDetailed(testSamples, datasetDir) {
  await ensureBuilt(YAMNET_NODE_DIST, 'yamnet-detector (dist/node.js)');
  const { createYamnetDetectorNode } = await import(pathToFileURL(YAMNET_NODE_DIST).href);
  const { DEFAULT_DRONE_SCORE_THRESHOLD } = await import(pathToFileURL(YAMNET_INDEX_DIST).href);
  const detector = createYamnetDetectorNode();
  await detector.warmUp();

  const verdicts = new Map();
  for (const entry of testSamples) {
    const { samples, sampleRate } = await readWavMono(join(datasetDir, entry.path));
    const result = await detector.detect({
      samples,
      sampleRate,
      timestamp: 0,
      durationSec: samples.length / sampleRate,
    });
    verdicts.set(entry.id, buildYamnetVerdict(result, { threshold: DEFAULT_DRONE_SCORE_THRESHOLD }));
  }
  return { verdicts, threshold: DEFAULT_DRONE_SCORE_THRESHOLD };
}

async function copyAudioBundle(testSamples, datasetDir, audioOut) {
  await mkdir(audioOut, { recursive: true });
  for (const entry of testSamples) {
    // Wav без перекодирования (вердикт консилиума): оператор слышит то же, что детектор.
    await copyFile(join(datasetDir, entry.path), join(audioOut, `${entry.id}.wav`));
  }
  console.log(`Audio bundle: ${testSamples.length} wav → ${audioOut} (вне git)`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const datasetDir = dirname(options.manifestPath);

  const manifestRaw = await readFile(options.manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const { testSamples, skippedUnlabeled } = selectBenchmarkSamples(manifest.samples);
  if (testSamples.length === 0) {
    throw new Error('No labeled samples in manifest — разметьте корпус');
  }
  if (skippedUnlabeled > 0) {
    console.log(`Skipping ${skippedUnlabeled} unlabeled samples`);
  }
  console.log(`Compare: ${testSamples.length} samples (dataset v${manifest.version})`);

  const trendsVerdicts = await runTrendsDetailed(testSamples, datasetDir);
  const { verdicts: yamnetVerdicts, threshold: yamnetThreshold } = await runYamnetDetailed(
    testSamples,
    datasetDir,
  );

  const templateMatchMod = await import(pathToFileURL(TEMPLATE_MATCH_DIST).href);
  const trendsThreshold = templateMatchMod.DEFAULT_MIN_CONFIDENCE / 100;

  const sampleRecords = testSamples.map((entry) =>
    buildSampleRecord(entry, {
      trends: trendsVerdicts.get(entry.id),
      yamnet: yamnetVerdicts.get(entry.id),
    }),
  );

  const report = buildCompareReport({
    generatedAt: new Date().toISOString(),
    corpus: {
      name: `${manifest.catalogId ?? 'unknown'} v${manifest.version}`,
      manifestSha: createHash('sha256').update(manifestRaw).digest('hex'),
      sampleCount: testSamples.length,
      curatedTemplates: basename(CURATED_TEMPLATES_JSON),
    },
    thresholds: { trends: trendsThreshold, yamnet: yamnetThreshold },
    samples: sampleRecords,
  });

  let existing = null;
  try {
    existing = JSON.parse(await readFile(options.outPath, 'utf8'));
  } catch {
    // первого прогона ещё не было
  }

  if (reportsEqualIgnoringGeneratedAt(existing, report)) {
    console.log(`Unchanged: ${options.outPath} (generatedAt сохранён — идемпотентный прогон)`);
  } else {
    await mkdir(dirname(options.outPath), { recursive: true });
    await writeFile(options.outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${options.outPath}`);
  }

  for (const key of ['trends', 'yamnet']) {
    const m = report.summary[key];
    console.log(
      `${key}: P=${m.precision ?? '—'} R=${m.recall ?? '—'} F1=${m.f1 ?? '—'} FPR=${m.fpr ?? '—'}`,
    );
  }

  if (options.audioOut) {
    await copyAudioBundle(testSamples, datasetDir, options.audioOut);
  }
}

// Guard: файл импортируем в тестах — main только при прямом запуске.
if (process.argv[1]?.endsWith('detector-compare-export.mjs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
