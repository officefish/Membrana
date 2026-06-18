#!/usr/bin/env node
/**
 * DR2 (deploy-pipeline-refactor): прод-деплой cabinet из готового образа registry.
 *
 * В отличие от _ssh-cabinet-deploy.mjs (build на VPS из git), этот скрипт тянет
 * иммутабельный образ из GHCR по тегу и поднимает стек без сборки. Источник истины —
 * образ, собранный в CI (.github/workflows/cabinet-images.yml), его нельзя
 * «недокоммитить». Дерево на VPS используется только для compose/env/Caddy.
 *
 * Сохраняется свойство «провал до переключения не роняет прод»: образы тянутся
 * (`pull`) ДО `down`/`up`; если pull упал — старые контейнеры продолжают работать.
 *
 * Env (.env в корне репо или переменные окружения):
 *   BACKGROUND_MEDIA_IPV4, BACKGROUND_MEDIA_PASSWORD — доступ к VPS (как у media).
 *   CABINET_IMAGE_TAG    — тег образа: cabinet-vX.Y.Z (релиз) или sha-<short>. Default: latest.
 *   CABINET_GIT_BRANCH   — ветка для синка compose/Caddy на VPS. Default: main.
 *
 * Гейты перед деплоем: preflight (чистое дерево) + ci-gate (зелёный CI коммита origin).
 * Обход: --allow-dirty / --allow-red-ci (или DEPLOY_ALLOW_DIRTY / DEPLOY_ALLOW_RED_CI).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';
import { deployPreflight } from './_deploy-preflight.mjs';
import { assertCiGreen } from './_deploy-ci-gate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
if (!existsSync(envPath)) {
  console.error('Missing .env with BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD');
  process.exit(1);
}

const envText = readFileSync(envPath, 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
const branch =
  process.env.CABINET_GIT_BRANCH || get('CABINET_GIT_BRANCH') || get('GIT_BRANCH') || 'main';
const imageTag = process.env.CABINET_IMAGE_TAG || get('CABINET_IMAGE_TAG') || 'latest';
// Имена образов registry конфигурируемы через env; пусто → дефолты compose-оверлея.
const apiImage = process.env.CABINET_API_IMAGE || get('CABINET_API_IMAGE') || '';
const webImage = process.env.CABINET_WEB_IMAGE || get('CABINET_WEB_IMAGE') || '';

const imageEnvExports = [
  'export CABINET_DEPLOY_MODE=image',
  `export CABINET_IMAGE_TAG="${imageTag}"`,
  apiImage ? `export CABINET_API_IMAGE="${apiImage}"` : '',
  webImage ? `export CABINET_WEB_IMAGE="${webImage}"` : '',
]
  .filter(Boolean)
  .join('\n');

// DR0 gate: локальное состояние должно совпадать с origin/<branch> (синк compose из origin).
const preflight = deployPreflight({ branch, cwd: root });
// DR1 gate: на прод едет только зелёный в CI коммит.
assertCiGreen({ branch, sha: preflight.originHead });

const remoteScript = `#!/bin/bash
set -euo pipefail
cd /root/membrana

${imageEnvExports}

echo "=== git sync compose/Caddy (${branch}) ==="
git fetch origin "${branch}"
git reset --hard FETCH_HEAD
git log -1 --oneline

if [ ! -f /etc/membrana/cabinet.env ]; then
  echo "=== generate cabinet.env ==="
  chmod +x deploy/generate-cabinet-env.sh
  ./deploy/generate-cabinet-env.sh /etc/membrana/cabinet.env | tee /root/cabinet-bootstrap-once.txt
fi

ln -sf /etc/membrana/cabinet.env packages/background-cabinet/.env.docker
chmod +x deploy/cabinet-stack.sh

echo "=== sync Caddy cabinet.caddy ==="
cp deploy/Caddyfile.cabinet.example /etc/caddy/Caddyfile.d/cabinet.caddy
caddy validate --config /etc/caddy/Caddyfile 2>/dev/null || true
systemctl reload caddy || true

# Опциональный логин в GHCR (если образы приватные). Для публичных пакетов не нужен.
GHCR_USER=$(grep '^GHCR_USER=' /etc/membrana/cabinet.env 2>/dev/null | cut -d= -f2- || true)
GHCR_TOKEN=$(grep '^GHCR_TOKEN=' /etc/membrana/cabinet.env 2>/dev/null | cut -d= -f2- || true)
if [ -n "$GHCR_TOKEN" ]; then
  echo "=== docker login ghcr.io ==="
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "\${GHCR_USER:-officefish}" --password-stdin
fi

echo "=== pull image (tag: ${imageTag}) ==="
# pull ДО down: если образ недоступен — прод остаётся на старом образе.
./deploy/cabinet-stack.sh pull

echo "=== up (no build) ==="
./deploy/cabinet-stack.sh down || true
sleep 2
./deploy/cabinet-stack.sh up
sleep 25

echo "=== local smoke ==="
./deploy/cabinet-stack.sh smoke

echo "=== https smoke ==="
curl -fsS https://cabinet.membrana.space/health; echo
curl -sk -o /dev/null -w "cabinet SPA: %{http_code}\\n" https://cabinet.membrana.space/ || true

./deploy/cabinet-stack.sh ps
echo "CABINET IMAGE DEPLOY OK (tag: ${imageTag})"
`;

const host = get('BACKGROUND_MEDIA_IPV4');
const password = get('BACKGROUND_MEDIA_PASSWORD');
if (!host || !password) {
  console.error('Set BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD in .env');
  process.exit(1);
}

console.log(`Deploy cabinet image tag=${imageTag} (compose from ${branch}) → ${host}`);

const conn = new Client();
conn
  .on('ready', () => {
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
  })
  .connect({
    host,
    port: 22,
    username: 'root',
    password,
    readyTimeout: 60000,
  });
