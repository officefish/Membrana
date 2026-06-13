#!/usr/bin/env bash
# Generate /etc/membrana/media.env with random secrets (run once on VPS).
# Usage: sudo ./deploy/generate-media-env.sh

set -euo pipefail

OUT="${1:-/etc/membrana/media.env}"

if [[ -f "$OUT" ]]; then
  echo "Refusing to overwrite existing $OUT" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
token="$(openssl rand -hex 32)"
pg_pass="$(openssl rand -hex 32)"

cat >"$OUT" <<EOF
# @membrana/background-media — generated $(date -u +%Y-%m-%dT%H:%M:%SZ)
POSTGRES_USER=membrana
POSTGRES_PASSWORD=${pg_pass}
POSTGRES_DB=membrana_media
API_INTERNAL_TOKEN=${token}
MEDIA_PORT=3010
LOG_LEVEL=info
MEDIA_QUOTA_BYTES_PER_DEVICE=1073741824
MAX_UPLOAD_BYTES=52428800
MEDIA_ALLOWED_MIME=audio/wav,audio/wave,audio/mpeg,audio/flac,audio/ogg
MEDIA_BLOB_HOST_DIR=/var/lib/membrana/media-blobs
CLIENT_CORS_ORIGINS=http://localhost:5173,http://localhost:4173
EOF

chmod 600 "$OUT"
echo "Wrote $OUT (mode 600). Save API_INTERNAL_TOKEN for client build."
