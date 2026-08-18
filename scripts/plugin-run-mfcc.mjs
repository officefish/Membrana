#!/usr/bin/env node
/**
 * plugin:run:mfcc — прогон `membrana.handler.mfcc` на настоящей коллекции медиа-сервиса (M6′, #1961):
 * пробы ТОЛЬКО GET'ами (норма #1950), `meyda` под пресет ворот, `PluginContext` с адресом из пяти
 * полей, двумя отпечатками и `resumeMode: 'fresh'`.
 *
 * Usage: yarn plugin:run:mfcc --device <uuid> --collection <uuid> [--strictness normal] [--out <file.json>]
 *        (без флагов — FIELD_NODE_DEVICE_ID / FIELD_NODE_COLLECTION_ID из .env)
 *
 * `--host none` (умолчание, пока PR-2 не в стволе): executor вызывается напрямую, RunRecord печатается —
 * ПРЕДВАРИТЕЛЬНЫЙ прогон, не живой след: в `plugin-results` кладёт только хост (`--host collections`).
 */
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HANDLERS_DIST = join(ROOT, 'packages', 'plugin-handlers', 'dist', 'index.js');
const PRESET_JSON = join(ROOT, 'data', 'detectors-benchmark', 'v0.2', 'reports', 'mfcc-gates-first-cut.json');

function args(argv) {
  const o = { strictness: 'normal', host: 'none', out: null, device: null, collection: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--') && argv[i + 1] !== undefined) o[k.slice(2)] = argv[++i];
  }
  return o;
}

async function envMap() {
  const text = await readFile(join(ROOT, '.env'), 'utf8').catch(() => '');
  return Object.fromEntries(
    text.split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }),
  );
}

/** UUID v7: 48 бит миллисекунд + версия + случайные биты — монотонен по времени (M3′). */
export function uuidV7(now = Date.now()) {
  const b = randomBytes(16);
  b.writeUIntBE(now, 0, 6);
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Читатель проб по HTTP медиа-сервиса: два GET'а, ничего больше. */
export function httpSampleReader({ base, token, deviceId }, { sha256Hex }) {
  const headers = { 'x-membrana-token': token };
  const get = async (path, accept) => {
    const res = await fetch(`${base}${path}`, { headers: { ...headers, accept }, signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return res;
  };
  return {
    async listSamples(collectionId) {
      const items = [];
      for (let page = 1; ; page++) {
        const j = await (await get(`/v1/devices/${deviceId}/collections/${collectionId}/samples?page=${page}&limit=100`, 'application/json')).json();
        items.push(...j.items);
        if (page >= (j.totalPages ?? 1)) break;
      }
      return items.map((s) => ({ id: s.id, sampleRate: s.sampleRate, channels: s.channels, audioFormat: s.audioFormat, sizeBytes: s.sizeBytes, title: s.title }));
    },
    async readAudio(sample) {
      const bytes = new Uint8Array(await (await get(`/v1/devices/${deviceId}/samples/${sample.id}/blob`, '*/*')).arrayBuffer());
      return { bytes, contentHash: sha256Hex(bytes) };
    },
  };
}

async function main() {
  const opt = args(process.argv.slice(2));
  const env = await envMap();
  const { VITE_MEDIA_SERVER_URL: base, VITE_MEDIA_API_TOKEN: token } = env;
  const deviceId = opt.device ?? env.FIELD_NODE_DEVICE_ID;
  const collectionId = opt.collection ?? env.FIELD_NODE_COLLECTION_ID;
  if (!base || !token || !deviceId || !collectionId) throw new Error('нужны VITE_MEDIA_SERVER_URL, VITE_MEDIA_API_TOKEN и --device/--collection (или FIELD_NODE_*)');

  const { MFCC_HANDLER_MANIFEST, createMfccExecutor, mfccFingerprintsOf, mfccConfigFromHash, sha256Hex } =
    await import(pathToFileURL(HANDLERS_DIST).href).catch(() => { throw new Error(`нет ${HANDLERS_DIST} — соберите: yarn workspace @membrana/plugin-handlers build`); });

  const { preset } = JSON.parse(await readFile(PRESET_JSON, 'utf8'));
  const config = mfccConfigFromHash(preset.configHash);
  const Meyda = (await import('meyda')).default;
  // Свой экземпляр настроек, не глобальный объект: параметр вызова meyda молча игнорирует (#1603).
  const instance = { ...Meyda, bufferSize: config.bufferSize, melBands: config.melBands, numberOfMFCCCoefficients: config.numberOfCoefficients, sampleRate: config.sampleRate };
  const extract = (frame) => instance.extract('mfcc', frame);

  const deps = { manifest: MFCC_HANDLER_MANIFEST, reader: httpSampleReader({ base, token, deviceId }, { sha256Hex }), extract, preset, strictness: opt.strictness };
  const executor = createMfccExecutor(deps);

  const fingerprints = await mfccFingerprintsOf(deps, collectionId);
  const ctx = {
    address: { pluginId: MFCC_HANDLER_MANIFEST.id, version: MFCC_HANDLER_MANIFEST.version, collectionId, runId: uuidV7(), mountTarget: MFCC_HANDLER_MANIFEST.mountTarget },
    fingerprints,
    resumeMode: 'fresh',
    trigger: 'collections.sample_added',
    payload: { collectionId, occurredAt: new Date() },
  };

  if (opt.host !== 'none') throw new Error(`хост «${opt.host}» ещё не подключён к скрипту: ждёт PR-2 (сессия В)`);
  const result = await executor.execute(ctx);
  const runRecord = { ...result, address: ctx.address, fingerprints: ctx.fingerprints, resumeMode: ctx.resumeMode };
  const text = JSON.stringify({ note: 'предварительный прогон без хоста: документ НЕ в plugin-results', runRecord }, null, 2);
  if (opt.out) await writeFile(opt.out, text, 'utf8');
  console.log(text);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`plugin:run:mfcc — ${e.message}`); process.exit(1); });
}
