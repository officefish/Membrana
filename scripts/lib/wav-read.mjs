import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WAV_DECODE_DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'libs', 'wav-decode', 'dist', 'index.js');

/**
 * Прочитать WAV с диска и отдать моно Float32 + частоту.
 *
 * Разбор PCM16 — в `@membrana/wav-decode` (#1972: до 19.08 здесь была одна из трёх копий декодера);
 * здесь только чтение файла и отказ с именем файла. Пакет грузится из dist по пути, как и детекторы
 * в измерителе (`ensureBuilt`): скрипты этой семьи и так работают поверх собранных пакетов.
 * @returns {Promise<{ samples: Float32Array; sampleRate: number }>}
 */
export async function readWavMono(filePath) {
  const buf = await readFile(filePath);
  const { decodeWavMono16 } = await import(pathToFileURL(WAV_DECODE_DIST).href).catch(() => {
    throw new Error(`@membrana/wav-decode не собран (${join('packages', 'libs', 'wav-decode', 'dist')}) — yarn workspace @membrana/wav-decode build`);
  });
  const decoded = decodeWavMono16(buf);
  if (!decoded.ok) throw new Error(`${filePath}: WAV не разобран — ${decoded.reason}`);
  return decoded.audio;
}
