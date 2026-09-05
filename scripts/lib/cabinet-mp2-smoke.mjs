export const CABINET_MP2_DEFAULT_API = 'https://cabinet.membrana.space';
export const CABINET_API_CONTAINER = 'cabinet-api';
export const TARIFF_GRID_IN_IMAGE_PATH = '/app/docs/tariffs/tariff-grid.json';
export const INVALID_PAIR_ACCESS_KEY = 'deploy-smoke-invalid-key-2288';

function fail(reason, details = {}) {
  return { ok: false, reason, ...details };
}

function pass(reason, details = {}) {
  return { ok: true, reason, ...details };
}

export function tariffsNoSessionVerdict(status) {
  const code = String(status);
  if (code === '401') return pass('tariffs-no-session: exact 401');
  return fail(`tariffs-no-session: expected exact 401, got ${code}`, { status: code });
}

function parseJsonBody(body) {
  try {
    return JSON.parse(String(body ?? ''));
  } catch {
    return null;
  }
}

export function pairInvalidKeyVerdict({ status, body }) {
  const code = String(status);
  if (code === '401' || code === '404') {
    return pass(`pair-invalid-key: domain refusal ${code}`, { status: code });
  }
  if (code === '200') {
    const parsed = parseJsonBody(body);
    if (parsed !== null && parsed.ok === false) {
      return pass('pair-invalid-key: domain refusal 200 ok=false', { status: code });
    }
    return fail('pair-invalid-key: expected 200 body with ok=false', { status: code });
  }
  if (code === '400') {
    return fail('pair-invalid-key: transport 400 is not a domain refusal', { status: code });
  }
  if (/^5/u.test(code)) {
    return fail(`pair-invalid-key: server error ${code} is not a domain refusal`, { status: code });
  }
  return fail(`pair-invalid-key: unexpected status ${code}`, { status: code });
}

export function imageTariffGridVerdict(exitCode) {
  const code = Number(exitCode);
  if (code === 0) return pass('image-tariff-grid: file exists', { exitCode: code });
  return fail('image-tariff-grid: tariff grid missing from runtime image', { exitCode: code });
}

function shellSingleQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

export function buildCabinetMp2RemoteScript({
  api = CABINET_MP2_DEFAULT_API,
  container = CABINET_API_CONTAINER,
  tariffGridPath = TARIFF_GRID_IN_IMAGE_PATH,
  invalidPairAccessKey = INVALID_PAIR_ACCESS_KEY,
} = {}) {
  const apiLiteral = shellSingleQuote(api);
  const containerLiteral = shellSingleQuote(container);
  const tariffGridLiteral = shellSingleQuote(tariffGridPath);
  const pairBodyLiteral = shellSingleQuote(
    JSON.stringify({
      accessKey: invalidPairAccessKey,
      clientLabel: 'deploy-smoke-invalid-key',
    }),
  );

  return `#!/bin/bash
set -euo pipefail
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' /etc/membrana/cabinet.env | cut -d= -f2-)
LOGIN_JSON="{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}"
API=${apiLiteral}
CABINET_API_CONTAINER=${containerLiteral}
TARIFF_GRID_IN_IMAGE_PATH=${tariffGridLiteral}

echo "=== MP1 health ==="
curl -fsS "$API/health"; echo

echo "=== MP2 tariffs no session ==="
TARIFFS_BODY=/tmp/cabinet-tariffs-no-session.json
TARIFFS_CODE=$(curl -skS -o "$TARIFFS_BODY" -w "%{http_code}" "$API/v1/tariffs" || true)
if [ "$TARIFFS_CODE" != "401" ]; then
  echo "tariffs no-session expected exact 401, got $TARIFFS_CODE"
  cat "$TARIFFS_BODY" 2>/dev/null || true
  echo
  exit 1
fi
echo "tariffs no-session: 401"

echo "=== MP2 pair invalid key ==="
PAIR_BODY=/tmp/cabinet-pair-invalid-key.json
PAIR_CODE=$(curl -skS -o "$PAIR_BODY" -w "%{http_code}" -X POST "$API/v1/pair" -H 'Content-Type: application/json' -d ${pairBodyLiteral} || true)
case "$PAIR_CODE" in
  401|404)
    echo "pair invalid-key domain refusal: $PAIR_CODE"
    ;;
  200)
    python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('ok') is False, d; print('pair invalid-key domain refusal: 200 ok=false')" < "$PAIR_BODY"
    ;;
  400)
    echo "pair invalid-key expected domain refusal, got transport 400"
    cat "$PAIR_BODY" 2>/dev/null || true
    echo
    exit 1
    ;;
  5*)
    echo "pair invalid-key expected domain refusal, got server error $PAIR_CODE"
    cat "$PAIR_BODY" 2>/dev/null || true
    echo
    exit 1
    ;;
  *)
    echo "pair invalid-key expected domain refusal, got $PAIR_CODE"
    cat "$PAIR_BODY" 2>/dev/null || true
    echo
    exit 1
    ;;
esac

echo "=== MP2 image tariff grid ==="
CABINET_API_CONTAINER_ID=$(cd /root/membrana && ./deploy/cabinet-stack.sh ps -q "$CABINET_API_CONTAINER" 2>/dev/null || true)
if [ -n "$CABINET_API_CONTAINER_ID" ]; then
  CABINET_API_CONTAINER="$CABINET_API_CONTAINER_ID"
fi
docker exec "$CABINET_API_CONTAINER" test -f "$TARIFF_GRID_IN_IMAGE_PATH"
echo "image tariff grid: present"

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
}
