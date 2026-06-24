#!/bin/sh
set -e

cd /app/packages/background-office

echo "[entrypoint] Starting @membrana/background-office on port ${PORT:-3000}..."
exec node dist/main.js
