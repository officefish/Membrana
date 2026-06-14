#!/bin/sh
set -e

cd /app/packages/background-cabinet

echo "[entrypoint] Prisma migrate deploy..."
npx prisma migrate deploy

echo "[entrypoint] Prisma generate..."
npx prisma generate

if [ "${CABINET_RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] Prisma db seed (CABINET_RUN_SEED=true)..."
  npx prisma db seed
fi

echo "[entrypoint] Starting @membrana/background-cabinet on port ${PORT:-3020}..."
exec node dist/main.js
