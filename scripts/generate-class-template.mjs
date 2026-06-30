#!/usr/bin/env node
/**
 * Generate a PatternTemplate from a corpus of WAV files for any sound class.
 *
 * Usage:
 *   yarn templates:generate --class wind --src docs/datasets/free-v1/wind/
 *   yarn templates:generate --class drone --src data/detectors-benchmark/v0.2/drone/ \
 *     --regression-against packages/services/detectors/template-match/src/data/curated-drone-templates.json
 *
 * Output: packages/services/trends-detector/templates/<CLASS>.json
 *         (override with --out <path>)
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CLASS_META = {
  drone: { name: 'Дрон', icon: '🛸', color: '#ff6b6b', countsAsDetection: true },
  silence: { name: 'Тишина', icon: '🤫', color: '#c8c8c8' },
  wind: { name: 'Ветер', icon: '💨', color: '#a0c4ff' },
  birds: { name: 'Пение птиц', icon: '🐦', color: '#90be6d' },
  speech: { name: 'Человеческая речь', icon: '🗣️', color: '#b5838d' },
  'machine-hum': { name: 'Машинный гул', icon: '⚙️', color: '#ffd166' },
  gunshot: { name: 'Стрельба', icon: '💥', color: '#ff4040' },
};

function parseArgs(argv) {
  const args = { tolerance: 0.05 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--class' && argv[i + 1]) args.class = argv[++i];
    else if (argv[i] === '--src' && argv[i + 1]) args.src = argv[++i];
    else if (argv[i] === '--out' && argv[i + 1]) args.out = argv[++i];
    else if (argv[i] === '--regression-against' && argv[i + 1]) args.regressionAgainst = argv[++i];
    else if (argv[i] === '--tolerance' && argv[i + 1]) args.tolerance = parseFloat(argv[++i]);
  }
  return args;
}

async function loadApi() {
  const dist = join(
    ROOT,
    'packages',
    'services',
    'detectors',
    'template-match',
    'dist',
    'index.js',
  );
  try {
    return await import(pathToFileURL(dist).href);
  } catch {
    throw new Error(
      'Build @membrana/template-match-detector-service first:\n' +
        '  yarn workspace @membrana/template-match-detector-service build',
    );
  }
}

/**
 * Containment check: envelope template must be at least as wide as the reference.
 * - .min: envelope.min <= ref.min * (1 + tolerance)  — envelope may go lower, not much higher
 * - .max: envelope.max >= ref.max * (1 - tolerance)  — envelope may go higher, not much lower
 * tolerance=0.9 means the envelope can be at most 90% tighter than the reference on either side.
 */
function checkRegression(generated, reference, tolerance) {
  const failures = [];
  for (const field of ['centroid', 'flux', 'rms']) {
    const genMin = generated.thresholds[field].min;
    const genMax = generated.thresholds[field].max;
    const refMin = reference.thresholds[field].min;
    const refMax = reference.thresholds[field].max;

    const minCeil = refMin * (1 + tolerance);
    if (genMin > minCeil) {
      failures.push(
        `  thresholds.${field}.min: envelope min ${genMin.toFixed(4)} > ref.min*(1+tol) ${minCeil.toFixed(4)}` +
          ` — envelope too narrow on low end`,
      );
    }
    const maxFloor = refMax * (1 - tolerance);
    if (genMax < maxFloor) {
      failures.push(
        `  thresholds.${field}.max: envelope max ${genMax.toFixed(4)} < ref.max*(1-tol) ${maxFloor.toFixed(4)}` +
          ` — envelope too narrow on high end`,
      );
    }
  }
  return failures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.class) {
    console.error('Error: --class <name> is required (drone|silence|wind|birds|speech|machine-hum|gunshot)');
    process.exit(1);
  }
  if (!args.src) {
    console.error('Error: --src <directory> is required');
    process.exit(1);
  }

  const classKey = args.class.toUpperCase().replace(/-/g, '_');
  const meta = CLASS_META[args.class] ?? { name: args.class, icon: '🔊', color: '#6b8cff' };
  const srcDir = join(ROOT, args.src);
  const outPath = args.out
    ? join(ROOT, args.out)
    : join(ROOT, 'packages', 'services', 'trends-detector', 'templates', `${classKey}.json`);

  const { collectMetricSamples, buildClassTemplateFromMetricSamples, mergeClassTemplates } =
    await loadApi();

  let files;
  try {
    files = (await readdir(srcDir)).filter((f) => extname(f).toLowerCase() === '.wav');
  } catch {
    throw new Error(`Cannot read directory: ${srcDir}`);
  }

  if (files.length === 0) {
    throw new Error(`No .wav files found in: ${srcDir}`);
  }

  console.log(`[templates:generate] class=${args.class} → ${classKey}  samples=${files.length}`);

  const perSampleTemplates = [];
  for (const file of files) {
    const { samples, sampleRate } = await readWavMono(join(srcDir, file));
    const metrics = collectMetricSamples(samples, sampleRate);
    if (metrics.length === 0) {
      console.warn(`  SKIP ${file}: too short for metric collection`);
      continue;
    }
    perSampleTemplates.push(
      buildClassTemplateFromMetricSamples(metrics, `${classKey}_${basename(file, '.wav')}`, meta),
    );
    process.stdout.write('.');
  }
  console.log('');

  if (perSampleTemplates.length === 0) {
    throw new Error('No templates built — all samples were skipped');
  }

  const merged = mergeClassTemplates(perSampleTemplates, classKey, meta);

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify([merged], null, 2)}\n`, 'utf8');

  console.log(`\nBuilt ${classKey} from ${perSampleTemplates.length} / ${files.length} samples`);
  console.log(`Output: ${outPath}`);

  if (args.regressionAgainst) {
    const refPath = join(ROOT, args.regressionAgainst);
    const refData = JSON.parse(await readFile(refPath, 'utf8'));
    const refTemplate = Array.isArray(refData) ? refData[0] : refData;
    const failures = checkRegression(merged, refTemplate, args.tolerance);
    if (failures.length === 0) {
      console.log(`\nRegression PASS (tolerance ${(args.tolerance * 100).toFixed(0)}%)`);
    } else {
      console.error(`\nRegression FAIL — ${failures.length} field(s) out of tolerance:`);
      for (const f of failures) console.error(f);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
