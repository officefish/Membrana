#!/usr/bin/env node
/**
 * plugin:run:mfcc — прогон `membrana.handler.mfcc` на настоящей коллекции медиа-сервиса (M6′, #1961):
 * пробы ТОЛЬКО GET'ами (норма #1950), `meyda` под пресет ворот, `PluginContext` с адресом из пяти
 * полей, двумя отпечатками и `resumeMode: 'fresh'`.
 *
 * Usage: yarn plugin:run:mfcc --device <uuid> --collection <uuid> [--strictness normal] [--out <file.json>]
 *          [--host none|collections] [--mongo-uri <uri> | --tunnel office] [--doc <file.md>]
 *        (без флагов — FIELD_NODE_DEVICE_ID / FIELD_NODE_COLLECTION_ID из .env)
 *
 * `--host none` (умолчание): executor вызывается напрямую, RunRecord печатается — ПРЕДВАРИТЕЛЬНЫЙ прогон,
 * не живой след. `--host collections`: настоящий `CollectionsPluginHostService` (dist media, PR-2), шесть
 * плагинов через `registerFirstWave`, прогон через `host.request`, результат — сидом `onResult`; RunRecord
 * пишется в дом результатов офиса тем же кодом, что у офиса (`PluginResultsService` + `MongoPluginResultsStore`,
 * dist office), читается обратно `readRuns` и рендерится документом (`--doc`). Mongo офиса наружу не
 * опубликована — `--tunnel office` поднимает SSH-туннель до контейнера `archivarius-mongo`.
 */
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getOfficeSshConfig } from './_ssh-office-config.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HANDLERS_DIST = join(ROOT, 'packages', 'plugin-handlers', 'dist', 'index.js');
const PRESET_JSON = join(ROOT, 'data', 'detectors-benchmark', 'v0.2', 'reports', 'mfcc-gates-first-cut.json');
const MEDIA_HOST_DIST = join(ROOT, 'packages', 'background-media', 'dist', 'modules', 'collections', 'plugin-host.service.js');
const OFFICE_RESULTS_DIST = join(ROOT, 'packages', 'background-office', 'dist', 'modules', 'plugin-results');
const OFFICE_MONGO_CONTAINER = 'membrana-office-archivarius-mongo-1';
const OFFICE_MONGO_DB = 'membrana_archivarius';

function args(argv) {
  const o = { strictness: 'normal', host: 'none', out: null, device: null, collection: null, 'mongo-uri': null, tunnel: null, doc: null };
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

const sshExec = (conn, cmd) => new Promise((ok, no) => conn.exec(cmd, (err, stream) => {
  if (err) return no(err);
  let out = ''; stream.on('data', (d) => { out += d; }).on('close', () => ok(out.trim()));
}));

/** SSH-туннель к Mongo офиса: контейнер наружу порт не публикует, адрес берём у docker на месте. */
export async function openOfficeMongoTunnel() {
  const { Client } = await import('ssh2');
  const conn = new Client();
  await new Promise((ok, no) => conn.on('ready', ok).on('error', no).connect(getOfficeSshConfig()));
  const ip = await sshExec(conn, `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${OFFICE_MONGO_CONTAINER}`);
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) throw new Error(`не нашёл адрес контейнера ${OFFICE_MONGO_CONTAINER}: «${ip}»`);
  const server = createServer((sock) => conn.forwardOut('127.0.0.1', sock.remotePort ?? 0, ip, 27017, (err, stream) => {
    if (err) return sock.destroy();
    sock.pipe(stream).pipe(sock);
  }));
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return {
    uri: `mongodb://127.0.0.1:${server.address().port}/${OFFICE_MONGO_DB}?directConnection=true`,
    close: () => { server.close(); conn.end(); },
  };
}

/** Документ предъявления — из того, что прочитано ОБРАТНО из plugin-results, не из локального результата. */
export function renderRunDoc(view, { collectionName, deviceName }) {
  const a = view.address, f = view.fingerprints, p = view.passport;
  const rows = view.samples.map((s) => `| ${s.title} | ${s.sampleRate} | ${s.frames} | **${s.outcome}** | ${s.passRate ?? '—'} | ${s.judgedCount ?? '—'} / ${s.silentCount ?? '—'} | ${s.reason ?? '—'} |`);
  return `# Первый живой прогон плагина — ${a.pluginId}

Документ прочитан из дома результатов (\`plugin-results\`, Mongo офиса) вызовом \`readRuns\` после записи;
не лог и не локальный вывод. Эпик #1961, приёмка Т3.11 (M6′). Коллекция «${collectionName}» устройства \`${deviceName}\`.

| Поле | Значение |
|---|---|
| **runId** | \`${a.runId}\` |
| address.pluginId | \`${a.pluginId}\` |
| address.version | \`${a.version}\` |
| address.collectionId | \`${a.collectionId}\` |
| address.mountTarget | \`${a.mountTarget}\` |
| fingerprints.inputHash | \`${f.inputHash}\` |
| fingerprints.configHash | \`${f.configHash}\` |
| resumeMode | \`${view.resumeMode}\` |
| kind · completedAt | \`${view.kind}\` · ${new Date(view.completedAt).toISOString()} |
| stale (по чтению) | ${String(view.stale ?? false)} |
| StateRecord · ConvergenceRecord | отсутствуют — норма одиночного детерминированного прогона (M6′) |

Рабочая точка: ворота \`${p.presetConfigHash}\`, строгость \`${p.strictness}\`, minInBandRatio ${p.minInBandRatio}, minPassRate ${p.minPassRate}, minMagnitude ${p.minMagnitude}, судимые коэффициенты [${p.judgedCoefficients.join(', ')}]. Пороги калибровки не менялись.

## Что измерено по пробам

| Проба | Гц | Кадров | Исход | passRate | судимых / немых | Причина отказа |
|---|---|---|---|---|---|---|
${rows.join('\n')}

Сводка: всего ${view.summary.total} · detected ${view.summary.detected} · not-detected ${view.summary.notDetected} · refused ${view.summary.refused}.
Отказ по пробе — не «дрона нет», а «судить нечем»: запись при 44,1 кГц воротами, снятыми при 48 кГц, не судится и не подгоняется.
`;
}

async function main() {
  const opt = args(process.argv.slice(2));
  const env = await envMap();
  const { VITE_MEDIA_SERVER_URL: base, VITE_MEDIA_API_TOKEN: token } = env;
  const deviceId = opt.device ?? env.FIELD_NODE_DEVICE_ID;
  const collectionId = opt.collection ?? env.FIELD_NODE_COLLECTION_ID;
  if (!base || !token || !deviceId || !collectionId) throw new Error('нужны VITE_MEDIA_SERVER_URL, VITE_MEDIA_API_TOKEN и --device/--collection (или FIELD_NODE_*)');

  const handlers = await import(pathToFileURL(HANDLERS_DIST).href).catch(() => { throw new Error(`нет ${HANDLERS_DIST} — соберите: yarn workspace @membrana/plugin-handlers build`); });
  const { MFCC_HANDLER_MANIFEST, createMfccExecutor, mfccFingerprintsOf, mfccConfigFromHash, sha256Hex } = handlers;

  const { preset } = JSON.parse(await readFile(PRESET_JSON, 'utf8'));
  // Считалка — единственная точка настройки meyda живёт в пакете плагинов (та же, что у регистратора media).
  const extract = await handlers.createMeydaExtractor(mfccConfigFromHash(preset.configHash));

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

  if (opt.host === 'none') {
    const result = await executor.execute(ctx);
    const runRecord = { ...result, address: ctx.address, fingerprints: ctx.fingerprints, resumeMode: ctx.resumeMode };
    const text = JSON.stringify({ note: 'предварительный прогон без хоста: документ НЕ в plugin-results', runRecord }, null, 2);
    if (opt.out) await writeFile(opt.out, text, 'utf8');
    console.log(text);
    return;
  }
  if (opt.host !== 'collections') throw new Error(`хост «${opt.host}» неизвестен: none | collections`);

  // Живой прогон: настоящий хост (PR-2) → registerFirstWave (шесть) → request → результат сидом.
  const { CollectionsPluginHostService } = await import(pathToFileURL(MEDIA_HOST_DIST).href);
  const host = new CollectionsPluginHostService();
  await host.onModuleInit();
  let captured = null;
  handlers.registerFirstWave(host, { mfcc: { reader: deps.reader, extract, preset, strictness: opt.strictness }, onResult: (_m, _c, r) => { captured = r; } });
  console.error(`хост ${host.mountTargetId}: зарегистрировано ${host.getRegisteredPlugins().length} плагинов`);
  await host.request(MFCC_HANDLER_MANIFEST.id, ctx.trigger, ctx);
  if (!captured) throw new Error('хост отработал, но результат до сида не дошёл');
  const runRecord = { ...captured, address: ctx.address, fingerprints: ctx.fingerprints, resumeMode: ctx.resumeMode };

  // Дом результатов — тем же кодом, что у офиса; Mongo — по туннелю или по данному URI.
  const tunnel = opt['mongo-uri'] ? null : opt.tunnel === 'office' ? await openOfficeMongoTunnel() : null;
  const mongoUri = opt['mongo-uri'] ?? tunnel?.uri;
  if (!mongoUri) throw new Error('для --host collections нужен --mongo-uri <uri> или --tunnel office');
  try {
    const { MongoPluginResultsStore } = await import(pathToFileURL(join(OFFICE_RESULTS_DIST, 'plugin-results.mongo-store.js')).href);
    const { PluginResultsService } = await import(pathToFileURL(join(OFFICE_RESULTS_DIST, 'plugin-results.service.js')).href);
    const store = new MongoPluginResultsStore({ PLUGIN_RESULTS_MONGO_URI: mongoUri, PLUGIN_RESULTS_MONGO_DB: OFFICE_MONGO_DB });
    const results = new PluginResultsService(store);
    await results.writeRun(runRecord);
    const [view] = (await results.readRuns({ collectionId, pluginId: MFCC_HANDLER_MANIFEST.id, currentInputHash: fingerprints.inputHash }))
      .filter((r) => r.address.runId === ctx.address.runId);
    if (!view) throw new Error('записал, но readRuns прогон не вернул');
    await store.onModuleDestroy?.();
    const text = JSON.stringify({ note: 'живой прогон: документ прочитан из plugin-results', runRecord: view }, null, 2);
    if (opt.out) await writeFile(opt.out, text, 'utf8');
    if (opt.doc) await writeFile(opt.doc, renderRunDoc(view, { collectionName: opt['collection-name'] ?? collectionId, deviceName: opt['device-name'] ?? deviceId }), 'utf8');
    console.log(text);
  } finally {
    tunnel?.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`plugin:run:mfcc — ${e.message}`); process.exit(1); });
}
