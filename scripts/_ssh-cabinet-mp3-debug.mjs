#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const remoteScript = `#!/bin/bash
set -euo pipefail
cd /root/membrana
echo "=== cabinet-api logs (pair) ==="
docker compose -f packages/background-cabinet/docker-compose.yml -f deploy/background-cabinet.prod.compose.yml --env-file /etc/membrana/cabinet.env logs --tail=40 cabinet-api 2>&1 | tail -40

echo "=== migrate status ==="
docker compose -f packages/background-cabinet/docker-compose.yml -f deploy/background-cabinet.prod.compose.yml --env-file /etc/membrana/cabinet.env exec -T cabinet-api sh -c 'cd /app/packages/background-cabinet && npx prisma migrate status' 2>&1 | tail -20

echo "=== media from host ==="
curl -fsS http://127.0.0.1:3010/health; echo || echo "media host fail"

echo "=== media stack ps ==="
docker compose -f packages/background-media/docker-compose.yml -f deploy/background-media.prod.compose.yml --env-file /etc/membrana/media.env ps 2>&1 || true

echo "=== pair error body (local) ==="
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' /etc/membrana/cabinet.env | cut -d= -f2-)
TOKEN=$(curl -fsS -X POST http://127.0.0.1:3020/v1/auth/login -H 'Content-Type: application/json' -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
KEY_RESP=$(curl -fsS -X POST http://127.0.0.1:3020/v1/nodes/f18b490d-44b1-47ae-848e-83bb6c14e75a/access-keys -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"duration":"hours_4"}' 2>/dev/null || true)
PLAIN=$(echo "$KEY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('key',''))" 2>/dev/null || true)
if [ -n "$PLAIN" ]; then
  curl -sS -X POST http://127.0.0.1:3020/v1/pair -H 'Content-Type: application/json' -d "{\\"accessKey\\":\\"$PLAIN\\"}"; echo
fi

echo "=== media from cabinet container ==="
docker compose -f packages/background-cabinet/docker-compose.yml -f deploy/background-cabinet.prod.compose.yml --env-file /etc/membrana/cabinet.env exec -T cabinet-api sh -c 'wget -qO- http://host.docker.internal:3010/health || echo container media fail'; echo
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
