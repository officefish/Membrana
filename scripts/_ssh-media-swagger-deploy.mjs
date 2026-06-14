#!/usr/bin/env node
/**
 * Pull techies68 (swagger), enable SWAGGER_ENABLED, rebuild media stack on VPS.
 * Reads BACKGROUND_MEDIA_* from .env.
 */
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
echo "=== git pull ==="
git fetch origin techies68
git checkout techies68
git reset --hard origin/techies68
git log -1 --oneline

echo "=== enable SWAGGER ==="
if grep -q '^SWAGGER_ENABLED=' /etc/membrana/media.env; then
  sed -i 's/^SWAGGER_ENABLED=.*/SWAGGER_ENABLED=true/' /etc/membrana/media.env
else
  echo 'SWAGGER_ENABLED=true' >> /etc/membrana/media.env
fi
grep SWAGGER /etc/membrana/media.env

ln -sf /etc/membrana/media.env packages/background-media/.env.docker
chmod +x deploy/media-stack.sh
pkill -9 -f 'node dist/main.js' || true

echo "=== docker build ==="
./deploy/media-stack.sh build

echo "=== docker down (free port) ==="
./deploy/media-stack.sh down || true
sleep 3
ss -tlnp | grep ':3010' || echo "port 3010 free"

echo "=== docker up ==="
./deploy/media-stack.sh up
sleep 20

echo "=== smoke ==="
curl -fsS http://127.0.0.1:3010/health; echo
curl -s -o /dev/null -w "local /docs/: %{http_code}\\n" http://127.0.0.1:3010/docs/
curl -s -o /dev/null -w "local /docs-json: %{http_code}\\n" http://127.0.0.1:3010/docs-json
curl -sk -o /dev/null -w "https media.membrana.space/docs/: %{http_code}\\n" https://media.membrana.space/docs/ || true
docker compose -f packages/background-media/docker-compose.yml -f deploy/background-media.prod.compose.yml --env-file /etc/membrana/media.env ps
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
