#!/usr/bin/env node
/**
 * Prod smoke MP1: cabinet API + SPA.
 * Reads BACKGROUND_MEDIA_IPV4 + PASSWORD from .env.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const remoteScript = `#!/bin/bash
set -euo pipefail
echo "=== local health ==="
curl -fsS http://127.0.0.1:3020/health; echo
curl -fsS -o /dev/null -w "web: %{http_code}\\n" http://127.0.0.1:8080/

echo "=== bootstrap login ==="
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' /etc/membrana/cabinet.env | cut -d= -f2-)
curl -fsS -X POST http://127.0.0.1:3020/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | head -c 200; echo

echo "=== caddy ==="
cat /etc/caddy/Caddyfile.d/cabinet.caddy 2>/dev/null || echo "missing cabinet.caddy"
systemctl is-active caddy

echo "=== https health ==="
curl -fsS https://cabinet.membrana.space/health; echo

echo "=== https login ==="
curl -fsS -X POST https://cabinet.membrana.space/v1/auth/login \\
  -H 'Content-Type: application/json' \\
  -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | head -c 200; echo

echo "=== https me ==="
TOKEN=$(curl -fsS -X POST https://cabinet.membrana.space/v1/auth/login \\
  -H 'Content-Type: application/json' \\
  -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | sed -n 's/.*"token":"\\([^"]*\\)".*/\\1/p')
curl -fsS https://cabinet.membrana.space/v1/auth/me \\
  -H "Authorization: Bearer $TOKEN" | head -c 120; echo

echo "=== https spa ==="
curl -sk -o /dev/null -w "cabinet SPA: %{http_code}\\n" https://cabinet.membrana.space/ || true
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
