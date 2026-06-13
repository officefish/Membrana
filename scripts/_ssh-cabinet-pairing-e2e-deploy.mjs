#!/usr/bin/env node
/**
 * MP3 E2E hotfix: public media URL in pair response + media CORS for client.
 * Pull branch, patch prod env, rebuild cabinet + media, smoke.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
if (!existsSync(envPath)) {
  console.error('Missing .env with BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD');
  process.exit(1);
}

const envText = readFileSync(envPath, 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
const branch = get('CABINET_GIT_BRANCH') || get('GIT_BRANCH') || 'feat/background-media-swagger';

const remoteScript = `#!/bin/bash
set -euo pipefail

upsert() {
  local file="$1" key="$2" val="$3"
  if grep -q "^\${key}=" "$file"; then
    sed -i "s|^\${key}=.*|\${key}=\${val}|" "$file"
  else
    echo "\${key}=\${val}" >> "$file"
  fi
}

CABINET_ENV=/etc/membrana/cabinet.env
MEDIA_ENV=/etc/membrana/media.env

echo "=== patch prod env ==="
upsert "$CABINET_ENV" MEDIA_PUBLIC_API_URL "https://media.membrana.space"
upsert "$MEDIA_ENV" CLIENT_CORS_ORIGINS "http://localhost:5173,http://localhost:4173"
grep -E '^(MEDIA_PUBLIC_API_URL|MEDIA_API_URL)=' "$CABINET_ENV"
grep -E '^CLIENT_CORS_ORIGINS=' "$MEDIA_ENV"

cd /root/membrana
echo "=== git pull (${branch}) ==="
git fetch origin "${branch}"
git reset --hard FETCH_HEAD
git log -1 --oneline

ln -sf "$CABINET_ENV" packages/background-cabinet/.env.docker
ln -sf "$MEDIA_ENV" packages/background-media/.env.docker
chmod +x deploy/cabinet-stack.sh deploy/media-stack.sh

echo "=== docker build media ==="
./deploy/media-stack.sh build

echo "=== docker build cabinet ==="
./deploy/cabinet-stack.sh build

echo "=== docker up ==="
./deploy/media-stack.sh up
sleep 8
./deploy/cabinet-stack.sh down || true
sleep 2
./deploy/cabinet-stack.sh up
sleep 25

echo "=== pairing smoke ==="
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' "$CABINET_ENV" | cut -d= -f2-)
API=https://cabinet.membrana.space
TOKEN=$(curl -fsS -X POST "$API/v1/auth/login" -H 'Content-Type: application/json' -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
ME=$(curl -fsS "$API/v1/membranes/me" -H "Authorization: Bearer $TOKEN")
NODE_ID=$(echo "$ME" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('node') or {}).get('id') or '')")
if [ -z "$NODE_ID" ]; then
  NODE_ID=$(curl -fsS -X POST "$API/v1/membranes/me/nodes" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}' | python3 -c "import sys,json; print(json.load(sys.stdin)['node']['id'])")
fi
ACTIVE_KEY=$(echo "$ME" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for k in (d.get('node') or {}).get('accessKeys') or []:
  if k.get('active'): print(k['id']); break
")
if [ -n "$ACTIVE_KEY" ]; then
  curl -fsS -X POST "$API/v1/access-keys/$ACTIVE_KEY/revoke" -H "Authorization: Bearer $TOKEN" >/dev/null
fi
PLAIN_KEY=$(curl -fsS -X POST "$API/v1/nodes/$NODE_ID/access-keys" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"duration":"hours_4"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['key'])")
PAIR_JSON=$(curl -fsS -X POST "$API/v1/pair" -H 'Content-Type: application/json' -d "{\\"accessKey\\":\\"$PLAIN_KEY\\"}")
echo "$PAIR_JSON" | python3 -c "
import sys,json
d=json.load(sys.stdin)
url=d.get('mediaApiUrl','')
assert url.startswith('https://media.membrana.space'), f'bad mediaApiUrl: {url}'
print('pair mediaApiUrl ok:', url)
"
DEVICE_ID=$(echo "$PAIR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['deviceId'])")
MEDIA_TOKEN=$(grep '^API_INTERNAL_TOKEN=' "$MEDIA_ENV" | cut -d= -f2-)
curl -fsS "https://media.membrana.space/v1/devices/$DEVICE_ID" -H "X-Membrana-Token: $MEDIA_TOKEN" | head -c 120; echo

echo "=== ALL PAIRING E2E DEPLOY OK ==="
`;

const host = get('BACKGROUND_MEDIA_IPV4');
const password = get('BACKGROUND_MEDIA_PASSWORD');
if (!host || !password) {
  console.error('Set BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD in .env');
  process.exit(1);
}

const conn = new Client();
conn
  .on('ready', () => {
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
  })
  .connect({
    host,
    port: 22,
    username: 'root',
    password,
    readyTimeout: 30000,
  });
