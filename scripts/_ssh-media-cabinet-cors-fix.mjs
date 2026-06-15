#!/usr/bin/env node
/**
 * Prod: allow apps/cabinet browser → media.membrana.space (CSL2 ServerStorageBackend).
 * Patches CLIENT_CORS_ORIGINS in /etc/membrana/media.env and restarts media stack.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const CABINET_ORIGIN = 'https://cabinet.membrana.space';

const remoteScript = `#!/bin/bash
set -euo pipefail
ENV=/etc/membrana/media.env
if [ ! -f "$ENV" ]; then echo "missing $ENV"; exit 1; fi

CURRENT=$(grep '^CLIENT_CORS_ORIGINS=' "$ENV" | cut -d= -f2- || true)
if echo "$CURRENT" | grep -q '${CABINET_ORIGIN}'; then
  echo "CLIENT_CORS_ORIGINS already includes cabinet"
else
  if [ -z "$CURRENT" ]; then
    NEW="${CABINET_ORIGIN}"
  else
    NEW="$CURRENT,${CABINET_ORIGIN}"
  fi
  if grep -q '^CLIENT_CORS_ORIGINS=' "$ENV"; then
    sed -i "s|^CLIENT_CORS_ORIGINS=.*|CLIENT_CORS_ORIGINS=$NEW|" "$ENV"
  else
    echo "CLIENT_CORS_ORIGINS=$NEW" >> "$ENV"
  fi
  echo "Updated CLIENT_CORS_ORIGINS=$NEW"
fi

cd /root/membrana
chmod +x deploy/media-stack.sh
ln -sf /etc/membrana/media.env packages/background-media/.env.docker
./deploy/media-stack.sh up
sleep 15

echo "=== CORS preflight smoke (OPTIONS) ==="
curl -sS -o /dev/null -w "OPTIONS status: %{http_code}\\n" \\
  -X OPTIONS "https://media.membrana.space/v1/devices/smoke/collections/ensure-reserved" \\
  -H "Origin: ${CABINET_ORIGIN}" \\
  -H "Access-Control-Request-Method: POST" \\
  -H "Access-Control-Request-Headers: authorization,x-membrana-token,x-membrana-device-id,content-type"

curl -sS -D - -o /dev/null -X OPTIONS \\
  "https://media.membrana.space/v1/devices/smoke/collections/ensure-reserved" \\
  -H "Origin: ${CABINET_ORIGIN}" \\
  -H "Access-Control-Request-Method: POST" \\
  -H "Access-Control-Request-Headers: authorization,x-membrana-token,x-membrana-device-id,content-type" \\
  2>&1 | grep -i access-control || true

curl -fsS https://media.membrana.space/health; echo
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
