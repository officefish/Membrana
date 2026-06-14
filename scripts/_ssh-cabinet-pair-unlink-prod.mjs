#!/usr/bin/env node
/**
 * Prod deploy: pairing unlink (GET /v1/pair/status) + MP4 regression smoke.
 * Pulls MEMBRANA_DEPLOY_BRANCH (default feat/membrane-platform-mp4), rebuilds cabinet.
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
API=https://cabinet.membrana.space

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
git log -1 --oneline
chmod +x deploy/cabinet-stack.sh deploy/media-stack.sh
ln -sf /etc/membrana/cabinet.env packages/background-cabinet/.env.docker

echo "=== cabinet build + up (prisma migrate in entrypoint) ==="
./deploy/cabinet-stack.sh build
./deploy/cabinet-stack.sh up
sleep 30
curl -fsS http://127.0.0.1:3020/health; echo

echo "=== pair + pair/status smoke ==="
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' "$ENV" | cut -d= -f2-)
TOKEN=$(curl -fsS -X POST "$API/v1/auth/login" -H 'Content-Type: application/json' -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
ME=$(curl -fsS "$API/v1/membranes/me" -H "Authorization: Bearer $TOKEN")
NODE_ID=$(echo "$ME" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('node') or {}).get('id') or '')")
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
PAIR=$(curl -fsS -X POST "$API/v1/pair" -H 'Content-Type: application/json' -d "{\\"accessKey\\":\\"$PLAIN\\",\\"clientLabel\\":\\"unlink-smoke\\"}")
PAIR_TOKEN=$(echo "$PAIR" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
DEVICE_ID=$(echo "$PAIR" | python3 -c "import sys,json; print(json.load(sys.stdin)['deviceId'])")
STATUS=$(curl -fsS "$API/v1/pair/status" -H "Authorization: Bearer $PAIR_TOKEN")
echo "$STATUS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
assert d.get('linked') is True, d
assert d.get('keyActive') is True, d
print('pair/status OK', d['deviceId'][:8])
"

echo "=== revoke key → pair/status inactive ==="
KEY_ID=$(echo "$KEY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('accessKey',{}).get('id') or d.get('id',''))")
curl -fsS -X POST "$API/v1/access-keys/$KEY_ID/revoke" -H "Authorization: Bearer $TOKEN" >/dev/null
REVOKED=$(curl -fsS "$API/v1/pair/status" -H "Authorization: Bearer $PAIR_TOKEN")
echo "$REVOKED" | python3 -c "
import sys,json
d=json.load(sys.stdin)
assert d.get('linked') is True, d
assert d.get('keyActive') is False, d
assert d.get('inactiveReason') == 'revoked', d
print('revoke/status OK')
"

echo "=== MP4 quota regression ==="
export DEVICE_ID MEDIA_TOKEN
python3 -c "
import json, subprocess, os
dev = os.environ['DEVICE_ID']
tok = os.environ['MEDIA_TOKEN']
out = subprocess.check_output([
  'curl', '-fsS', f'http://127.0.0.1:3010/v1/devices/{dev}/quota',
  '-H', f'X-Membrana-Token: {tok}',
  '-H', f'X-Membrana-Device-Id: {dev}',
])
d = json.loads(out)
assert 'userStorage' in d and 'buffer' in d and 'dataset' in d, d
print('mp4 quota ok:', d['userStorage']['limitBytes'], d['buffer']['limitBytes'], d['dataset']['catalogId'])
"

echo "=== ALL SMOKE OK ==="
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
