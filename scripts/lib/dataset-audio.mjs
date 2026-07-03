/**
 * Общие аудио-хелперы датасет-скриптов (извлечено из
 * fetch-real-dataset-collection.mjs для reuse в VDR-HG1 pilot fetch).
 * Чистые функции: decode/resample/trim/measure/tile/fit/normalize/encode.
 */
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

/** @param {string} url @param {string} dest */
export async function downloadFile(url, dest) {
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed ${res.status} ${url}`);
  }
  if (!res.body) {
    throw new Error(`Empty body for ${url}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

/**
 * Список WAV в папках DroneAudioDataset (GitHub tree API).
 * @param {string[]} folders например ['Binary_Drone_Audio/yes_drone']
 * @returns {Promise<{ path: string }[]>}
 */
export async function listDroneDatasetWavs(folders) {
  const res = await fetch(
    'https://api.github.com/repos/saraalemadi/DroneAudioDataset/git/trees/master?recursive=1',
  );
  if (!res.ok) throw new Error('DroneAudioDataset tree listing failed');
  const json = await res.json();
  const folderSet = new Set(folders);
  return json.tree.filter(
    (item) =>
      item.type === 'blob' &&
      item.path.endsWith('.wav') &&
      folderSet.has(item.path.split('/').slice(0, 2).join('/')),
  );
}

/** @param {Buffer} buffer */
export function decodeWavPcm16Mono(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Not a WAV file');
  }
  let offset = 12;
  let sampleRate = 44_100;
  let channels = 1;
  let bitsPerSample = 16;
  /** @type {Buffer | null} */
  let data = null;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (chunkId === 'data') {
      data = buffer.subarray(chunkStart, chunkStart + chunkSize);
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }
  if (!data || bitsPerSample !== 16) {
    throw new Error('Unsupported WAV format (expected 16-bit PCM)');
  }
  const frameCount = data.length / (2 * channels);
  const mono = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      sum += data.readInt16LE((i * channels + ch) * 2) / 32768;
    }
    mono[i] = sum / channels;
  }
  return { samples: mono, sampleRate };
}

/** @param {Float32Array} samples @param {number} fromRate @param {number} toRate */
export function resampleLinear(samples, fromRate, toRate) {
  if (fromRate === toRate) return samples;
  const outLen = Math.max(1, Math.round((samples.length * toRate) / fromRate));
  const out = new Float32Array(outLen);
  const ratio = fromRate / toRate;
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(samples.length - 1, i0 + 1);
    const frac = src - i0;
    out[i] = samples[i0] * (1 - frac) + samples[i1] * frac;
  }
  return out;
}

/** Trim leading/trailing low-energy regions, keep dense core. */
export function trimSilenceEdges(samples, sampleRate) {
  const win = Math.max(1, Math.floor(sampleRate * 0.02));
  let peak = 0;
  const rms = [];
  for (let i = 0; i < samples.length; i += win) {
    let sum = 0;
    let count = 0;
    for (let j = i; j < Math.min(samples.length, i + win); j++) {
      sum += samples[j] * samples[j];
      count++;
    }
    const r = Math.sqrt(sum / count);
    rms.push(r);
    peak = Math.max(peak, r);
  }
  if (peak < 1e-9) return samples;
  const thr = peak * 0.12;
  let first = 0;
  let last = rms.length - 1;
  while (first < rms.length && rms[first] < thr) first++;
  while (last > first && rms[last] < thr) last--;
  const start = first * win;
  const end = Math.min(samples.length, (last + 1) * win);
  return samples.subarray(start, end);
}

/** @param {Float32Array} samples @param {number} sampleRate */
export function measureActiveRatio(samples, sampleRate) {
  const win = Math.max(1, Math.floor(sampleRate * 0.05));
  let peak = 0;
  let active = 0;
  let windows = 0;
  for (let i = 0; i < samples.length; i += win) {
    let sum = 0;
    let count = 0;
    for (let j = i; j < Math.min(samples.length, i + win); j++) {
      sum += samples[j] * samples[j];
      count++;
    }
    const r = Math.sqrt(sum / count);
    peak = Math.max(peak, r);
    windows++;
    if (r > peak * 0.15) active++;
  }
  return peak < 1e-9 ? 0 : active / windows;
}

/**
 * Tile short stationary clips (e.g. 1 s drone hum) into full duration with crossfades.
 * @param {Float32Array} samples @param {number} sampleRate @param {number} targetSec
 */
export function tileLoopToDuration(samples, sampleRate, targetSec) {
  const targetLen = Math.round(targetSec * sampleRate);
  if (samples.length >= targetLen) {
    const start = Math.floor((samples.length - targetLen) / 2);
    return samples.subarray(start, start + targetLen);
  }
  const crossfadeLen = Math.min(
    Math.floor(sampleRate * 0.03),
    Math.floor(samples.length / 3),
    Math.floor(targetLen / 8),
  );
  const out = new Float32Array(targetLen);
  let writePos = 0;
  let iteration = 0;
  while (writePos < targetLen) {
    if (iteration === 0) {
      const n = Math.min(samples.length, targetLen);
      out.set(samples.subarray(0, n), 0);
      writePos = n;
      iteration++;
      continue;
    }
    const overlapStart = Math.max(0, writePos - crossfadeLen);
    for (let i = 0; i < crossfadeLen && overlapStart + i < targetLen; i++) {
      const t = (i + 1) / (crossfadeLen + 1);
      const srcIdx = i % samples.length;
      out[overlapStart + i] = out[overlapStart + i] * (1 - t) + samples[srcIdx] * t;
    }
    const bodyStart = overlapStart + crossfadeLen;
    const bodyLen = Math.min(samples.length - crossfadeLen, targetLen - bodyStart);
    if (bodyLen > 0) {
      out.set(samples.subarray(crossfadeLen, crossfadeLen + bodyLen), bodyStart);
      writePos = bodyStart + bodyLen;
    } else {
      writePos = targetLen;
    }
    iteration++;
    if (iteration > 32) break;
  }
  return out;
}

/**
 * @param {Float32Array} samples @param {number} sampleRate
 * @param {'crop' | 'loop'} mode @param {number} targetSec
 */
export function fitDuration(samples, sampleRate, mode, targetSec) {
  const targetLen = Math.round(targetSec * sampleRate);
  if (samples.length === targetLen) return samples;
  if (samples.length > targetLen) {
    const start = Math.floor((samples.length - targetLen) / 2);
    return samples.subarray(start, start + targetLen);
  }
  if (mode === 'loop') {
    return tileLoopToDuration(samples, sampleRate, targetSec);
  }
  throw new Error(
    `Source too short (${(samples.length / sampleRate).toFixed(2)}s) — use loop mode or longer source`,
  );
}

export function normalize(samples, peakTarget = 0.9) {
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

export function encodeWavPcm16(samples, sampleRate) {
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

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}
