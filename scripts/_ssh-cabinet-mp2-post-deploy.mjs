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

echo "=== seed tariff (idempotent) ==="
docker compose -f packages/background-cabinet/docker-compose.yml -f deploy/background-cabinet.prod.compose.yml --env-file /etc/membrana/cabinet.env exec -T cabinet-api sh -c 'cd /app/packages/background-cabinet && npx prisma db seed'

echo "=== MP2 API smoke ==="
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' /etc/membrana/cabinet.env | cut -d= -f2-)
LOGIN_JSON="{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}"
TOKEN=$(curl -fsS -X POST http://127.0.0.1:3020/v1/auth/login -H 'Content-Type: application/json' -d "$LOGIN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "local membranes/me:"
curl -fsS http://127.0.0.1:3020/v1/membranes/me -H "Authorization: Bearer $TOKEN"; echo
echo "https membranes/me:"
curl -fsS https://cabinet.membrana.space/v1/membranes/me -H "Authorization: Bearer $TOKEN"; echo
`;

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
    host: get('BACKGROUND_MEDIA_IPV4'),
    port: 22,
    username: 'root',
    password: get('BACKGROUND_MEDIA_PASSWORD'),
    readyTimeout: 30000,
  });
