#!/usr/bin/env node
/**
 * Prod deploy: MP4 media scope per membrane + tariff quota on Device.
 * Rebuilds media+cabinet stacks; media migration runs in media entrypoint.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const BRANCH = process.env.MEMBRANA_DEPLOY_BRANCH ?? 'feat/membrane-platform-mp4';

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

echo "=== MP4: register device with membrane tariff context ==="
MEMBRANE_ID="00000000-0000-4000-8000-00000000c0de"
DEV=$(curl -fsS -X POST http://127.0.0.1:3010/v1/devices \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" -H 'Content-Type: application/json' \\
  -d "{\\"name\\":\\"mp4-smoke\\",\\"kind\\":\\"other\\",\\"membrane\\":{\\"membraneId\\":\\"$MEMBRANE_ID\\",\\"userStorageQuotaBytes\\":\\"1073741824\\",\\"bufferQuotaBytes\\":\\"536870912\\",\\"datasetCatalogId\\":\\"free-v1-catalog\\"}}" \\
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
export DEV MEDIA_TOKEN
python3 -c "
import json, subprocess, os
dev = os.environ['DEV']
tok = os.environ['MEDIA_TOKEN']
out = subprocess.check_output([
  'curl', '-fsS', f'http://127.0.0.1:3010/v1/devices/{dev}/quota',
  '-H', f'X-Membrana-Token: {tok}',
])
d = json.loads(out)
assert d['userStorage']['limitBytes'] == 1073741824, d
assert d['buffer']['limitBytes'] == 536870912, d
assert d['dataset']['catalogId'] == 'free-v1-catalog', d
print('mp4 quota ok:', json.dumps(d, ensure_ascii=False))
"

echo "=== MP4: PATCH membrane sync ==="
curl -fsS -X PATCH "http://127.0.0.1:3010/v1/devices/$DEV/membrane" \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" -H 'Content-Type: application/json' \\
  -d "{\\"membrane\\":{\\"membraneId\\":\\"$MEMBRANE_ID\\",\\"userStorageQuotaBytes\\":\\"2097152\\",\\"bufferQuotaBytes\\":\\"1048576\\",\\"datasetCatalogId\\":\\"free-v1-catalog\\"}}" > /dev/null
python3 -c "
import json, subprocess, os
dev = os.environ['DEV']
tok = os.environ['MEDIA_TOKEN']
out = subprocess.check_output([
  'curl', '-fsS', f'http://127.0.0.1:3010/v1/devices/{dev}/quota',
  '-H', f'X-Membrana-Token: {tok}',
])
d = json.loads(out)
assert d['userStorage']['limitBytes'] == 2097152, d
assert d['buffer']['limitBytes'] == 1048576, d
print('mp4 patch sync ok')
"

echo "=== MP4: ensure-reserved collections ==="
curl -fsS -X POST "http://127.0.0.1:3010/v1/devices/$DEV/collections/ensure-reserved" \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" | python3 -c "import sys,json; cols=json.load(sys.stdin); ids=[c['id'] for c in cols]; assert '__tariff_dataset__' in ids; print('tariff dataset collection ok')"
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
