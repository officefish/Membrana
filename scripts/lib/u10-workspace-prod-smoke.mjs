/**
 * U10 W4/W5 + U11 S2-W3 prod-smoke (paired): tariff quota + media device-workspaces API.
 * Вызывается с VPS через SSH (`yarn cabinet:u10-workspace:smoke`).
 */

/** Bash-скрипт: MP3 pair + W4 tariff + W5 workspaces list/put/get. */
export const U10_WORKSPACE_REMOTE_SMOKE = `#!/bin/bash
set -uo pipefail
ENV=/etc/membrana/cabinet.env
MEDIA_ENV=/etc/membrana/media.env
MEDIA_TOKEN=$(grep '^API_INTERNAL_TOKEN=' "$MEDIA_ENV" | cut -d= -f2-)
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' "$ENV" | cut -d= -f2-)
API=https://cabinet.membrana.space
MEDIA=http://127.0.0.1:3010
FAILED=0
mark(){ if [ "$2" = "0" ]; then echo "[u10-smoke] $1: OK"; else echo "[u10-smoke] $1: FAIL"; FAILED=1; fi; }

echo "=== cabinet health ==="
curl -fsS "$API/health" >/dev/null 2>&1; mark cabinet-health $?

echo "=== media health ==="
curl -fsS "$MEDIA/health" >/dev/null 2>&1; mark media-health $?

LOGIN_JSON="{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}"
TOKEN=$(curl -fsS -X POST "$API/v1/auth/login" -H 'Content-Type: application/json' -d "$LOGIN_JSON" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || true)
[ -n "$TOKEN" ]; mark cabinet-login $?

ME=$(curl -fsS "$API/v1/membranes/me" -H "Authorization: Bearer $TOKEN" 2>/dev/null || true)
NODE_ID=$(echo "$ME" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('node') or {}).get('id') or '')" 2>/dev/null || true)
if [ -z "$NODE_ID" ]; then
  NODE_JSON=$(curl -fsS -X POST "$API/v1/membranes/me/nodes" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}' 2>/dev/null || true)
  NODE_ID=$(echo "$NODE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('node',{}).get('id',''))" 2>/dev/null || true)
fi
[ -n "$NODE_ID" ]; mark membrane-node $?

ACTIVE_KEY=$(echo "$ME" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for k in (d.get('node') or {}).get('accessKeys') or []:
  if k.get('active'): print(k['id']); break
" 2>/dev/null || true)
if [ -n "$ACTIVE_KEY" ]; then
  curl -fsS -X POST "$API/v1/access-keys/$ACTIVE_KEY/revoke" -H "Authorization: Bearer $TOKEN" >/dev/null 2>&1 || true
fi
KEY_RESP=$(curl -fsS -X POST "$API/v1/nodes/$NODE_ID/access-keys" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"duration":"hours_4"}' 2>/dev/null || true)
PLAIN_KEY=$(echo "$KEY_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('key',''))" 2>/dev/null || true)
[ -n "$PLAIN_KEY" ]; mark access-key $?

PAIR_JSON=$(curl -fsS -X POST "$API/v1/pair" -H 'Content-Type: application/json' -d "{\\"accessKey\\":\\"$PLAIN_KEY\\",\\"clientLabel\\":\\"u10-smoke\\"}" 2>/dev/null || true)
DEVICE_ID=$(echo "$PAIR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('deviceId',''))" 2>/dev/null || true)
[ -n "$DEVICE_ID" ]; mark pair $?

echo "$PAIR_JSON" | python3 -c "
import sys,json
d=json.load(sys.stdin)
t=d.get('tariff') or {}
v=t.get('maxUserWorkspaces')
assert v==3, f'maxUserWorkspaces expected 3, got {v!r}'
print('tariff.maxUserWorkspaces=', v)
" >/dev/null 2>&1; mark tariff-quota $?

WS_LIST=$(curl -fsS "$MEDIA/v1/devices/$DEVICE_ID/device-workspaces" \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" \\
  -H "X-Membrana-Device-Id: $DEVICE_ID" 2>/dev/null || true)
echo "$WS_LIST" | python3 -c "
import sys,json
d=json.load(sys.stdin)
assert 'workspaces' in d
print('workspaces', len(d['workspaces']))
" >/dev/null 2>&1; mark device-workspaces-list $?

WS_ID="u10-smoke-$(date +%s)"
DOC='{"kind":"device-scenario","version":1,"deviceKind":"microphone","signalGraph":{"nodes":[],"edges":[]},"scenario":{"nodes":[],"edges":[]},"meta":{"workspaceKind":"user","workspaceId":"'"$WS_ID"'","title":"U10 smoke"}}'
PUT_RESP=$(curl -fsS -X PUT "$MEDIA/v1/devices/$DEVICE_ID/device-workspaces/$WS_ID" \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" \\
  -H "X-Membrana-Device-Id: $DEVICE_ID" \\
  -H 'Content-Type: application/json' \\
  -d "$DOC" 2>/dev/null || true)
echo "$PUT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('document')" >/dev/null 2>&1; mark device-workspaces-put $?

GET_RESP=$(curl -fsS "$MEDIA/v1/devices/$DEVICE_ID/device-workspaces/$WS_ID" \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" \\
  -H "X-Membrana-Device-Id: $DEVICE_ID" 2>/dev/null || true)
echo "$GET_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('document',{}).get('meta',{}).get('title')=='U10 smoke'" >/dev/null 2>&1; mark device-workspaces-get $?

curl -fsS -X PATCH "$MEDIA/v1/devices/$DEVICE_ID/device-workspaces/active" \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" \\
  -H "X-Membrana-Device-Id: $DEVICE_ID" \\
  -H 'Content-Type: application/json' \\
  -d "{\\"activeWorkspaceId\\":\\"$WS_ID\\"}" >/dev/null 2>&1 || true

WS_LIST2=$(curl -fsS "$MEDIA/v1/devices/$DEVICE_ID/device-workspaces" \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" \\
  -H "X-Membrana-Device-Id: $DEVICE_ID" 2>/dev/null || true)
echo "$WS_LIST2" | python3 -c "
import sys,json
d=json.load(sys.stdin)
assert d.get('activeWorkspaceId')=='$WS_ID', d.get('activeWorkspaceId')
ids=[w.get('workspaceId') for w in d.get('workspaces') or []]
assert '$WS_ID' in ids, ids
" >/dev/null 2>&1; mark paired-active-workspace $?

GET_RELOAD=$(curl -fsS "$MEDIA/v1/devices/$DEVICE_ID/device-workspaces/$WS_ID" \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" \\
  -H "X-Membrana-Device-Id: $DEVICE_ID" 2>/dev/null || true)
echo "$GET_RELOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('document',{}).get('meta',{}).get('workspaceId')=='$WS_ID'" >/dev/null 2>&1; mark paired-reload-roundtrip $?

LEGACY=$(curl -fsS "$MEDIA/v1/devices/$DEVICE_ID/device-scenario" \\
  -H "X-Membrana-Token: $MEDIA_TOKEN" \\
  -H "X-Membrana-Device-Id: $DEVICE_ID" 2>/dev/null || true)
echo "$LEGACY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('document',{}).get('meta',{}).get('title')=='U10 smoke'" >/dev/null 2>&1; mark legacy-device-scenario $?

CID_CAB=$(docker ps --filter name=cabinet-api --format '{{.ID}}' | head -n1)
CID_MEDIA=$(docker ps --filter name=media-api --format '{{.ID}}' | head -n1)
if [ -n "$CID_CAB" ]; then
  docker exec -w /app/packages/background-cabinet "$CID_CAB" /app/node_modules/.bin/prisma migrate status >/dev/null 2>&1; mark cabinet-migrate $?
else
  mark cabinet-migrate 1
fi
if [ -n "$CID_MEDIA" ]; then
  docker exec -w /app/packages/background-media "$CID_MEDIA" /app/node_modules/.bin/prisma migrate status >/dev/null 2>&1; mark media-migrate $?
else
  mark media-migrate 1
fi

if [ "$FAILED" = "0" ]; then echo "U10 WORKSPACE PROD SMOKE OK"; else echo "U10 WORKSPACE PROD SMOKE FAIL"; fi
exit "$FAILED"
`;

/**
 * @param {{ host: string; password: string }} opts
 * @returns {Promise<{ ok: boolean; exitCode: number; out: string }>}
 */
export async function runU10WorkspaceSmoke({ host, password }) {
  const { Client } = await import('ssh2');
  const startedAt = new Date();

  const { code, out } = await new Promise((resolvePromise) => {
    let buf = '';
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.exec('bash -s', (err, stream) => {
          if (err) throw err;
          stream.write(U10_WORKSPACE_REMOTE_SMOKE);
          stream.end();
          stream.on('data', (d) => {
            buf += d.toString();
            process.stdout.write(d);
          });
          stream.stderr.on('data', (d) => {
            buf += d.toString();
            process.stderr.write(d);
          });
          stream.on('close', (c) => {
            conn.end();
            resolvePromise({ code: c ?? 1, out: buf });
          });
        });
      })
      .on('error', (e) => resolvePromise({ code: 1, out: `[ssh-error] ${e?.message ?? e}` }))
      .connect({ host, port: 22, username: 'root', password, readyTimeout: 60000 });
  });

  const ok = code === 0 && /U10 WORKSPACE PROD SMOKE OK/.test(out);
  return {
    ok,
    exitCode: code,
    out,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
  };
}
