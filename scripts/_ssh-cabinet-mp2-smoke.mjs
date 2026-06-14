#!/usr/bin/env node
/**
 * Prod smoke MP1+MP2: cabinet API, membrane, node, access keys.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const remoteScript = `#!/bin/bash
set -euo pipefail
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' /etc/membrana/cabinet.env | cut -d= -f2-)
LOGIN_JSON="{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}"
API=https://cabinet.membrana.space

echo "=== MP1 health ==="
curl -fsS "$API/health"; echo

echo "=== MP1 login + me ==="
TOKEN=$(curl -fsS -X POST "$API/v1/auth/login" -H 'Content-Type: application/json' -d "$LOGIN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -fsS "$API/v1/auth/me" -H "Authorization: Bearer $TOKEN" | head -c 120; echo

echo "=== MP2 membranes/me ==="
ME=$(curl -fsS "$API/v1/membranes/me" -H "Authorization: Bearer $TOKEN")
echo "$ME" | head -c 280; echo
echo "$ME" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['membrane']['tariff']['id']=='free-v1'"

NODE_ID=$(echo "$ME" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('node',{}).get('id') or '')")

if [ -z "$NODE_ID" ]; then
  echo "=== MP2 create node ==="
  NODE_JSON=$(curl -fsS -X POST "$API/v1/membranes/me/nodes" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
  echo "$NODE_JSON" | head -c 200; echo
  NODE_ID=$(echo "$NODE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['node']['id'])")
fi

echo "=== MP2 create key hours_4 ==="
ACTIVE_KEY=$(echo "$ME" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for k in (d.get('node') or {}).get('accessKeys') or []:
  if k.get('active'): print(k['id']); break
")
if [ -n "$ACTIVE_KEY" ]; then
  echo "revoking existing active key $ACTIVE_KEY"
  curl -fsS -X POST "$API/v1/access-keys/$ACTIVE_KEY/revoke" -H "Authorization: Bearer $TOKEN" >/dev/null
fi
KEY_RESP=$(curl -fsS -X POST "$API/v1/nodes/$NODE_ID/access-keys" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"duration":"hours_4"}')
echo "$KEY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'key' in d and d['accessKey']['duration']=='hours_4'; print('key ok, id='+d['accessKey']['id'])"
KEY_ID=$(echo "$KEY_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessKey']['id'])")

echo "=== MP2 revoke key ==="
curl -fsS -X POST "$API/v1/access-keys/$KEY_ID/revoke" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['accessKey']['revokedAt']; print('revoked ok')"

echo "=== MP2 SPA ==="
curl -sk -o /dev/null -w "cabinet SPA: %{http_code}\\n" "$API/"

echo "=== ALL MP2 SMOKE OK ==="
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
