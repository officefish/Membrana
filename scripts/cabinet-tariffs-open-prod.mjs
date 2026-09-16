#!/usr/bin/env node
/**
 * Prod repair for #2297: open tariff-grid rows in cabinet DB and prove the live surface.
 *
 * The mutation uses Prisma inside the running `cabinet-api` container and reads
 * `/app/docs/tariffs/tariff-grid.json` from the runtime image. Existing tariff rows
 * are skipped: this task opens missing tariffs, it does not restamp `free-v1`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { Client } = require('ssh2');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readEnvFile(path) {
  if (!path || !existsSync(path)) return () => '';
  const envText = readFileSync(path, 'utf8');
  return (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
}

const CONTAINER_SCRIPT = String.raw`
import { readFileSync } from 'node:fs';
import { PrismaClient } from './generated/prisma/index.js';

const prisma = new PrismaClient();
const API = 'http://127.0.0.1:3020';
const TARGET_TARIFF = 'observatory-v1';

const tariffSelect = {
  id: true,
  name: true,
  userStorageQuotaBytes: true,
  bufferQuotaBytes: true,
  datasetCatalogId: true,
  maxActiveKeysPerNode: true,
  maxNodesPerMembrane: true,
  maxUserWorkspaces: true,
};

function normalizeTariff(row) {
  return {
    id: row.id,
    name: row.name,
    userStorageQuotaBytes: row.userStorageQuotaBytes.toString(),
    bufferQuotaBytes: row.bufferQuotaBytes.toString(),
    datasetCatalogId: row.datasetCatalogId,
    maxActiveKeysPerNode: row.maxActiveKeysPerNode,
    maxNodesPerMembrane: row.maxNodesPerMembrane,
    maxUserWorkspaces: row.maxUserWorkspaces,
  };
}

function requiredCell(row, id, kind) {
  const cell = row.cells?.[id];
  if (cell?.kind !== kind) throw new Error(row.sku + '.' + id + ': expected ' + kind + ' cell');
  return cell;
}

function requiredInteger(row, id) {
  const cell = requiredCell(row, id, 'quota');
  if (!Number.isSafeInteger(cell.limit) || cell.limit < 0) {
    throw new Error(row.sku + '.' + id + '.limit must be a safe non-negative integer');
  }
  return cell.limit;
}

function requiredCatalogId(row, id) {
  const cell = requiredCell(row, id, 'catalog');
  if (typeof cell.catalogId !== 'string' || cell.catalogId.trim() === '') {
    throw new Error(row.sku + '.' + id + '.catalogId must be a non-empty string');
  }
  return cell.catalogId;
}

function intendedRecord(row) {
  return {
    id: row.sku,
    name: row.productName + ' (' + row.sku + ')',
    userStorageQuotaBytes: BigInt(requiredInteger(row, 'storage.hot')),
    bufferQuotaBytes: BigInt(requiredInteger(row, 'storage.buffer')),
    datasetCatalogId: requiredCatalogId(row, 'dataset.sounds'),
    maxNodesPerMembrane: requiredInteger(row, 'nodes.max'),
    maxUserWorkspaces: requiredInteger(row, 'workspaces.user.max'),
  };
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error((init?.method ?? 'GET') + ' ' + url + ' -> ' + response.status + ': ' + text);
  }
  return body;
}

async function login() {
  const password = process.env.CABINET_BOOTSTRAP_PASSWORD;
  const loginName = process.env.CABINET_BOOTSTRAP_LOGIN || 'admin';
  if (!password) throw new Error('CABINET_BOOTSTRAP_PASSWORD is empty in cabinet-api container');
  const body = await fetchJson(API + '/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginName, password }),
  });
  if (!body?.token) throw new Error('login returned no token');
  return body.token;
}

async function authJson(token, url, init = {}) {
  return fetchJson(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: 'Bearer ' + token,
    },
  });
}

async function ensureTariffs(grid) {
  const result = { created: [], skipped: [] };
  for (const row of grid.rows) {
    const record = intendedRecord(row);
    const existing = await prisma.tariff.findUnique({ where: { id: row.sku }, select: { id: true } });
    if (existing) {
      result.skipped.push(row.sku);
      continue;
    }
    await prisma.tariff.create({
      data: {
        id: row.sku,
        name: record.name,
        userStorageQuotaBytes: record.userStorageQuotaBytes,
        bufferQuotaBytes: record.bufferQuotaBytes,
        datasetCatalogId: record.datasetCatalogId,
        maxNodesPerMembrane: record.maxNodesPerMembrane,
        maxUserWorkspaces: record.maxUserWorkspaces,
      },
    });
    result.created.push(row.sku);
  }
  return result;
}

function itemIds(catalog) {
  return (catalog?.items ?? []).map((item) => item.id);
}

try {
  const grid = JSON.parse(readFileSync('/app/docs/tariffs/tariff-grid.json', 'utf8'));
  if (!Array.isArray(grid.rows) || grid.rows.length === 0) {
    throw new Error('runtime tariff-grid has no rows');
  }

  const beforeRows = (await prisma.tariff.findMany({ orderBy: { id: 'asc' }, select: tariffSelect })).map(
    normalizeTariff,
  );
  const beforeLogCount = await prisma.tariffChangeLog.count();
  const freeBefore = beforeRows.find((row) => row.id === 'free-v1') ?? null;
  if (!freeBefore) throw new Error('free-v1 missing before mutation: refusing prod repair');

  const firstUpsert = await ensureTariffs(grid);
  const afterFirstRows = (await prisma.tariff.findMany({ orderBy: { id: 'asc' }, select: tariffSelect })).map(
    normalizeTariff,
  );
  const secondUpsert = await ensureTariffs(grid);
  const afterSecondRows = (await prisma.tariff.findMany({ orderBy: { id: 'asc' }, select: tariffSelect })).map(
    normalizeTariff,
  );
  const afterSeedLogCount = await prisma.tariffChangeLog.count();

  const token = await login();
  const catalogBeforeTransition = await authJson(token, API + '/v1/tariffs');
  const meBefore = await authJson(token, API + '/v1/membranes/me');
  const membraneId = meBefore?.membrane?.id;
  const currentBefore = catalogBeforeTransition?.currentTariffId ?? meBefore?.membrane?.tariff?.id;

  let transition = { skipped: false };
  if (currentBefore === TARGET_TARIFF) {
    const existingProof = await prisma.tariffChangeLog.findFirst({
      where: { membraneId, proofType: 'self', toTariffId: TARGET_TARIFF },
      orderBy: { at: 'desc' },
      select: { id: true, fromTariffId: true, toTariffId: true, proofType: true, at: true },
    });
    if (existingProof) {
      transition = { skipped: true, reason: 'already-current', existingProof };
    } else {
      const checkpoint = await authJson(token, API + '/v1/membranes/me/tariff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toTariffId: 'checkpoint-v1' }),
      });
      const observatory = await authJson(token, API + '/v1/membranes/me/tariff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toTariffId: TARGET_TARIFF }),
      });
      transition = { skipped: false, roundtripFromAlreadyCurrent: true, checkpoint, observatory };
    }
  } else {
    transition = await authJson(token, API + '/v1/membranes/me/tariff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toTariffId: TARGET_TARIFF }),
    });
  }

  const catalogAfterTransition = await authJson(token, API + '/v1/tariffs');
  const meAfter = await authJson(token, API + '/v1/membranes/me');
  const latestSelfProof = await prisma.tariffChangeLog.findFirst({
    where: { membraneId: meAfter?.membrane?.id, proofType: 'self' },
    orderBy: { at: 'desc' },
    select: { id: true, fromTariffId: true, toTariffId: true, proofType: true, at: true },
  });

  let mediaQuota = null;
  let quotaFanoutBlocker = null;
  const mediaDeviceId = meAfter?.node?.device?.mediaDeviceId;
  if (mediaDeviceId && process.env.MEDIA_API_URL && process.env.MEDIA_API_TOKEN) {
    mediaQuota = await fetchJson(process.env.MEDIA_API_URL + '/v1/devices/' + mediaDeviceId + '/quota', {
      headers: {
        'X-Membrana-Token': process.env.MEDIA_API_TOKEN,
        'X-Membrana-Device-Id': mediaDeviceId,
      },
    });
  } else {
    quotaFanoutBlocker = mediaDeviceId
      ? 'MEDIA_API_URL or MEDIA_API_TOKEN is empty in cabinet-api container'
      : 'admin membrane has no paired media device, so there is no node quota fanout to observe';
  }

  const expectedSenior = afterSecondRows.find((row) => row.id === TARGET_TARIFF);
  const quotaFanoutOk =
    mediaQuota != null &&
    String(mediaQuota.userStorage?.limitBytes) === expectedSenior?.userStorageQuotaBytes &&
    String(mediaQuota.buffer?.limitBytes) === expectedSenior?.bufferQuotaBytes &&
    mediaQuota.dataset?.catalogId === expectedSenior?.datasetCatalogId;

  const summary = {
    ok: true,
    gridRows: grid.rows.map((row) => row.sku),
    dbBefore: beforeRows,
    beforeLogCount,
    firstUpsert,
    secondUpsert,
    dbAfterSeed: afterSecondRows,
    seedTouchedChangeLog: afterSeedLogCount !== beforeLogCount,
    freeUnchanged: JSON.stringify(freeBefore) === JSON.stringify(afterSecondRows.find((row) => row.id === 'free-v1')),
    seedIdempotent: JSON.stringify(afterFirstRows) === JSON.stringify(afterSecondRows),
    catalogBeforeTransition: {
      currentTariffId: catalogBeforeTransition?.currentTariffId,
      itemIds: itemIds(catalogBeforeTransition),
    },
    transition,
    catalogAfterTransition: {
      currentTariffId: catalogAfterTransition?.currentTariffId,
      itemIds: itemIds(catalogAfterTransition),
    },
    latestSelfProof,
    contextSync: transition?.contextSync ?? transition?.observatory?.contextSync ?? null,
    mediaDeviceId: mediaDeviceId ?? null,
    quotaFanout: {
      ok: quotaFanoutOk,
      blocker: quotaFanoutOk ? null : quotaFanoutBlocker,
      observed: mediaQuota
        ? {
            userStorageLimitBytes: String(mediaQuota.userStorage?.limitBytes),
            bufferLimitBytes: String(mediaQuota.buffer?.limitBytes),
            datasetCatalogId: mediaQuota.dataset?.catalogId,
          }
        : null,
      expected: expectedSenior
        ? {
            userStorageLimitBytes: expectedSenior.userStorageQuotaBytes,
            bufferLimitBytes: expectedSenior.bufferQuotaBytes,
            datasetCatalogId: expectedSenior.datasetCatalogId,
          }
        : null,
    },
    bufferFill: {
      ok: false,
      blocker:
        'not executed: filling observatory-v1 buffer would intentionally write about 1 GiB into prod __buffer__; this run verifies the senior buffer limit and fanout instead',
    },
  };

  console.log('::cabinet-tariffs-prod-json::' + JSON.stringify(summary));
} finally {
  await prisma.$disconnect();
}
`;

const REMOTE_SCRIPT = `#!/bin/bash
set -euo pipefail
cd /root/membrana
CID=$(./deploy/cabinet-stack.sh ps -q cabinet-api)
if [ -z "$CID" ]; then
  echo "cabinet-api container not found" >&2
  exit 1
fi
docker exec -i -w /app/packages/background-cabinet "$CID" node --input-type=module <<'NODE'
${CONTAINER_SCRIPT}
NODE
`;

function writeArtifact(raw, summary, ok) {
  const dir = resolve(root, 'deploy-artifacts');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = resolve(dir, `cabinet-tariffs-prod-${stamp}.json`);
  writeFileSync(file, `${JSON.stringify({ ok, summary, raw }, null, 2)}\n`, 'utf8');
  return file;
}

async function main() {
  const envFile = process.env.MEMBRANA_ENV_PATH || resolve(root, '.env');
  const get = readEnvFile(envFile);
  const host = process.env.BACKGROUND_MEDIA_IPV4 || get('BACKGROUND_MEDIA_IPV4');
  const password = process.env.BACKGROUND_MEDIA_PASSWORD || get('BACKGROUND_MEDIA_PASSWORD');
  if (!host || !password) {
    console.error('Set BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD via env or MEMBRANA_ENV_PATH');
    process.exit(1);
  }

  const startedAt = new Date();
  const result = await new Promise((resolvePromise) => {
    let raw = '';
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.exec('bash -s', (err, stream) => {
          if (err) throw err;
          stream.write(REMOTE_SCRIPT);
          stream.end();
          stream.on('data', (d) => {
            raw += d.toString();
            process.stdout.write(d);
          });
          stream.stderr.on('data', (d) => {
            raw += d.toString();
            process.stderr.write(d);
          });
          stream.on('close', (code) => {
            conn.end();
            resolvePromise({ code: code ?? 1, raw });
          });
        });
      })
      .on('error', (e) => resolvePromise({ code: 1, raw: `[ssh-error] ${e?.message ?? e}` }))
      .connect({ host, port: 22, username: 'root', password, readyTimeout: 60000 });
  });

  const marker = result.raw.match(/::cabinet-tariffs-prod-json::({.*})/);
  const summary = marker ? JSON.parse(marker[1]) : null;
  const ok =
    result.code === 0 &&
    summary?.ok === true &&
    summary?.freeUnchanged === true &&
    summary?.seedIdempotent === true &&
    summary?.seedTouchedChangeLog === false &&
    summary?.catalogAfterTransition?.itemIds?.includes('checkpoint-v1') &&
    summary?.catalogAfterTransition?.itemIds?.includes('observatory-v1') &&
    summary?.latestSelfProof?.proofType === 'self';

  const file = writeArtifact(result.raw, { ...summary, startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString() }, ok);
  console.log(`\n=== cabinet tariffs prod summary (${file}) ===`);
  console.log(JSON.stringify({ ok, summary }, null, 2));
  process.exit(ok ? 0 : 1);
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  main();
}
