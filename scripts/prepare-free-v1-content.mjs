#!/usr/bin/env node
/**
 * Materialize deterministic bootstrap corpora for pipeline development only.
 * Owner: Kuryokhin (content and provenance). Synthetic augmentation is explicit
 * in metadata and must never replace the vetted real-only S2 corpus.
 */
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_ROOT = join(ROOT, 'docs', 'datasets', 'free-v1');
const BENCHMARK_ROOT = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const SAMPLE_RATE = 48_000;
const DURATION_SECONDS = 5;
const SAMPLE_COUNT = SAMPLE_RATE * DURATION_SECONDS;

const QUOTAS = {
  silence: 20,
  wind: 22,
  birds: 22,
  speech: 22,
  'machine-hum': 25,
  gunshot: 19,
};

const REAL_RULES = {
  wind: [/^not-wind-/],
  birds: [/^not-bird-/],
  'machine-hum': [/^not-traffic-engine-/, /^not-traffic-train-/, /^not-traffic-airplane-/],
};

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function clamp(value) {
  return Math.max(-1, Math.min(1, value));
}

function synthesize(kind, index) {
  const random = mulberry32(0x46563100 + index * 97 + Object.keys(QUOTAS).indexOf(kind));
  const samples = new Float32Array(SAMPLE_COUNT);
  let windState = 0;
  const base = 45 + index * 3;

  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const noise = random() * 2 - 1;
    let value = 0;

    if (kind === 'silence') {
      value = noise * (0.00035 + (index % 5) * 0.00012);
    } else if (kind === 'wind') {
      windState = windState * 0.995 + noise * 0.005;
      value = windState * (0.2 + 0.08 * Math.sin(2 * Math.PI * 0.15 * t));
    } else if (kind === 'birds') {
      const period = 0.32 + (index % 6) * 0.035;
      const local = t % period;
      const envelope = local < 0.1 ? Math.sin(Math.PI * local / 0.1) ** 2 : 0;
      const frequency = 2_200 + (index % 8) * 260 + 1_100 * local;
      value = 0.22 * envelope * Math.sin(2 * Math.PI * frequency * t) + noise * 0.002;
    } else if (kind === 'speech') {
      const syllable = Math.max(0, Math.sin(2 * Math.PI * (2.1 + (index % 4) * 0.23) * t));
      const f0 = 95 + (index % 11) * 13;
      value = syllable * (
        0.12 * Math.sin(2 * Math.PI * f0 * t) +
        0.08 * Math.sin(2 * Math.PI * (500 + index * 11) * t) +
        0.05 * Math.sin(2 * Math.PI * (1_500 + index * 17) * t)
      );
    } else if (kind === 'machine-hum') {
      const f0 = base + (index % 5) * 5;
      value = 0.16 * Math.sin(2 * Math.PI * f0 * t) +
        0.09 * Math.sin(2 * Math.PI * f0 * 2 * t) +
        0.04 * Math.sin(2 * Math.PI * f0 * 3 * t) + noise * 0.003;
    } else if (kind === 'gunshot') {
      const eventAt = 0.45 + (index % 7) * 0.53;
      const dt = t - eventAt;
      if (dt >= 0 && dt < 0.32) {
        value = noise * Math.exp(-dt * (18 + index % 5)) * 0.9;
        value += 0.35 * Math.sin(2 * Math.PI * (80 + index * 4) * dt) * Math.exp(-dt * 12);
      } else {
        value = noise * 0.0015;
      }
    }
    samples[i] = clamp(value);
  }
  return samples;
}

function encodePcm16Mono(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i] < 0 ? samples[i] * 0x8000 : samples[i] * 0x7fff;
    buffer.writeInt16LE(Math.round(sample), 44 + i * 2);
  }
  return buffer;
}

function normalizeLicense(source) {
  return source === 'karoldvl/ESC-50' ? 'CC-BY-NC-3.0' : 'project-generated';
}

async function materializeClass(kind, sourceRows) {
  const outDir = join(DATASET_ROOT, kind);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const quota = QUOTAS[kind];
  const rules = REAL_RULES[kind] ?? [];
  const candidates = sourceRows
    .filter((row) => rules.some((rule) => rule.test(row.id)))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, quota);
  const metadata = [];

  for (let i = 0; i < candidates.length; i++) {
    const source = candidates[i];
    const file = `${kind}-${String(i + 1).padStart(3, '0')}-a.wav`;
    await copyFile(join(BENCHMARK_ROOT, source.path), join(outDir, file));
    metadata.push({
      file,
      source: source.source,
      license: normalizeLicense(source.source),
      duration: source.durationSec,
      sampleRate: source.sampleRate,
      quality: 'a',
      background: source.class ?? 'environmental',
      provenance: 'real',
      originalFile: source.path,
      notes: source.notes ?? '',
    });
  }

  for (let i = candidates.length; i < quota; i++) {
    const file = `${kind}-${String(i + 1).padStart(3, '0')}-b.wav`;
    await writeFile(join(outDir, file), encodePcm16Mono(synthesize(kind, i)));
    metadata.push({
      file,
      source: 'membrana/fv1-s2-deterministic-synthesis',
      license: 'CC0-1.0',
      duration: DURATION_SECONDS,
      sampleRate: SAMPLE_RATE,
      quality: 'b',
      background: 'synthetic-bootstrap',
      provenance: 'synthetic',
      seed: 0x46563100 + i * 97 + Object.keys(QUOTAS).indexOf(kind),
      notes: 'Bootstrap augmentation; replace with field audio before production release.',
    });
  }

  await writeFile(join(outDir, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  return {
    class: kind,
    total: metadata.length,
    real: metadata.filter((row) => row.provenance === 'real').length,
    synthetic: metadata.filter((row) => row.provenance === 'synthetic').length,
  };
}

async function main() {
  const manifest = JSON.parse(await readFile(join(BENCHMARK_ROOT, 'manifest.json'), 'utf8'));
  const notDrone = manifest.samples.filter((row) => row.label === 'not-drone');
  const summary = [];
  for (const kind of Object.keys(QUOTAS)) summary.push(await materializeClass(kind, notDrone));
  await writeFile(
    join(DATASET_ROOT, 'content-summary.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), owner: 'Kuryokhin', classes: summary }, null, 2)}\n`,
  );
  console.table(summary);
  console.log(`Prepared ${summary.reduce((sum, row) => sum + row.total, 0)} S2 samples.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
