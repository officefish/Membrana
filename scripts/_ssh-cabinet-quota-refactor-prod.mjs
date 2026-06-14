#!/usr/bin/env node
/**
 * Prod deploy: tariff quota refactor (userStorageQuotaBytes, split media quota, cabinet UI).
 * Pulls branch, rebuilds media+cabinet stacks (migrate runs in cabinet entrypoint).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const BRANCH = process.env.MEMBRANA_DEPLOY_BRANCH ?? 'feat/background-media-swagger';

const remoteScript = `#!/bin/bash
set -euo pipefail
ENV=/etc/membrana/cabinet.env
MEDIA_ENV=/etc/membrana/media.env
MEDIA_TOKEN=$(grep '^API_INTERNAL_TOKEN=' "$MEDIA_ENV" | cut -d= -f2-)

upsert() {
  local key="$1" val="$2"
  if grep -q "^\${key}=" "$ENV"; then
    sed -i "s|^\${key}=.*|\${key}=\${val}|" "$ENV"
  else
    echo "\${key}=\${val}" >> "$ENV"
  fi
}

media_upsert() {
  local key="$1" val="$2"
  if grep -q "^\${key}=" "$MEDIA_ENV"; then
    sed -i "s|^\${key}=.*|\${key}=\${val}|" "$MEDIA_ENV"
  else
    echo "\${key}=\${val}" >> "$MEDIA_ENV"
  fi
}

# Backfill split quota env (idempotent; legacy MEDIA_QUOTA_BYTES_PER_DEVICE still works)
media_upsert MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE "1073741824"
media_upsert MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE "1073741824"
media_upsert MEDIA_DEFAULT_DATASET_CATALOG_ID "free-v1-catalog"

upsert MEDIA_API_URL "http://media-api:3010"
upsert MEDIA_API_TOKEN "$MEDIA_TOKEN"

cd /root/membrana
git fetch origin ${BRANCH}
git reset --hard FETCH_HEAD
chmod +x deploy/media-stack.sh deploy/cabinet-stack.sh
./deploy/media-stack.sh build
./deploy/media-stack.sh up
sleep 10
ln -sf /etc/membrana/cabinet.env packages/background-cabinet/.env.docker
./deploy/cabinet-stack.sh build
./deploy/cabinet-stack.sh up
sleep 30

echo "=== cabinet health ==="
curl -fsS http://127.0.0.1:3020/health; echo

echo "=== media health ==="
curl -fsS http://127.0.0.1:3010/health; echo

echo "=== cabinet login + tariff fields ==="
TOKEN=$(curl -fsS -X POST http://127.0.0.1:3020/v1/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"login":"demo","password":"demo12345"}' | jq -r .token)
curl -fsS http://127.0.0.1:3020/v1/membranes/me -H "Authorization: Bearer $TOKEN" | jq '.membrane.tariff | {id,userStorageQuotaBytes,bufferQuotaBytes,datasetCatalogId}'

echo "=== media quota shape (register temp device) ==="
DEV=$(curl -fsS -X POST http://127.0.0.1:3010/v1/devices \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" -H 'Content-Type: application/json' \\
  -d '{"name":"quota-smoke","kind":"microphone"}' | jq -r .id)
curl -fsS "http://127.0.0.1:3010/v1/devices/$DEV/quota" -H "X-Membrana-Token: $MEDIA_TOKEN" | jq '{userStorage,buffer,dataset}'
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec('bash -s', (err, stream) => {
    if (err) throw err;
    stream.write(remoteScript);
    stream.end();
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (code) => {
      conn.end();
      process.exit(code ?? 1);
    });
  });
}).connect({
  host: get('BACKGROUND_MEDIA_IPV4'),
  port: 22,
  username: 'root',
  password: get('BACKGROUND_MEDIA_PASSWORD'),
  readyTimeout: 30000,
});
