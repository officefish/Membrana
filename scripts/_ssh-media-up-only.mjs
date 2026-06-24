#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const cmd = [
  'set -e',
  'cd /root/membrana',
  'git checkout -- deploy/background-media.prod.compose.yml',
  'ln -sf /etc/membrana/media.env packages/background-media/.env.docker',
  'docker compose -f packages/background-media/docker-compose.yml --env-file /etc/membrana/media.env down 2>/dev/null || true',
  'docker compose -f packages/background-media/docker-compose.yml --env-file /etc/membrana/media.env up -d',
  'sleep 18',
  'curl -fsS http://127.0.0.1:3010/health && echo ""',
  'docker compose -f packages/background-media/docker-compose.yml --env-file /etc/membrana/media.env ps',
  "grep '^API_INTERNAL_TOKEN=' /etc/membrana/media.env",
].join(' && ');

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
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
