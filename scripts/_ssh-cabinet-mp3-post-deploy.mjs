#!/usr/bin/env node
/**
 * After MP3 deploy: ensure cabinet.env has pairing env (CLIENT_CORS, MEDIA_API_*).
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
ENV=/etc/membrana/cabinet.env
MEDIA_ENV=/etc/membrana/media.env

if [ ! -f "$ENV" ]; then echo "missing $ENV"; exit 1; fi
if [ ! -f "$MEDIA_ENV" ]; then echo "missing $MEDIA_ENV"; exit 1; fi

MEDIA_TOKEN=$(grep '^API_INTERNAL_TOKEN=' "$MEDIA_ENV" | cut -d= -f2-)

upsert() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV"
  else
    echo "${key}=${val}" >> "$ENV"
  fi
}

upsert CLIENT_CORS_ORIGINS "http://localhost:5173,http://localhost:4173"
upsert MEDIA_API_URL "http://127.0.0.1:3010"
upsert MEDIA_API_TOKEN "$MEDIA_TOKEN"

echo "=== cabinet.env MP3 keys ==="
grep -E '^(CLIENT_CORS_ORIGINS|MEDIA_API_URL|MEDIA_API_TOKEN)=' "$ENV"

cd /root/membrana
ln -sf /etc/membrana/cabinet.env packages/background-cabinet/.env.docker
chmod +x deploy/cabinet-stack.sh
./deploy/cabinet-stack.sh build
./deploy/cabinet-stack.sh up
sleep 20
curl -fsS http://127.0.0.1:3020/health; echo
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
