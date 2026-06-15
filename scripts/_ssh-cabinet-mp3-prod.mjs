#!/usr/bin/env node
/**
 * MP3 prod: pull, recreate membrana-platform network, restart media+cabinet, smoke.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const remoteScript = readFileSync(resolve(root, 'scripts/_ssh-cabinet-mp3-post-deploy.mjs'), 'utf8');
// post-deploy body is embedded - run post-deploy then smoke inline
const postDeploy = `#!/bin/bash
set -euo pipefail
ENV=/etc/membrana/cabinet.env
MEDIA_ENV=/etc/membrana/media.env
MEDIA_TOKEN=$(grep '^API_INTERNAL_TOKEN=' "$MEDIA_ENV" | cut -d= -f2-)

upsert() {
  local key="$1" val="$2"
  if grep -q "^\${key}=" "$ENV"; then
    sed -i "s|^\${key}=.*|\${key}=\${val}|" "$ENV"
  else
    echo "\${key}=\${val}" >> "$ENV"
  fi
}

upsert CLIENT_CORS_ORIGINS "http://localhost:5173,http://localhost:4173"
upsert MEDIA_API_URL "http://media-api:3010"
upsert MEDIA_API_TOKEN "$MEDIA_TOKEN"

cd /root/membrana
git fetch origin feat/background-media-swagger
git reset --hard FETCH_HEAD
chmod +x deploy/media-stack.sh deploy/cabinet-stack.sh
./deploy/media-stack.sh up
sleep 10
ln -sf /etc/membrana/cabinet.env packages/background-cabinet/.env.docker
./deploy/cabinet-stack.sh build
./deploy/cabinet-stack.sh up
sleep 25
curl -fsS http://127.0.0.1:3020/health; echo

docker compose -f packages/background-cabinet/docker-compose.yml -f deploy/background-cabinet.prod.compose.yml --env-file /etc/membrana/cabinet.env exec -T cabinet-api node -e "fetch('http://media-api:3010/health').then(r=>r.text()).then(t=>console.log('media via docker net:',t)).catch(e=>console.error(e))"
`;

const smoke = readFileSync(resolve(root, 'scripts/_ssh-cabinet-mp3-smoke.mjs'), 'utf8');
const smokeMatch = smoke.match(/const remoteScript = `([\\s\\S]*?)`;/);
const smokeBody = smokeMatch ? smokeMatch[1] : '';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('bash -s', (err, stream) => {
    if (err) throw err;
    stream.write(postDeploy + '\n' + smokeBody);
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
