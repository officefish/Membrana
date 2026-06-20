/** Метаданные + PCM для склейки трека сценария. */
export interface AudioSampleConcatInput {
  readonly sampleRate: number;
  readonly samples: Float32Array;
}

const DEFAULT_CROSSFADE_SAMPLES = 64;

/**
 * Склеивает PCM-чанки с коротким linear crossfade на стыках (убирает щелчки discrete append).
 */
export function concatAudioSamplePayloads(
  payloads: readonly AudioSampleConcatInput[],
  crossfadeSamples: number = DEFAULT_CROSSFADE_SAMPLES,
): { readonly samples: Float32Array; readonly sampleRate: number; readonly durationSec: number } | null {
  if (payloads.length === 0) {
    return null;
  }
  const sampleRate = payloads[0]!.sampleRate;
  if (payloads.length === 1) {
    const only = payloads[0]!.samples;
    return {
      samples: only,
      sampleRate,
      durationSec: only.length / sampleRate,
    };
  }

  const fade = Math.max(0, Math.min(crossfadeSamples, 128));
  let totalLength = payloads[0]!.samples.length;
  for (let i = 1; i < payloads.length; i += 1) {
    const chunk = payloads[i]!.samples;
    const overlap = fade > 0 ? Math.min(fade, totalLength, chunk.length) : 0;
    totalLength += chunk.length - overlap;
  }

  const samples = new Float32Array(totalLength);
  let writeOffset = 0;
  let previousTail: Float32Array | null = null;

  for (let index = 0; index < payloads.length; index += 1) {
    const chunk = payloads[index]!.samples;
    if (index === 0) {
      samples.set(chunk, 0);
      writeOffset = chunk.length;
      previousTail = chunk;
      continue;
    }

    const overlap =
      fade > 0 && previousTail !== null
        ? Math.min(fade, previousTail.length, chunk.length, writeOffset)
        : 0;

    if (overlap > 0) {
      const tailStart = writeOffset - overlap;
      for (let i = 0; i < overlap; i += 1) {
        const t = (i + 1) / (overlap + 1);
        const prev = samples[tailStart + i] ?? 0;
        const next = chunk[i] ?? 0;
        samples[tailStart + i] = prev * (1 - t) + next * t;
      }
      if (chunk.length > overlap) {
        samples.set(chunk.subarray(overlap), writeOffset);
        writeOffset += chunk.length - overlap;
      }
    } else {
      samples.set(chunk, writeOffset);
      writeOffset += chunk.length;
    }
    previousTail = chunk;
  }

  return {
    samples,
    sampleRate,
    durationSec: samples.length / sampleRate,
  };
}
