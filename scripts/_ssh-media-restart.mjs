#!/usr/bin/env node
/**
 * Fix compose port override, restart media stack, verify Swagger on prod.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const prodCompose = readFileSync(resolve(root, 'deploy/background-media.prod.compose.yml'), 'utf8');

const remoteScript = `#!/bin/bash
set -euo pipefail
cd /root/membrana
chmod +x deploy/media-stack.sh

echo "=== patch prod compose (ports !override) ==="
cat > deploy/background-media.prod.compose.yml <<'EOF'
${prodCompose}
EOF

echo "=== restore MEDIA_PORT=3010 + caddy ==="
if grep -q '^MEDIA_PORT=' /etc/membrana/media.env; then
  sed -i 's/^MEDIA_PORT=.*/MEDIA_PORT=3010/' /etc/membrana/media.env
fi
sed -i 's|reverse_proxy 127.0.0.1:301[0-9]|reverse_proxy 127.0.0.1:3010|' /etc/caddy/Caddyfile.d/media.caddy
systemctl reload caddy

echo "=== kill stray host node ==="
pkill -9 -f 'node dist/main.js' || true
sleep 2

echo "=== docker down/up ==="
./deploy/media-stack.sh down || true
docker rm -f membrana-media-media-api-1 2>/dev/null || true
./deploy/media-stack.sh up
sleep 25

echo "=== smoke ==="
ss -tlnp | grep 3010 || true
curl -fsS http://127.0.0.1:3010/health; echo
curl -s -o /dev/null -w "local /docs/: %{http_code}\\n" http://127.0.0.1:3010/docs/
curl -s -o /dev/null -w "local /docs-json: %{http_code}\\n" http://127.0.0.1:3010/docs-json
curl -sk -o /dev/null -w "https media.membrana.space/docs/: %{http_code}\\n" https://media.membrana.space/docs/
curl -sk -o /dev/null -w "https media.membrana.space/health: %{http_code}\\n" https://media.membrana.space/health
docker compose -f packages/background-media/docker-compose.yml -f deploy/background-media.prod.compose.yml --env-file /etc/membrana/media.env ps
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec('bash -s', (err, stream) => {
    if (err) throw err;
    stream.write(remoteScript);
    stream.end();
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (code) => { conn.end(); process.exit(code ?? 1); });
  });
}).connect({
  host: get('BACKGROUND_MEDIA_IPV4'),
  port: 22,
  username: 'root',
  password: get('BACKGROUND_MEDIA_PASSWORD'),
  readyTimeout: 30000,
});
