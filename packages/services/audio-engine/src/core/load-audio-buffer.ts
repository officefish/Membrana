/**
 * Декодирование файла/Blob в AudioBuffer.
 *
 * Каждый вызов создаёт временный AudioContext только для декодирования
 * и сразу его закрывает. Это позволяет загружать файлы без необходимости
 * иметь "живой" контекст вне engine.
 */

import { DomainError } from '@membrana/core';

import { closeAudioContext, createAudioContext } from './audio-context.js';

/** Декодирует File/Blob в AudioBuffer. */
export async function loadAudioBuffer(file: File | Blob): Promise<AudioBuffer> {
  if (!file) {
    throw new DomainError('No file provided', 'NO_FILE');
  }

  const arrayBuffer = await file.arrayBuffer();
  const ctx = createAudioContext();
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } catch (err) {
    throw new DomainError(
      `Failed to decode audio data: ${
        err instanceof Error ? err.message : String(err)
      }`,
      'DECODE_FAILED',
      err,
    );
  } finally {
    await closeAudioContext(ctx);
  }
}

/**
 * Извлекает моно-канал из AudioBuffer (среднее всех каналов).
 * Используется потребителями, которые работают только с моно.
 */
export function getMonoChannel(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }

  const length = buffer.length;
  const channels = buffer.numberOfChannels;
  const out = new Float32Array(length);

  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      out[i] = (out[i] ?? 0) + data[i]! / channels;
    }
  }
  return out;
}
