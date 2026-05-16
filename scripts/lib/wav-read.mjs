import { readFile } from 'node:fs/promises';

/**
 * Decode mono 16-bit PCM WAV (sufficient for v0.1 synthetic dataset).
 * @returns {{ samples: Float32Array; sampleRate: number }}
 */
export async function readWavMono(filePath) {
  const buf = await readFile(filePath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`Not a WAV file: ${filePath}`);
  }

  let offset = 12;
  let sampleRate = 48_000;
  let numChannels = 1;
  let bitsPerSample = 16;
  /** @type {Buffer | null} */
  let dataChunk = null;

  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (id === 'fmt ') {
      numChannels = buf.readUInt16LE(chunkStart + 2);
      sampleRate = buf.readUInt32LE(chunkStart + 4);
      bitsPerSample = buf.readUInt16LE(chunkStart + 14);
    } else if (id === 'data') {
      dataChunk = buf.subarray(chunkStart, chunkStart + size);
    }
    offset = chunkStart + size + (size % 2);
  }

  if (!dataChunk || bitsPerSample !== 16) {
    throw new Error(`Unsupported WAV format: ${filePath}`);
  }

  const frameCount = Math.floor(dataChunk.length / 2 / numChannels);
  const samples = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const off = (i * numChannels + ch) * 2;
      sum += dataChunk.readInt16LE(off) / 32768;
    }
    samples[i] = sum / numChannels;
  }

  return { samples, sampleRate };
}
