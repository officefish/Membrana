import { decodeWavMono16 } from '@membrana/wav-decode';

export interface DecodedMonoAudio {
  readonly samples: Float32Array;
  readonly sampleRate: number;
}

/**
 * Decode a 16-bit PCM WAV buffer into mono Float32 samples (channels averaged).
 *
 * Сам разбор живёт в `@membrana/wav-decode` (#1972: до 19.08 здесь была одна из трёх копий);
 * здесь — только контракт media: отказ декодера превращается в бросок, как ждут вызывающие
 * (`samples.service.ts`). LP1b server DDR is WAV-only; other formats are rejected upstream with 422.
 */
export function decodeWavMono(buf: Buffer): DecodedMonoAudio {
  const decoded = decodeWavMono16(buf);
  if (!decoded.ok) throw new Error(`WAV не разобран: ${decoded.reason}`);
  return decoded.audio;
}
