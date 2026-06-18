#!/usr/bin/env node
/**
 * Deploy cabinet stack on VPS (MP1): pull branch, build, up, Caddy, smoke.
 * Reads BACKGROUND_MEDIA_IPV4 + BACKGROUND_MEDIA_PASSWORD from .env (same VPS as media).
 * Optional override: CABINET_GIT_BRANCH=vesnin (default: main)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';
import { deployPreflight } from './_deploy-preflight.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
if (!existsSync(envPath)) {
  console.error('Missing .env with BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD');
  process.exit(1);
}

const envText = readFileSync(envPath, 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
const branch =
  process.env.CABINET_GIT_BRANCH ||
  get('CABINET_GIT_BRANCH') ||
  get('GIT_BRANCH') ||
  'main';

// DR0 gate: локальное состояние должно совпадать с origin/<branch> (прод собирается из origin).
deployPreflight({ branch, cwd: root });

const remoteScript = `#!/bin/bash
set -euo pipefail
cd /root/membrana

echo "=== git pull (${branch}) ==="
git fetch origin "${branch}"
git reset --hard FETCH_HEAD
git log -1 --oneline

if [ ! -f /etc/membrana/cabinet.env ]; then
  echo "=== generate cabinet.env ==="
  chmod +x deploy/generate-cabinet-env.sh
  ./deploy/generate-cabinet-env.sh /etc/membrana/cabinet.env | tee /root/cabinet-bootstrap-once.txt
fi

ln -sf /etc/membrana/cabinet.env packages/background-cabinet/.env.docker
chmod +x deploy/cabinet-stack.sh

echo "=== sync Caddy cabinet.caddy ==="
cp deploy/Caddyfile.cabinet.example /etc/caddy/Caddyfile.d/cabinet.caddy
caddy validate --config /etc/caddy/Caddyfile 2>/dev/null || true
systemctl reload caddy || true

if grep -q 'cabinet-api.membrana.space' /etc/membrana/cabinet.env 2>/dev/null; then
  sed -i 's|VITE_CABINET_API_URL=https://cabinet-api.membrana.space|VITE_CABINET_API_URL=https://cabinet.membrana.space|' /etc/membrana/cabinet.env
fi

echo "=== docker build ==="
./deploy/cabinet-stack.sh build

echo "=== docker up ==="
./deploy/cabinet-stack.sh down || true
sleep 2
./deploy/cabinet-stack.sh up
sleep 25

echo "=== local smoke ==="
./deploy/cabinet-stack.sh smoke

echo "=== https smoke ==="
curl -fsS https://cabinet.membrana.space/health; echo
curl -sk -o /dev/null -w "cabinet SPA: %{http_code}\\n" https://cabinet.membrana.space/ || true

./deploy/cabinet-stack.sh ps
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
