#!/bin/sh
set -e

cd /app/packages/background-media

echo "[entrypoint] Prisma migrate deploy..."
npx prisma migrate deploy

echo "[entrypoint] Prisma generate..."
npx prisma generate

echo "[entrypoint] Starting @membrana/background-media on port ${PORT:-3010}..."
exec node dist/main.js
