#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const cmd = 'cd /root/membrana && docker compose -f packages/background-media/docker-compose.yml --env-file /etc/membrana/media.env ps && docker compose -f packages/background-media/docker-compose.yml --env-file /etc/membrana/media.env logs media-api --tail 40 && sleep 5 && curl -fsS http://127.0.0.1:3010/health; echo';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (c) => { conn.end(); process.exit(c ?? 0); });
  });
}).connect({ host: get('BACKGROUND_MEDIA_IPV4'), port: 22, username: 'root', password: get('BACKGROUND_MEDIA_PASSWORD') });
