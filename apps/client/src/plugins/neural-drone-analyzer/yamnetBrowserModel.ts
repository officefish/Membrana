/**
 * ND2 — браузерный провайдер модели YAMNet: бандленные артефакты пакета
 * подхватываются vite (?url → файлы попадают в сборку клиента/Electron),
 * читаются fetch'ем локально — офлайн-гарантия free-Studio, сети не нужно.
 *
 * Порядок шардов фиксирован манифестом model.json (group1-shard1..4of4).
 * Бэкенд TF.js в браузере выбирается сам (WebGL → быстрее WASM/CPU).
 */
import { YamnetModel, type YamnetModelArtifacts } from '@membrana/yamnet-detector-service';

import modelJsonUrl from '@membrana/yamnet-detector-service/assets/model/model.json?url';
import shard1Url from '@membrana/yamnet-detector-service/assets/model/group1-shard1of4.bin?url';
import shard2Url from '@membrana/yamnet-detector-service/assets/model/group1-shard2of4.bin?url';
import shard3Url from '@membrana/yamnet-detector-service/assets/model/group1-shard3of4.bin?url';
import shard4Url from '@membrana/yamnet-detector-service/assets/model/group1-shard4of4.bin?url';

const SHARD_URLS: Record<string, string> = {
  'group1-shard1of4.bin': shard1Url,
  'group1-shard2of4.bin': shard2Url,
  'group1-shard3of4.bin': shard3Url,
  'group1-shard4of4.bin': shard4Url,
};

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не удалось загрузить артефакт модели: ${url} (${res.status})`);
  return res.arrayBuffer();
}

async function fetchArtifacts(): Promise<YamnetModelArtifacts> {
  const res = await fetch(modelJsonUrl);
  if (!res.ok) throw new Error(`Не удалось загрузить model.json (${res.status})`);
  const modelJson = (await res.json()) as YamnetModelArtifacts['modelJson'];
  const shardNames = modelJson.weightsManifest.flatMap((group) => group.paths);
  const weightShards = await Promise.all(
    shardNames.map((name) => {
      const url = SHARD_URLS[name];
      if (!url) throw new Error(`Шард из манифеста не забандлен: ${name}`);
      return fetchArrayBuffer(url);
    }),
  );
  return { modelJson, weightShards };
}

/** Провайдер для YamnetDetector: браузер/Electron-renderer, бандл клиента. */
export async function loadYamnetBrowserModel(): Promise<YamnetModel> {
  return YamnetModel.fromArtifacts(await fetchArtifacts());
}
