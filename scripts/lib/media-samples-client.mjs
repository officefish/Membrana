/**
 * Клиент чтения `__tariff_dataset__` с background-media (data-anchor producer, ADR 0004).
 *
 * Только READ: список сэмплов + скачивание blob'ов. Media остаётся системой правды,
 * этот клиент не пишет и не изменяет метки — так же как office не импортирует
 * @membrana/core, drift-anchor-скрипты не импортируют media-server код, только HTTP.
 */
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { filterCuratedSamples } from './manifest-labels.mjs';

const TARIFF_DATASET_COLLECTION_ID = '__tariff_dataset__';

function authHeaders(token) {
  return { 'X-Membrana-Token': token };
}

/** Постранично собрать все сэмплы коллекции (media отдаёт `items/page/limit/total/totalPages`). */
async function listAllSamples(baseUrl, token, deviceId) {
  const items = [];
  let page = 1;
  const limit = 200;
  for (;;) {
    const url = `${baseUrl}/v1/devices/${deviceId}/collections/${TARIFF_DATASET_COLLECTION_ID}/samples?page=${page}&limit=${limit}`;
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) {
      throw new Error(`list samples failed (${res.status}): ${await res.text()}`);
    }
    const body = await res.json();
    items.push(...body.items);
    if (page >= body.totalPages || body.items.length === 0) break;
    page += 1;
  }
  return items;
}

async function downloadBlob(baseUrl, token, deviceId, sampleId, destPath) {
  const url = `${baseUrl}/v1/devices/${deviceId}/samples/${sampleId}/blob`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok || !res.body) {
    throw new Error(`download blob ${sampleId} failed (${res.status})`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
}

/**
 * Скачать текущий `__tariff_dataset__` во временный каталог; вернуть
 * `{id, path, label}[]` (только drone/not-drone — как `filterCuratedSamples`
 * в code-anchor) готовый к `runDetector`/`runTemplateMatch`/`runYamnet`
 * (`benchmark-detectors.mjs`, тот же формат `{id, path, label}` + `datasetDir`).
 */
export async function fetchTariffDatasetSamples({ baseUrl, token, deviceId, destDir }) {
  await mkdir(destDir, { recursive: true });
  const items = await listAllSamples(baseUrl, token, deviceId);
  const curated = filterCuratedSamples(items);

  const manifestSamples = [];
  for (const item of curated) {
    if (item.audioFormat !== 'wav') continue; // readWavMono — только WAV
    const fileName = `${item.id}.wav`;
    await downloadBlob(baseUrl, token, deviceId, item.id, join(destDir, fileName));
    manifestSamples.push({ id: item.id, path: fileName, label: item.label });
  }
  return { manifestSamples, totalListed: items.length, totalCurated: curated.length };
}
