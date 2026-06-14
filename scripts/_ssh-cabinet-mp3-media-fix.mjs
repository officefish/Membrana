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

echo "=== media health host ==="
curl -fsS --max-time 5 http://127.0.0.1:3010/health && echo || echo FAIL

echo "=== media ps ==="
docker compose -f packages/background-media/docker-compose.yml -f deploy/background-media.prod.compose.yml --env-file /etc/membrana/media.env ps

echo "=== start media if needed ==="
if ! curl -fsS --max-time 3 http://127.0.0.1:3010/health >/dev/null 2>&1; then
  chmod +x deploy/media-stack.sh
  ./deploy/media-stack.sh up
  sleep 15
  curl -fsS http://127.0.0.1:3010/health; echo
fi

echo "=== cabinet->media via host.docker.internal ==="
docker compose -f packages/background-cabinet/docker-compose.yml -f deploy/background-cabinet.prod.compose.yml --env-file /etc/membrana/cabinet.env exec -T cabinet-api node -e "fetch('http://host.docker.internal:3010/health').then(r=>r.text()).then(console.log).catch(e=>console.error(e))"

echo "=== token match check (length only) ==="
CAB_LEN=$(grep '^MEDIA_API_TOKEN=' /etc/membrana/cabinet.env | cut -d= -f2- | wc -c)
MED_LEN=$(grep '^API_INTERNAL_TOKEN=' /etc/membrana/media.env | cut -d= -f2- | wc -c)
echo "cabinet MEDIA_API_TOKEN chars: $CAB_LEN media API_INTERNAL_TOKEN chars: $MED_LEN"
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
