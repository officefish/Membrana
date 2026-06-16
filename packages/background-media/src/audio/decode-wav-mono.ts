export interface DecodedMonoAudio {
  readonly samples: Float32Array;
  readonly sampleRate: number;
}

/**
 * Decode a 16-bit PCM WAV buffer into mono Float32 samples (channels averaged).
 *
 * LP1b server DDR is WAV-only (mic-buffer clips are PCM16 WAV). Other formats
 * (mp3/flac/ogg) are rejected upstream with 422 — no Node PCM decoder yet.
 */
export function decodeWavMono(buf: Buffer): DecodedMonoAudio {
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Not a RIFF/WAVE file');
  }

  let offset = 12;
  let sampleRate = 48_000;
  let numChannels = 1;
  let bitsPerSample = 16;
  let dataChunk: Buffer | null = null;

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

  if (!dataChunk) {
    throw new Error('WAV data chunk not found');
  }
  if (bitsPerSample !== 16) {
    throw new Error(`Unsupported WAV bit depth: ${bitsPerSample} (expected 16-bit PCM)`);
  }
  if (numChannels < 1) {
    throw new Error('WAV has no channels');
  }

  const frameCount = Math.floor(dataChunk.length / 2 / numChannels);
  const samples = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i += 1) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch += 1) {
      const off = (i * numChannels + ch) * 2;
      sum += dataChunk.readInt16LE(off) / 32_768;
    }
    samples[i] = sum / numChannels;
  }

  return { samples, sampleRate };
}
