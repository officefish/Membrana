#!/usr/bin/env node
/**
 * Prod deploy: sample pagination + collection sampleCount (media + cabinet).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const BRANCH = process.env.MEMBRANA_DEPLOY_BRANCH ?? 'feat/sample-library-drone-detection-sld1-sld2';
const USER_DEVICE = process.env.MEMBRANA_PROD_DEVICE_ID ?? '6a5b06c7-2c47-4e74-8cf0-293196fc2087';

const remoteScript = `#!/bin/bash
set -euo pipefail
ENV=/etc/membrana/cabinet.env
MEDIA_ENV=/etc/membrana/media.env
MEDIA_TOKEN=$(grep '^API_INTERNAL_TOKEN=' "$MEDIA_ENV" | cut -d= -f2-)
DEV='${USER_DEVICE}'

cd /root/membrana
git fetch origin ${BRANCH}
git reset --hard FETCH_HEAD
echo "=== HEAD ==="
git log -1 --oneline

chmod +x deploy/media-stack.sh deploy/cabinet-stack.sh
./deploy/media-stack.sh build
./deploy/media-stack.sh up
sleep 15
ln -sf /etc/membrana/cabinet.env packages/background-cabinet/.env.docker
./deploy/cabinet-stack.sh build
./deploy/cabinet-stack.sh up
sleep 25

echo "=== health ==="
curl -fsS http://127.0.0.1:3010/health; echo
curl -fsS http://127.0.0.1:3020/health; echo
curl -fsS https://cabinet.membrana.space/health; echo

echo "=== pagination smoke ==="
python3 -c "
import json, subprocess
tok = '''$MEDIA_TOKEN'''
dev = '$DEV'
page1 = json.loads(subprocess.check_output([
  'curl', '-fsS',
  f'http://127.0.0.1:3010/v1/devices/{dev}/collections/__tariff_dataset__/samples?page=1&limit=40',
  '-H', f'X-Membrana-Token: {tok}',
]))
assert page1['total'] == 120, page1['total']
assert page1['totalPages'] == 3, page1['totalPages']
assert len(page1['items']) == 40, len(page1['items'])
page2 = json.loads(subprocess.check_output([
  'curl', '-fsS',
  f'http://127.0.0.1:3010/v1/devices/{dev}/collections/__tariff_dataset__/samples?page=2&limit=40',
  '-H', f'X-Membrana-Token: {tok}',
]))
assert len(page2['items']) == 40
print('pagination OK', page1['total'], 'total', page1['totalPages'], 'pages')
"

echo "=== collection sampleCount smoke ==="
python3 -c "
import json, subprocess
tok = '''$MEDIA_TOKEN'''
dev = '$DEV'
cols = json.loads(subprocess.check_output([
  'curl', '-fsS', f'http://127.0.0.1:3010/v1/devices/{dev}/collections',
  '-H', f'X-Membrana-Token: {tok}',
]))
tariff = next(c for c in cols if c.get('systemKey') == 'tariff-dataset')
assert tariff['sampleCount'] == 120, tariff
print('sampleCount OK:', tariff['id'], tariff['sampleCount'])
"

echo "=== cabinet catalog pagination smoke ==="
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' "$ENV" | cut -d= -f2-)
TOK=$(curl -fsS -X POST https://cabinet.membrana.space/v1/auth/login -H "Content-Type: application/json" -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
MID=$(curl -fsS https://cabinet.membrana.space/v1/membranes/me -H "Authorization: Bearer $TOK" | python3 -c "import sys,json; print(json.load(sys.stdin)['membrane']['id'])")
python3 <<PY
import json, subprocess
tok = """$TOK"""
mid = """$MID"""
page1 = json.loads(subprocess.check_output([
  'curl', '-fsS',
  f'https://cabinet.membrana.space/v1/membranes/{mid}/catalog?page=1&limit=40',
  '-H', f'Authorization: Bearer {tok}',
]))
assert page1['sampleCount'] == 120, page1['sampleCount']
assert page1['totalPages'] == 3, page1['totalPages']
assert len(page1['samples']) == 40, len(page1['samples'])
page2 = json.loads(subprocess.check_output([
  'curl', '-fsS',
  f'https://cabinet.membrana.space/v1/membranes/{mid}/catalog?page=2&limit=40',
  '-H', f'Authorization: Bearer {tok}',
]))
assert len(page2['samples']) == 40
print('cabinet catalog pagination OK', page1['sampleCount'], 'total')
PY
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
