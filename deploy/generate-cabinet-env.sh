#!/usr/bin/env bash
# Generate /etc/membrana/cabinet.env with random secrets (run once on VPS).
# Usage: sudo ./deploy/generate-cabinet-env.sh

set -euo pipefail

OUT="${1:-/etc/membrana/cabinet.env}"

if [[ -f "$OUT" ]]; then
  echo "Refusing to overwrite existing $OUT" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
api_token="$(openssl rand -hex 32)"
pg_pass="$(openssl rand -hex 32)"
bootstrap_pass="$(openssl rand -base64 18 | tr -d '/+=' | head -c 16)"

cat >"$OUT" <<EOF
# @membrana/background-cabinet — generated $(date -u +%Y-%m-%dT%H:%M:%SZ)
POSTGRES_USER=membrana
POSTGRES_PASSWORD=${pg_pass}
POSTGRES_DB=membrana_cabinet
API_INTERNAL_TOKEN=${api_token}
CABINET_API_PORT=3020
CABINET_WEB_PORT=8080
LOG_LEVEL=info
SESSION_TTL_HOURS=168
CABINET_CORS_ORIGINS=https://cabinet.membrana.space
CLIENT_CORS_ORIGINS=http://localhost:5173,http://localhost:4173
MEDIA_API_URL=http://media-api:3010
MEDIA_PUBLIC_API_URL=https://media.membrana.space
ALLOW_REGISTRATION=false
CABINET_RUN_SEED=true
CABINET_BOOTSTRAP_LOGIN=admin
CABINET_BOOTSTRAP_PASSWORD=${bootstrap_pass}
VITE_CABINET_API_URL=https://cabinet.membrana.space
EOF

chmod 600 "$OUT"
echo "Wrote $OUT (mode 600)."
echo "Bootstrap login: admin"
echo "Bootstrap password: ${bootstrap_pass}"
echo "After first successful deploy set CABINET_RUN_SEED=false in $OUT"
