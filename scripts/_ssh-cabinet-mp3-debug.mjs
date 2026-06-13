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
curl -fsS http://127.0.0.1:3010/health; echo || echo media host fail

echo "=== media from cabinet container ==="
docker compose -f packages/background-cabinet/docker-compose.yml -f deploy/background-cabinet.prod.compose.yml --env-file /etc/membrana/cabinet.env exec -T cabinet-api sh -c 'wget -qO- http://127.0.0.1:3010/health || wget -qO- http://host.docker.internal:3010/health || echo container media fail'; echo
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
