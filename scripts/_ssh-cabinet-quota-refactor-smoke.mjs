#!/usr/bin/env node
/** Prod smoke only: tariff fields + split media quota (no rebuild). */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const remoteScript = `#!/bin/bash
set -euo pipefail
ENV=/etc/membrana/cabinet.env
MEDIA_ENV=/etc/membrana/media.env
MEDIA_TOKEN=$(grep '^API_INTERNAL_TOKEN=' "$MEDIA_ENV" | cut -d= -f2-)
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' "$ENV" | cut -d= -f2-)

echo "=== cabinet health ==="
curl -fsS http://127.0.0.1:3020/health; echo

echo "=== media health ==="
curl -fsS http://127.0.0.1:3010/health; echo

echo "=== cabinet tariff fields ==="
TOKEN=$(curl -fsS -X POST http://127.0.0.1:3020/v1/auth/login \\
  -H 'Content-Type: application/json' \\
  -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
export TOKEN
python3 -c "
import json, subprocess, os
token = os.environ['TOKEN']
out = subprocess.check_output([
  'curl', '-fsS', 'http://127.0.0.1:3020/v1/membranes/me',
  '-H', f'Authorization: Bearer {token}',
])
d = json.loads(out)
t = d['membrane']['tariff']
assert t['id'] == 'free-v1'
assert 'userStorageQuotaBytes' in t and 'bufferQuotaBytes' in t and 'datasetCatalogId' in t
print(json.dumps({k: t[k] for k in ('id','userStorageQuotaBytes','bufferQuotaBytes','datasetCatalogId')}, ensure_ascii=False))
"

echo "=== media quota shape ==="
DEV=$(curl -fsS -X POST http://127.0.0.1:3010/v1/devices \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" -H 'Content-Type: application/json' \\
  -d '{"name":"quota-smoke","kind":"microphone"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
export DEV MEDIA_TOKEN
python3 -c "
import json, subprocess, os
dev = os.environ['DEV']
tok = os.environ['MEDIA_TOKEN']
out = subprocess.check_output([
  'curl', '-fsS', f'http://127.0.0.1:3010/v1/devices/{dev}/quota',
  '-H', f'X-Membrana-Token: {tok}',
])
d = json.loads(out)
assert 'userStorage' in d and 'buffer' in d and 'dataset' in d
print(json.dumps({k: d[k] for k in ('userStorage','buffer','dataset')}, ensure_ascii=False))
"

echo "=== QUOTA REFACTOR SMOKE OK ==="
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
