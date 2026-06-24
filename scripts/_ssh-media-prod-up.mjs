#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const prodCompose = readFileSync(resolve(root, 'deploy/background-media.prod.compose.yml'), 'utf8');

const cmd = [
  'set -e',
  'cd /root/membrana',
  'mkdir -p /var/lib/membrana/media-blobs',
  "python3 - <<'PY'",
  `open('deploy/background-media.prod.compose.yml','w').write(${JSON.stringify(prodCompose)})`,
  'PY',
  'docker compose \\',
  '  -f packages/background-media/docker-compose.yml \\',
  '  -f deploy/background-media.prod.compose.yml \\',
  '  --env-file /etc/membrana/media.env \\',
  '  up -d --force-recreate',
  'sleep 12',
  'docker compose \\',
  '  -f packages/background-media/docker-compose.yml \\',
  '  -f deploy/background-media.prod.compose.yml \\',
  '  --env-file /etc/membrana/media.env \\',
  '  ps',
  'curl -fsS http://127.0.0.1:3010/health && echo ""',
  'TOKEN=$(grep "^API_INTERNAL_TOKEN=" /etc/membrana/media.env | cut -d= -f2)',
  'curl -fsS -X POST http://127.0.0.1:3010/v1/devices \\',
  '  -H "Content-Type: application/json" \\',
  '  -H "X-Membrana-Token: $TOKEN" \\',
  '  -d \'{"name":"VPS smoke","kind":"microphone"}\' && echo ""',
].join('\n');

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec('bash -s', (err, stream) => {
      if (err) throw err;
      stream.write(cmd);
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
    readyTimeout: 20000,
  });
