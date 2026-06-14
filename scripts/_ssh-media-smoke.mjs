#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const cmd = `sleep 30
curl -fsS http://127.0.0.1:3010/health; echo
curl -s -o /dev/null -w "local /docs/: %{http_code}\\n" http://127.0.0.1:3010/docs/
curl -s -o /dev/null -w "local /docs-json: %{http_code}\\n" http://127.0.0.1:3010/docs-json
curl -sk -o /dev/null -w "https media.membrana.space/docs/: %{http_code}\\n" https://media.membrana.space/docs/
curl -sk -o /dev/null -w "https media.membrana.space/health: %{http_code}\\n" https://media.membrana.space/health
docker compose -f /root/membrana/packages/background-media/docker-compose.yml -f /root/membrana/deploy/background-media.prod.compose.yml --env-file /etc/membrana/media.env logs media-api --tail 20`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (code) => { conn.end(); process.exit(code ?? 1); });
  });
}).connect({
  host: get('BACKGROUND_MEDIA_IPV4'),
  port: 22,
  username: 'root',
  password: get('BACKGROUND_MEDIA_PASSWORD'),
});
