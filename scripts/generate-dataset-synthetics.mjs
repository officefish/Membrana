/**
 * Generates v0.1 synthetic WAV files and manifest for detector benchmark.
 * Usage: yarn dataset:generate
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'data', 'detectors-benchmark', 'v0.1');
const SYNTH_DIR = join(OUT_DIR, 'synthetic');
const SAMPLE_RATE = 48_000;
const DURATION_SEC = 2;

/** @type {readonly { id: string; class: string; label: string; notes: string; build: (n: number) => Float32Array }[]} */
const DEFINITIONS = [
  {
    id: 'drone-mr-120hz',
    class: 'drone-multirotor',
    label: 'drone',
    notes: 'F0=120 Hz, harmonics 2f–4f',
    build: (n) => harmonicStack(n, 120, [1, 0.6, 0.35, 0.2]),
  },
  {
    id: 'drone-mr-150hz',
    class: 'drone-multirotor',
    label: 'drone',
    notes: 'F0=150 Hz, harmonics 2f–4f',
    build: (n) => harmonicStack(n, 150, [1, 0.55, 0.3, 0.15]),
  },
  {
    id: 'drone-mr-180hz',
    class: 'drone-multirotor',
    label: 'drone',
    notes: 'F0=180 Hz, harmonics 2f–4f',
    build: (n) => harmonicStack(n, 180, [1, 0.5, 0.28, 0.12]),
  },
  {
    id: 'not-drone-sine-440',
    class: 'bird',
    label: 'not-drone',
    notes: 'Pure 440 Hz sine (control)',
    build: (n) => sine(n, 440, 0.35),
  },
  {
    id: 'not-drone-speech-like',
    class: 'human-speech',
    label: 'not-drone',
    notes: 'AM noise bursts 200–800 Hz',
    build: (n) => speechLike(n),
  },
  {
    id: 'not-drone-white-noise',
    class: 'silence',
    label: 'not-drone',
    notes: 'Broadband noise ~−12 dBFS',
    build: (n) => whiteNoise(n, 0.12),
  },
  {
    id: 'env-wind',
    class: 'wind',
    label: 'not-drone',
    notes: 'High-pass shaped noise (wind)',
    build: (n) => windLike(n),
  },
  {
    id: 'env-traffic',
    class: 'traffic',
    label: 'not-drone',
    notes: 'Low rumble 60–120 Hz non-harmonic',
    build: (n) => trafficLike(n),
  },
  {
    id: 'env-silence',
    class: 'silence',
    label: 'not-drone',
    notes: 'Near silence floor',
    build: (n) => whiteNoise(n, 0.004),
  },
];

function harmonicStack(length, f0, amps) {
  const out = new Float32Array(length);
  const freqs = amps.map((_, i) => f0 * (i + 1));
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;
    for (let h = 0; h < freqs.length; h++) {
      v += amps[h] * Math.sin(2 * Math.PI * freqs[h] * t);
    }
    out[i] = v / amps.length;
  }
  return normalize(out, 0.85);
}

function sine(length, hz, gain) {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = gain * Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE);
  }
  return out;
}

function whiteNoise(length, gain) {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = gain * (Math.random() * 2 - 1);
  }
  return out;
}

function speechLike(length) {
  const out = new Float32Array(length);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const env = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.7 * t);
    const carrier = Math.sin(2 * Math.PI * (280 + 40 * Math.sin(2 * Math.PI * 0.9 * t)) * t);
    phase += (Math.random() * 2 - 1) * 0.02;
    out[i] = env * (0.6 * carrier + 0.4 * phase) * 0.25;
  }
  return normalize(out, 0.7);
}

function windLike(length) {
  const out = whiteNoise(length, 0.15);
  let y = 0;
  const alpha = 0.92;
  for (let i = 0; i < length; i++) {
    y = alpha * y + (1 - alpha) * out[i];
    out[i] = y;
  }
  return normalize(out, 0.65);
}

function trafficLike(length) {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const f = 70 + 30 * Math.sin(2 * Math.PI * 0.4 * t);
    out[i] =
      0.4 * Math.sin(2 * Math.PI * f * t) +
      0.25 * Math.sin(2 * Math.PI * (f * 1.7 + 3) * t) +
      0.1 * (Math.random() * 2 - 1);
  }
  return normalize(out, 0.55);
}

function normalize(samples, peakTarget) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  if (peak < 1e-9) return samples;
  const scale = peakTarget / peak;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] * scale;
  }
  return out;
}

function encodeWavPcm16(samples, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), offset);
    offset += 2;
  }
  return buffer;
}

async function main() {
  await mkdir(SYNTH_DIR, { recursive: true });
  const sampleCount = Math.floor(DURATION_SEC * SAMPLE_RATE);
  /** @type {object[]} */
  const samples = [];

  for (const def of DEFINITIONS) {
    const pcm = def.build(sampleCount);
    const fileName = `${def.id}.wav`;
    const relPath = `synthetic/${fileName}`;
    await writeFile(join(SYNTH_DIR, fileName), encodeWavPcm16(pcm, SAMPLE_RATE));
    samples.push({
      id: def.id,
      path: relPath,
      class: def.class,
      label: def.label,
      split: 'test',
      durationSec: DURATION_SEC,
      snrDb: null,
      source: 'synthetic',
      notes: def.notes,
    });
    console.log(`Wrote ${relPath}`);
  }

  const manifest = {
    version: 1,
    sampleRate: SAMPLE_RATE,
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/generate-dataset-synthetics.mjs',
    samples,
  };

  await writeFile(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Manifest: ${samples.length} samples → data/detectors-benchmark/v0.1/manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
