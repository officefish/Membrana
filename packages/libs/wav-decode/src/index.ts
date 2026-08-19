/**
 * WAV PCM16 → моно Float32. Единственная реализация на репозиторий (#1972): раньше жили три
 * копии — media `decode-wav-mono.ts`, scripts `wav-read.mjs`, plugin-handlers `wav.ts`.
 * Бросков нет: возвращается `{ ok:false, reason }`, бросать ли — решает потребитель
 * (media бросает, executor плагина пишет отказ по пробе, скрипты бросают с именем файла).
 * Каналы усредняются; разрядность — только 16 бит (иная — отказ с причиной, не тихое искажение).
 */
export interface DecodedMono {
  readonly samples: Float32Array;
  readonly sampleRate: number;
}

export type WavDecodeResult = { readonly ok: true; readonly audio: DecodedMono } | { readonly ok: false; readonly reason: string };

const ascii = (v: DataView, o: number): string =>
  String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));

export function decodeWavMono16(bytes: Uint8Array): WavDecodeResult {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 12 || ascii(v, 0) !== 'RIFF' || ascii(v, 8) !== 'WAVE') {
    return { ok: false, reason: 'не RIFF/WAVE' };
  }
  let offset = 12;
  let channels = 1;
  let sampleRate = 0;
  let bits = 16;
  let data: { start: number; size: number } | null = null;
  while (offset + 8 <= bytes.byteLength) {
    const id = ascii(v, offset);
    const size = v.getUint32(offset + 4, true);
    const start = offset + 8;
    if (id === 'fmt ') {
      channels = v.getUint16(start + 2, true);
      sampleRate = v.getUint32(start + 4, true);
      bits = v.getUint16(start + 14, true);
    } else if (id === 'data') {
      data = { start, size: Math.min(size, bytes.byteLength - start) };
    }
    offset = start + size + (size % 2);
  }
  if (data === null) return { ok: false, reason: 'нет чанка data' };
  if (bits !== 16) return { ok: false, reason: `разрядность ${bits} — декодер только PCM16` };
  if (channels < 1 || sampleRate <= 0) return { ok: false, reason: 'негодный fmt-чанк' };

  const frameCount = Math.floor(data.size / 2 / channels);
  const samples = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      sum += v.getInt16(data.start + (i * channels + ch) * 2, true) / 32768;
    }
    samples[i] = sum / channels;
  }
  return { ok: true, audio: { samples, sampleRate } };
}
