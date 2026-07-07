/**
 * ND1 — node-вход пакета: чтение бандленных артефактов YAMNet с диска.
 *
 * Отдельный subpath-экспорт (`@membrana/yamnet-detector-service/node`), чтобы
 * `node:fs` не попадал в браузерный бандл (клиентский плагин грузит ассеты fetch'ем
 * через основной вход). Используется бенчмарком и любым node-потребителем.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';
import type { DroneDetector } from '@membrana/detector-base';

import { YamnetModel, type YamnetModelArtifacts } from './core/model.js';
import {
  createYamnetDetector,
  type YamnetDetectorOptions,
} from './core/yamnet-detector.js';

/**
 * Переводит TF.js на WASM-бэкенд (SIMD): чистый JS-CPU даёт p95 ~880 мс на 1с-окно,
 * WASM — кратно быстрее. Best-effort: при недоступности остаёмся на дефолтном бэкенде
 * (детектор корректен, только медленнее).
 */
let wasmInit: Promise<boolean> | null = null;
function ensureWasmBackend(): Promise<boolean> {
  if (wasmInit === null) {
    wasmInit = tf
      .setBackend('wasm')
      .then((ok) => (ok ? tf.ready().then(() => true) : false))
      .catch(() => false);
  }
  return wasmInit;
}

/** Каталог бандленных артефактов модели внутри пакета. */
function defaultModelDir(): string {
  // src/node.ts и dist/node.js лежат на одном уровне от корня пакета → ../assets/model.
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'model');
}

/** Читает model.json + шарды весов из каталога (по умолчанию — бандл пакета). */
export async function readYamnetArtifacts(modelDir = defaultModelDir()): Promise<YamnetModelArtifacts> {
  const modelJson = JSON.parse(
    await readFile(join(modelDir, 'model.json'), 'utf8'),
  ) as YamnetModelArtifacts['modelJson'];
  const shardNames = modelJson.weightsManifest.flatMap((group) => group.paths);
  const weightShards = await Promise.all(
    shardNames.map(async (name) => {
      const buf = await readFile(join(modelDir, name));
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }),
  );
  return { modelJson, weightShards };
}

/** Детектор с моделью из бандла пакета (node: бенчмарк, Electron main, тесты). */
export function createYamnetDetectorNode(
  options: Omit<YamnetDetectorOptions, 'modelProvider'> & { modelDir?: string } = {},
): DroneDetector {
  const { modelDir, ...rest } = options;
  return createYamnetDetector({
    ...rest,
    modelProvider: async () => {
      await ensureWasmBackend();
      return YamnetModel.fromArtifacts(await readYamnetArtifacts(modelDir));
    },
  });
}
