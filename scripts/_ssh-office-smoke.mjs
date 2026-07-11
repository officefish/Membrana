#!/usr/bin/env node
/**
 * Prod smoke for background-office (O4). Runs checks on VPS via SSH.
 * Does not print integration secrets (only OK / SKIP / FAIL).
 *
 * Usage:
 *   node scripts/_ssh-office-smoke.mjs
 *   node scripts/_ssh-office-smoke.mjs --external   # also curl from this machine
 */
import { Client } from 'ssh2';
import { getOfficeSshConfig, getOfficeDomain } from './_ssh-office-config.mjs';

const external = process.argv.includes('--external');
const domain = getOfficeDomain();

const remoteScript = `#!/bin/bash
set -euo pipefail
DOMAIN="${domain}"
ENV_FILE=/etc/membrana/office.env
PASS=0
FAIL=0
SKIP=0

ok() { echo "  OK   $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL $1"; FAIL=$((FAIL+1)); }
skip() { echo "  SKIP $1"; SKIP=$((SKIP+1)); }

is_placeholder() {
  local key="$1"
  local val
  val="$(grep "^${'$'}{key}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)"
  [[ -z "$val" || "$val" == "REPLACE_BEFORE_PROD" || "$val" == docker-placeholder* ]]
}

echo "=== office prod smoke ($DOMAIN) ==="
echo ""

echo "[1] HTTPS health"
if curl -fsS --max-time 15 "https://$DOMAIN/health" | grep -q '"status":"ok"'; then
  ok "GET /health"
else
  fail "GET /health"
fi

echo "[2] Webhook without signature"
code="$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://$DOMAIN/webhooks/linear" \\
  -H "Content-Type: application/json" -d '{}')"
if [[ "$code" == "403" ]]; then
  ok "POST /webhooks/linear unsigned → 403"
else
  fail "POST /webhooks/linear unsigned → $code (expected 403)"
fi

echo "[3] Webhook with valid signature"
if is_placeholder LINEAR_WEBHOOK_SECRET; then
  skip "signed webhook (LINEAR_WEBHOOK_SECRET not set on VPS)"
else
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  BODY='{"type":"WebhookTest","action":"create"}'
  SIG="$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$LINEAR_WEBHOOK_SECRET" | awk '{print $NF}')"
  code="$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://$DOMAIN/webhooks/linear" \\
    -H "Content-Type: application/json" \\
    -H "Linear-Signature: $SIG" \\
    -H "Linear-Delivery: smoke-$(date +%s)" \\
    -d "$BODY")"
  if [[ "$code" == "200" ]]; then
    ok "POST /webhooks/linear signed → 200"
  else
    fail "POST /webhooks/linear signed → $code (expected 200)"
  fi
fi

echo "[4] API auth gate"
code="$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://$DOMAIN/v1/claude/ask" \\
  -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"ping"}]}')"
if [[ "$code" == "401" ]]; then
  ok "POST /v1/claude/ask without token → 401"
else
  fail "POST /v1/claude/ask without token → $code (expected 401)"
fi

echo "[5] Claude ask (optional)"
if is_placeholder ANTHROPIC_API_KEY; then
  skip "POST /v1/claude/ask (ANTHROPIC_API_KEY not set)"
else
  TOKEN="$(grep '^API_INTERNAL_TOKEN=' "$ENV_FILE" | cut -d= -f2-)"
  code="$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://$DOMAIN/v1/claude/ask" \\
    -H "Content-Type: application/json" \\
    -H "X-Membrana-Token: $TOKEN" \\
    -d '{"messages":[{"role":"user","content":"Reply with exactly: pong"}],"max_tokens":16}')"
  if [[ "$code" == "200" ]]; then
    ok "POST /v1/claude/ask → 200"
  else
    fail "POST /v1/claude/ask → $code (expected 200)"
  fi
fi

echo "[6] Linear issue read (optional)"
if is_placeholder LINEAR_API_KEY; then
  skip "GET /v1/linear/issue/* (LINEAR_API_KEY not set)"
else
  TOKEN="$(grep '^API_INTERNAL_TOKEN=' "$ENV_FILE" | cut -d= -f2-)"
  ISSUE_ID="\${LINEAR_SMOKE_ISSUE:-MEM-60}"
  code="$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/v1/linear/issue/$ISSUE_ID" \\
    -H "X-Membrana-Token: $TOKEN")"
  if [[ "$code" == "200" ]]; then
    ok "GET /v1/linear/issue/$ISSUE_ID → 200"
  else
    skip "GET /v1/linear/issue/$ISSUE_ID → $code (set LINEAR_SMOKE_ISSUE if id differs)"
  fi
fi

echo ""
echo "=== summary: $PASS ok, $FAIL fail, $SKIP skip ==="
[[ "$FAIL" -eq 0 ]]
`;

function runRemote() {
  return new Promise((resolvePromise, rejectPromise) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      rejectPromise(new Error('SSH timeout (5m)'));
    }, 5 * 60 * 1000);

    conn
      .on('ready', () => {
        conn.exec('bash -s', (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            rejectPromise(err);
            return;
          }
          stream.write(remoteScript);
          stream.end();
          stream.on('data', (d) => process.stdout.write(d));
          stream.stderr.on('data', (d) => process.stderr.write(d));
          stream.on('close', (code) => {
            clearTimeout(timeout);
            conn.end();
            if (code === 0) resolvePromise(code);
            else rejectPromise(new Error(`remote exit ${code}`));
          });
        });
      })
      .on('error', rejectPromise)
      .connect(getOfficeSshConfig());
  });
}

async function externalChecks() {
  console.log('\n=== external checks (this machine) ===\n');
  const healthUrl = `https://${domain}/health`;
  const res = await fetch(healthUrl);
  console.log(res.ok ? `  OK   ${healthUrl} → ${res.status}` : `  FAIL ${healthUrl} → ${res.status}`);

  const unsigned = await fetch(`https://${domain}/webhooks/linear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  console.log(
    unsigned.status === 403
      ? '  OK   POST /webhooks/linear unsigned → 403'
      : `  FAIL POST /webhooks/linear unsigned → ${unsigned.status}`,
  );
}

const { host, username } = getOfficeSshConfig();
console.log(`Office smoke → ${username}@${host}\n`);
await runRemote();

if (external) {
  await externalChecks();
}

console.log('\nSmoke finished.');
