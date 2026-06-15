#!/usr/bin/env node
/**
 * Prod smoke: DS5 tariff catalog provisioning on media.membrana.space
 * Rebuilds media stack from feat/membrane-platform-mp4, runs ensure-reserved, asserts 120 samples.
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
MEDIA_ENV=/etc/membrana/media.env
MEDIA_TOKEN=$(grep '^API_INTERNAL_TOKEN=' "$MEDIA_ENV" | cut -d= -f2-)

cd /root/membrana
git fetch origin ${BRANCH}
git reset --hard FETCH_HEAD
chmod +x deploy/media-stack.sh
./deploy/media-stack.sh build
./deploy/media-stack.sh up
sleep 15

echo "=== media health ==="
curl -fsS http://127.0.0.1:3010/health; echo

echo "=== DS5: register smoke device ==="
DEV=$(curl -fsS -X POST http://127.0.0.1:3010/v1/devices \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" -H 'Content-Type: application/json' \\
  -d '{"name":"ds5-catalog-smoke","kind":"other","membrane":{"membraneId":"00000000-0000-4000-8000-00000000d505","userStorageQuotaBytes":"1073741824","bufferQuotaBytes":"536870912","datasetCatalogId":"free-v1-catalog"}}' \\
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
export DEV MEDIA_TOKEN

echo "=== DS5: ensure-reserved + provision (via ensure-reserved hook) ==="
curl -m 600 -fsS -X POST "http://127.0.0.1:3010/v1/devices/$DEV/collections/ensure-reserved" \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" > /dev/null

echo "=== DS5: provision-catalog result ==="
curl -fsS -X POST "http://127.0.0.1:3010/v1/devices/$DEV/collections/provision-catalog" \\
  -H "X-Membrana-Token: $MEDIA_TOKEN"

echo ""
echo "=== DS5: quota dataset sampleCount ==="
python3 -c "
import json, subprocess, os
dev = os.environ['DEV']
tok = os.environ['MEDIA_TOKEN']
quota = json.loads(subprocess.check_output([
  'curl', '-fsS', f'http://127.0.0.1:3010/v1/devices/{dev}/quota',
  '-H', f'X-Membrana-Token: {tok}',
]))
samples = json.loads(subprocess.check_output([
  'curl', '-fsS', f'http://127.0.0.1:3010/v1/devices/{dev}/collections/__tariff_dataset__/samples?page=1&limit=40',
  '-H', f'X-Membrana-Token: {tok}',
]))
count = samples['total']
assert count == 120, f'expected 120 samples, got {count}'
assert len(samples['items']) == 40, len(samples['items'])
assert quota['dataset']['catalogId'] == 'free-v1-catalog', quota
assert quota['dataset']['sampleCount'] == 120, quota
print('DS5 prod smoke OK: 120 tariff-dataset samples (paginated API)')
"

echo "=== DS5: idempotent re-provision ==="
python3 -c "
import json, subprocess, os
dev = os.environ['DEV']
tok = os.environ['MEDIA_TOKEN']
out = subprocess.check_output([
  'curl', '-fsS', '-X', 'POST',
  f'http://127.0.0.1:3010/v1/devices/{dev}/collections/provision-catalog',
  '-H', f'X-Membrana-Token: {tok}',
])
d = json.loads(out)
assert d['seeded'] == 0 and d['skipped'] == 120, d
print('idempotent ok:', d)
"
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
