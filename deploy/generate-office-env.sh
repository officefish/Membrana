#!/usr/bin/env bash
# Generate /etc/membrana/office.env with random API token (run once on VPS).
# Fill INTEGRATION placeholders before Claude/Linear smoke (O4).
# Usage: sudo ./deploy/generate-office-env.sh

set -euo pipefail

OUT="${1:-/etc/membrana/office.env}"

if [[ -f "$OUT" ]]; then
  echo "Refusing to overwrite existing $OUT" >&2
  echo "" >&2
  echo "ВНИМАНИЕ (04.08): новые пары ARCHIVARIUS_* сами в существующий env не появятся." >&2
  echo "Если их там нет — дописать вручную (решение владельца, не скрипта):" >&2
  echo "  echo 'ARCHIVARIUS_MONGO_URI=mongodb://archivarius-mongo:27017/membrana_archivarius' >> $OUT" >&2
  echo "  echo 'ARCHIVARIUS_MONGO_DB=membrana_archivarius' >> $OUT" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
token="$(openssl rand -hex 32)"

cat >"$OUT" <<EOF
# @membrana/background-office — generated $(date -u +%Y-%m-%dT%H:%M:%SZ)
OFFICE_PORT=3000
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
API_INTERNAL_TOKEN=${token}
ANTHROPIC_API_KEY=REPLACE_BEFORE_PROD
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
LINEAR_API_KEY=REPLACE_BEFORE_PROD
LINEAR_WEBHOOK_SECRET=REPLACE_BEFORE_PROD
GITHUB_TOKEN=REPLACE_BEFORE_PROD
GITHUB_OWNER=officefish
GITHUB_REPO=Membrana
DREAMS_ENABLED=true
DREAMS_VOLUME_PATH=/var/lib/membrana-dreams
# Archivarius (контейнер сессий, #1330): ровно дефолты compose — явной строкой,
# чтобы прод не держался на неявном дефолте (обзор 04.08, П3).
ARCHIVARIUS_MONGO_URI=mongodb://archivarius-mongo:27017/membrana_archivarius
ARCHIVARIUS_MONGO_DB=membrana_archivarius
EOF

chmod 600 "$OUT"
echo "Wrote $OUT (mode 600)."
echo "Replace REPLACE_BEFORE_PROD with real keys before O4 webhook/Claude smoke."
