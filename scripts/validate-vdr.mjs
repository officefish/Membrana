/**
 * VDR-HG1: аудит корпуса и качества разметки (консилиум vdr-validation-scope-2026-07-03).
 * Вспомогательный скрипт — БЕЗ CI-гейта.
 *
 * Проверки:
 *  - счётчики: всего / drone / not-drone / unlabeled;
 *  - структура: дубли id, дубли источников (notes), отсутствующие WAV, валидность label;
 *  - intra-rater (--intra-rater <file.json>): повторная разметка подвыборки
 *    [{ id, label }] → воспроизводимость vs --intra-rater-threshold (default 0.95);
 *  - Cohen's Kappa (--labels-a <a.json> --labels-b <b.json>): при появлении
 *    второго аннотатора (будущий gate, консилиум D3).
 *
 * Usage:
 *   yarn validate:vdr                                     # пилотный манифест по умолчанию
 *   yarn validate:vdr -- --manifest data/detectors-benchmark/v0.2/manifest.json
 *   yarn validate:vdr -- --intra-rater relabel.json --json report.json
 *   yarn validate:vdr -- --labels-a a.json --labels-b b.json
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = join(
  ROOT,
  'data',
  'detectors-benchmark',
  'vdr-hard-gate-pilot',
  'manifest.json',
);
const VALID_LABELS = new Set(['drone', 'not-drone', 'unlabeled']);

export function parseArgs(argv) {
  const options = {
    manifest: DEFAULT_MANIFEST,
    intraRater: null,
    intraRaterThreshold: 0.95,
    labelsA: null,
    labelsB: null,
    jsonOut: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--manifest' && argv[i + 1]) options.manifest = resolve(ROOT, argv[++i]);
    else if (arg === '--intra-rater' && argv[i + 1]) options.intraRater = resolve(ROOT, argv[++i]);
    else if (arg === '--intra-rater-threshold' && argv[i + 1]) {
      options.intraRaterThreshold = Number(argv[++i]);
    } else if (arg === '--labels-a' && argv[i + 1]) options.labelsA = resolve(ROOT, argv[++i]);
    else if (arg === '--labels-b' && argv[i + 1]) options.labelsB = resolve(ROOT, argv[++i]);
    else if (arg === '--json' && argv[i + 1]) options.jsonOut = resolve(ROOT, argv[++i]);
  }
  if (
    !Number.isFinite(options.intraRaterThreshold) ||
    options.intraRaterThreshold <= 0 ||
    options.intraRaterThreshold > 1
  ) {
    throw new Error('--intra-rater-threshold: число в (0, 1]');
  }
  return options;
}

/** Источник сэмпла из notes (для поиска дублей происхождения). */
function sourceKey(sample) {
  const notes = sample.notes ?? '';
  const dad = notes.match(/((?:Binary|Multiclass)_Drone_Audio\/[\w-]+\/[\w.-]+\.wav)/i);
  if (dad) return dad[1];
  const esc = notes.match(/(\d+-\d+-[A-Z]-\d+\.wav)/);
  if (esc) return esc[1];
  return null;
}

/** @param {{ samples: any[] }} manifest @param {string} manifestDir */
export function auditManifest(manifest, manifestDir) {
  const samples = manifest.samples ?? [];
  const counts = { total: samples.length, drone: 0, 'not-drone': 0, unlabeled: 0 };
  const errors = [];
  const seenIds = new Set();
  const seenSources = new Map();

  for (const sample of samples) {
    if (!VALID_LABELS.has(sample.label)) {
      errors.push(`invalid label "${sample.label}" у ${sample.id}`);
    } else {
      counts[sample.label] += 1;
    }
    if (seenIds.has(sample.id)) {
      errors.push(`дубль id: ${sample.id}`);
    }
    seenIds.add(sample.id);

    const src = sourceKey(sample);
    if (src !== null) {
      if (seenSources.has(src)) {
        errors.push(`дубль источника ${src}: ${seenSources.get(src)} и ${sample.id}`);
      }
      seenSources.set(src, sample.id);
    }
    if (manifestDir !== null && sample.path && !existsSync(join(manifestDir, sample.path))) {
      errors.push(`нет файла: ${sample.path} (${sample.id})`);
    }
  }
  return { counts, errors };
}

/**
 * Intra-rater: повторная разметка подвыборки тем же оператором (D3 консилиума).
 * @param {{ id: string, label: string }[]} original
 * @param {{ id: string, label: string }[]} relabel
 */
export function computeIntraRater(original, relabel) {
  const byId = new Map(original.map((s) => [s.id, s.label]));
  let compared = 0;
  let agreed = 0;
  const disagreements = [];
  for (const item of relabel) {
    const first = byId.get(item.id);
    if (first === undefined || first === 'unlabeled' || item.label === 'unlabeled') continue;
    compared++;
    if (first === item.label) {
      agreed++;
    } else {
      disagreements.push({ id: item.id, first, second: item.label });
    }
  }
  return {
    compared,
    agreed,
    reproducibility: compared === 0 ? null : agreed / compared,
    disagreements,
  };
}

/**
 * Cohen's Kappa для двух аннотаторов (бинарные метки drone / not-drone).
 * @param {{ id: string, label: string }[]} a
 * @param {{ id: string, label: string }[]} b
 */
export function computeCohensKappa(a, b) {
  const byId = new Map(a.map((s) => [s.id, s.label]));
  const pairs = [];
  for (const item of b) {
    const first = byId.get(item.id);
    if (first === undefined || first === 'unlabeled' || item.label === 'unlabeled') continue;
    pairs.push([first, item.label]);
  }
  const n = pairs.length;
  if (n === 0) return { n: 0, kappa: null, observedAgreement: null };

  let agree = 0;
  const marginalA = { drone: 0, 'not-drone': 0 };
  const marginalB = { drone: 0, 'not-drone': 0 };
  for (const [first, second] of pairs) {
    if (first === second) agree++;
    marginalA[first] += 1;
    marginalB[second] += 1;
  }
  const po = agree / n;
  const pe =
    (marginalA.drone / n) * (marginalB.drone / n) +
    (marginalA['not-drone'] / n) * (marginalB['not-drone'] / n);
  const kappa = pe === 1 ? 1 : (po - pe) / (1 - pe);
  return { n, kappa: Number(kappa.toFixed(4)), observedAgreement: Number(po.toFixed(4)) };
}

async function readLabelsFile(path) {
  const raw = JSON.parse(await readFile(path, 'utf8'));
  const arr = Array.isArray(raw) ? raw : raw.samples;
  if (!Array.isArray(arr)) {
    throw new Error(`${path}: ожидается массив { id, label } или { samples: [...] }`);
  }
  return arr;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(options.manifest, 'utf8'));
  const { counts, errors } = auditManifest(manifest, dirname(options.manifest));

  const report = {
    manifest: options.manifest.replace(/\\/g, '/'),
    checkedAt: new Date().toISOString(),
    counts,
    errors,
    intraRater: null,
    kappa: null,
  };

  console.log(
    `Корпус: всего ${counts.total} · drone ${counts.drone} · not-drone ${counts['not-drone']} · unlabeled ${counts.unlabeled}`,
  );
  for (const err of errors) console.error(`ERROR: ${err}`);

  if (options.intraRater) {
    const relabel = await readLabelsFile(options.intraRater);
    const result = computeIntraRater(manifest.samples ?? [], relabel);
    report.intraRater = { ...result, threshold: options.intraRaterThreshold };
    if (result.reproducibility === null) {
      console.error('Intra-rater: нет сравнимых пар (метки unlabeled?)');
      process.exitCode = 1;
    } else {
      const pct = (result.reproducibility * 100).toFixed(1);
      const pass = result.reproducibility >= options.intraRaterThreshold;
      console.log(
        `Intra-rater: ${result.agreed}/${result.compared} = ${pct}% (порог ${options.intraRaterThreshold * 100}%) → ${pass ? 'PASS' : 'FAIL'}`,
      );
      for (const d of result.disagreements) {
        console.log(`  расхождение: ${d.id}  ${d.first} → ${d.second}`);
      }
      if (!pass) process.exitCode = 1;
    }
  }

  if (options.labelsA && options.labelsB) {
    const [a, b] = await Promise.all([
      readLabelsFile(options.labelsA),
      readLabelsFile(options.labelsB),
    ]);
    report.kappa = computeCohensKappa(a, b);
    console.log(
      `Cohen's Kappa: ${report.kappa.kappa} (n=${report.kappa.n}, Po=${report.kappa.observedAgreement})`,
    );
  }

  if (errors.length > 0) {
    process.exitCode = 1;
  }
  if (options.jsonOut) {
    await writeFile(options.jsonOut, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`JSON report: ${options.jsonOut}`);
  }
}

const isDirectRun =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
