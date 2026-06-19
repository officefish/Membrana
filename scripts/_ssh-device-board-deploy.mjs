#!/usr/bin/env node
/**
 * Device-board hackathon deploy: pull branch, rebuild media + cabinet, migrate, smoke.
 * Env: BACKGROUND_MEDIA_IPV4, BACKGROUND_MEDIA_PASSWORD in .env
 * Branch: MEMBRANA_DEPLOY_BRANCH || GIT_BRANCH || CABINET_GIT_BRANCH || main
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';
import { deployPreflight } from './_deploy-preflight.mjs';
import { assertCiGreen } from './_deploy-ci-gate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
if (!existsSync(envPath)) {
  console.error('Missing .env with BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD');
  process.exit(1);
}

const envText = readFileSync(envPath, 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
const branch =
  process.env.MEMBRANA_DEPLOY_BRANCH ||
  get('MEMBRANA_DEPLOY_BRANCH') ||
  get('GIT_BRANCH') ||
  get('CABINET_GIT_BRANCH') ||
  'main';

// DR0 gate: локальное состояние должно совпадать с origin/<branch> (прод собирается из origin).
const preflight = deployPreflight({ branch, cwd: root });
// DR1 gate: на прод едет только зелёный в CI коммит.
assertCiGreen({ branch, sha: preflight.originHead });

const remoteScript = `#!/bin/bash
set -euo pipefail

CABINET_ENV=/etc/membrana/cabinet.env
MEDIA_ENV=/etc/membrana/media.env

cd /root/membrana
echo "=== git pull (${branch}) ==="
git fetch origin "${branch}"
git reset --hard FETCH_HEAD
git log -1 --oneline

ln -sf "$CABINET_ENV" packages/background-cabinet/.env.docker
ln -sf "$MEDIA_ENV" packages/background-media/.env.docker
chmod +x deploy/cabinet-stack.sh deploy/media-stack.sh

echo "=== docker build media (prisma migrate on up) ==="
./deploy/media-stack.sh build

echo "=== docker build cabinet (no stale SPA/API cache) ==="
./deploy/cabinet-stack.sh build --no-cache cabinet-web
./deploy/cabinet-stack.sh build --no-cache cabinet-api

echo "=== docker up media ==="
./deploy/media-stack.sh up
sleep 12

echo "=== prisma migrate status ==="
docker compose -f packages/background-media/docker-compose.yml -f deploy/background-media.prod.compose.yml --env-file "$MEDIA_ENV" exec -T media-api sh -c 'cd /app/packages/background-media && npx prisma migrate status' 2>&1 | tail -20

echo "=== docker up cabinet ==="
./deploy/cabinet-stack.sh down || true
sleep 2
./deploy/cabinet-stack.sh up --force-recreate
sleep 28

echo "=== cabinet SPA bundle check ==="
CABINET_JS=$(curl -fsS http://127.0.0.1:8080/ | grep -oE 'assets/index-[^"]+\\.js' | head -1)
curl -fsS "http://127.0.0.1:8080/\${CABINET_JS}" -o /tmp/cabinet-spa-check.js
BYTES=$(wc -c < /tmp/cabinet-spa-check.js | tr -d ' ')
test "\${BYTES}" -gt 100000 && echo "cabinet-web bundle OK (\${CABINET_JS}, \${BYTES} bytes)" || { echo "FATAL: cabinet-web bundle too small (\${CABINET_JS}, \${BYTES} bytes)"; exit 1; }
grep -q 'purge-inactive' /tmp/cabinet-spa-check.js && echo "cabinet-web hotfix markers OK" || { echo "FATAL: SPA bundle missing hotfix markers (stale cabinet-web? run cabinet-stack up --force-recreate)"; exit 1; }

echo "=== health ==="
curl -fsS http://127.0.0.1:3010/health; echo
curl -fsS http://127.0.0.1:3020/health; echo
curl -fsS -o /dev/null -w "cabinet SPA local: %{http_code}\\n" http://127.0.0.1:8080/

echo "=== device-scenario API smoke ==="
MEDIA_TOKEN=$(grep '^API_INTERNAL_TOKEN=' "$MEDIA_ENV" | cut -d= -f2-)
DEVICE_ID=$(docker compose -f packages/background-cabinet/docker-compose.yml -f deploy/background-cabinet.prod.compose.yml --env-file "$CABINET_ENV" exec -T postgres psql -U membrana -d membrana_cabinet -tAc 'SELECT "mediaDeviceId" FROM "Device" LIMIT 1' 2>/dev/null | tr -d '[:space:]')
if [ -z "$DEVICE_ID" ]; then
  echo "No paired device in cabinet DB — skip device-scenario PUT smoke"
else
  echo "deviceId=$DEVICE_ID"
  HTTP_GET=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3010/v1/devices/$DEVICE_ID/device-scenario" -H "X-Membrana-Token: $MEDIA_TOKEN" -H "X-Membrana-Device-Id: $DEVICE_ID")
  echo "GET device-scenario (expect 404 if empty): $HTTP_GET"
  SAMPLE='{"version":1,"kind":"device-scenario","deviceKind":"microphone","signalGraph":{"nodes":[],"edges":[]},"scenario":{"initial":{"entry":"n1","nodes":[],"edges":[]},"loops":{"main":{"entry":"n1","nodes":[],"edges":[]},"alarm":{"entry":"n1","nodes":[],"edges":[]}},"triggers":{"onStop":{"entry":"n1","nodes":[],"edges":[]},"onDisconnect":{"entry":"n1","nodes":[],"edges":[]},"custom":[]},"functions":[]}}'
  curl -fsS -X PUT "http://127.0.0.1:3010/v1/devices/$DEVICE_ID/device-scenario" \\
    -H "Content-Type: application/json" \\
    -H "X-Membrana-Token: $MEDIA_TOKEN" \\
    -H "X-Membrana-Device-Id: $DEVICE_ID" \\
    -d "$SAMPLE" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'updatedAt' in d; print('PUT device-scenario OK', d['updatedAt'][:19])"
  curl -fsS "http://127.0.0.1:3010/v1/devices/$DEVICE_ID/device-scenario" \\
    -H "X-Membrana-Token: $MEDIA_TOKEN" \\
    -H "X-Membrana-Device-Id: $DEVICE_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['document']['kind']=='device-scenario'; print('GET round-trip OK')"
fi

echo "=== https smoke ==="
curl -fsS https://media.membrana.space/health; echo
curl -fsS https://cabinet.membrana.space/health; echo
curl -sk -o /dev/null -w "cabinet SPA: %{http_code}\\n" https://cabinet.membrana.space/ || true

./deploy/media-stack.sh ps
./deploy/cabinet-stack.sh ps
echo "DEVICE-BOARD DEPLOY OK"
`;

const host = get('BACKGROUND_MEDIA_IPV4');
const password = get('BACKGROUND_MEDIA_PASSWORD');
if (!host || !password) {
  console.error('Set BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD in .env');
  process.exit(1);
}

console.log(`Deploy branch: ${branch} → ${host}`);

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
    readyTimeout: 120000,
  });
