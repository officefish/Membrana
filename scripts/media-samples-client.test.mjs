import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, afterEach, test } from 'node:test';

import { fetchTariffDatasetSamples } from './lib/media-samples-client.mjs';

const ORIGINAL_FETCH = globalThis.fetch;
let dirs = [];

function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'media-client-test-'));
  dirs.push(d);
  return d;
}

after(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

test('fetchTariffDatasetSamples: пагинация + фильтр curated (drone/not-drone) + WAV-only', async () => {
  const page1 = {
    items: [
      { id: 'a', label: 'drone', audioFormat: 'wav' },
      { id: 'b', label: 'not-drone', audioFormat: 'wav' },
      { id: 'c', label: 'unlabeled', audioFormat: 'wav' }, // отфильтруется
      { id: 'd', label: 'drone', audioFormat: 'mp3' }, // не WAV — пропускается
    ],
    page: 1,
    limit: 200,
    total: 4,
    totalPages: 1,
  };
  const blobCalls = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/samples?')) {
      return new Response(JSON.stringify(page1), { status: 200 });
    }
    if (u.includes('/blob')) {
      blobCalls.push(u);
      return new Response('RIFF-fake-wav-bytes', { status: 200 });
    }
    throw new Error(`unexpected url: ${u}`);
  };

  const destDir = tmp();
  const result = await fetchTariffDatasetSamples({
    baseUrl: 'https://media.example',
    token: 'tok',
    deviceId: 'dev-1',
    destDir,
  });

  assert.equal(result.totalListed, 4);
  assert.equal(result.totalCurated, 3); // unlabeled исключён из curated, но mp3 всё ещё среди curated до WAV-фильтра
  assert.deepEqual(
    result.manifestSamples.map((s) => s.id).sort(),
    ['a', 'b'],
  ); // c — unlabeled, d — не WAV
  assert.equal(blobCalls.length, 2);
  assert.ok(existsSync(join(destDir, 'a.wav')));
  assert.equal(readFileSync(join(destDir, 'a.wav'), 'utf8'), 'RIFF-fake-wav-bytes');
});

test('fetchTariffDatasetSamples: несколько страниц собираются в один список', async () => {
  const pages = [
    { items: [{ id: 'p1', label: 'drone', audioFormat: 'wav' }], page: 1, limit: 1, total: 2, totalPages: 2 },
    { items: [{ id: 'p2', label: 'not-drone', audioFormat: 'wav' }], page: 2, limit: 1, total: 2, totalPages: 2 },
  ];
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/blob')) return new Response('x', { status: 200 });
    const page = u.includes('page=2') ? pages[1] : pages[0];
    return new Response(JSON.stringify(page), { status: 200 });
  };

  const result = await fetchTariffDatasetSamples({
    baseUrl: 'https://media.example',
    token: 'tok',
    deviceId: 'dev-1',
    destDir: tmp(),
  });
  assert.deepEqual(result.manifestSamples.map((s) => s.id).sort(), ['p1', 'p2']);
});

test('fetchTariffDatasetSamples: HTTP-ошибка списка — явный throw, не тихий пустой результат', async () => {
  globalThis.fetch = async () => new Response('server error', { status: 500 });
  await assert.rejects(
    () =>
      fetchTariffDatasetSamples({
        baseUrl: 'https://media.example',
        token: 'tok',
        deviceId: 'dev-1',
        destDir: tmp(),
      }),
    /list samples failed \(500\)/,
  );
});
