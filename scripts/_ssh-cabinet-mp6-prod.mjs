#!/usr/bin/env node
/**
 * MP6: full platform regression smoke (MP1–MP5) in one session. No rebuild by default.
 * Set MEMBRANA_DEPLOY_REBUILD=1 to pull branch and rebuild cabinet first.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const BRANCH = process.env.MEMBRANA_DEPLOY_BRANCH ?? 'feat/membrane-platform-mp4';
const REBUILD = process.env.MEMBRANA_DEPLOY_REBUILD === '1';

const rebuildBlock = REBUILD
  ? `
cd /root/membrana
git fetch origin ${BRANCH}
git reset --hard FETCH_HEAD
git log -1 --oneline
chmod +x deploy/cabinet-stack.sh
ln -sf /etc/membrana/cabinet.env packages/background-cabinet/.env.docker
./deploy/cabinet-stack.sh build
./deploy/cabinet-stack.sh up
sleep 30
`
  : '';

const remoteScript = `#!/bin/bash
set -euo pipefail
ENV=/etc/membrana/cabinet.env
MEDIA_ENV=/etc/membrana/media.env
MEDIA_TOKEN=$(grep '^API_INTERNAL_TOKEN=' "$MEDIA_ENV" | cut -d= -f2-)
API=https://cabinet.membrana.space
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' "$ENV" | cut -d= -f2-)

${rebuildBlock}

echo "=== MP1: health + login + SPA ==="
curl -fsS "$API/health" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('status')=='ok', d; print('health OK')"
TOKEN=$(curl -fsS -X POST "$API/v1/auth/login" -H 'Content-Type: application/json' -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -fsS "$API/v1/auth/me" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('auth/me OK', d['user']['login'])"
curl -fsS -o /dev/null -w "SPA: %{http_code}\\n" "$API/"

echo "=== MP2: membrane + tariff ==="
ME=$(curl -fsS "$API/v1/membranes/me" -H "Authorization: Bearer $TOKEN")
echo "$ME" | python3 -c "
import sys,json
d=json.load(sys.stdin)
t=d['membrane']['tariff']
assert t['id']=='free-v1', t
assert int(t['userStorageQuotaBytes'])>0
assert int(t['bufferQuotaBytes'])>0
assert t['datasetCatalogId']
print('membrane/tariff OK', t['id'])
"
NODE_ID=$(echo "$ME" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('node') or {}).get('id') or '')")
[ -n "$NODE_ID" ] || { echo "node missing"; exit 1; }

echo "=== MP3: pair ==="
echo "$ME" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for k in (d.get('node') or {}).get('accessKeys') or []:
  if k.get('active'): print(k['id'])
" | while read -r KID; do
  [ -z "$KID" ] && continue
  curl -fsS -X POST "$API/v1/access-keys/$KID/revoke" -H "Authorization: Bearer $TOKEN" >/dev/null
done
KEY_RESP=$(curl -fsS -X POST "$API/v1/nodes/$NODE_ID/access-keys" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"duration":"hours_4"}')
PLAIN=$(echo "$KEY_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['key'])")
PAIR=$(curl -fsS -X POST "$API/v1/pair" -H 'Content-Type: application/json' -d "{\\"accessKey\\":\\"$PLAIN\\",\\"clientLabel\\":\\"mp6-regression\\"}")
PAIR_TOKEN=$(echo "$PAIR" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
DEVICE_ID=$(echo "$PAIR" | python3 -c "import sys,json; print(json.load(sys.stdin)['deviceId'])")
curl -fsS "$API/v1/pair/status" -H "Authorization: Bearer $PAIR_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['linked'] and d['keyActive']; print('pair OK', d['deviceId'][:8])"

echo "=== MP4: quota ==="
export DEVICE_ID MEDIA_TOKEN
python3 -c "
import json, subprocess, os
dev=os.environ['DEVICE_ID']; tok=os.environ['MEDIA_TOKEN']
out=subprocess.check_output(['curl','-fsS',f'http://127.0.0.1:3010/v1/devices/{dev}/quota','-H',f'X-Membrana-Token: {tok}','-H',f'X-Membrana-Device-Id: {dev}'])
d=json.loads(out)
assert 'userStorage' in d and 'buffer' in d
print('quota OK', d['dataset']['catalogId'])
"

echo "=== MP5: journal ==="
SMOKE_ID="mp6-regression-$(date +%s)"
curl -fsS -X POST "$API/v1/telemetry/reports" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\\"reportKind\\":\\"fft-threshold-test/v0.2\\",\\"clientEntryId\\":\\"$SMOKE_ID\\",\\"finishedAt\\":\\"2026-06-14T12:00:00.000Z\\",\\"payload\\":{\\"schema\\":\\"fft-threshold-test/v0.2\\",\\"isDetected\\":false,\\"passRate\\":0.5,\\"passedCount\\":5,\\"frameCount\\":10}}" >/dev/null
curl -fsS "$API/v1/telemetry/reports?limit=5" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d['reports'])>=1; print('journal OK', len(d['reports']))"

echo "=== MP6: infra health ==="
curl -fsS http://127.0.0.1:3020/health >/dev/null
curl -fsS http://127.0.0.1:3010/health >/dev/null
docker ps --format '{{.Names}} {{.Status}}' | grep -E 'cabinet-api|cabinet-web|media-api' | head -5
echo "MP6 REGRESSION OK"
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
  readyTimeout: 60000,
});
