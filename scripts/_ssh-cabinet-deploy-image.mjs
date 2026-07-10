#!/usr/bin/env node
/**
 * DR2/DR3 (deploy-pipeline-refactor): прод-деплой cabinet из готового образа registry.
 *
 * В отличие от _ssh-cabinet-deploy.mjs (build на VPS из git), этот скрипт тянет
 * иммутабельный образ из GHCR по тегу и поднимает стек без сборки. Источник истины —
 * образ, собранный в CI (.github/workflows/cabinet-images.yml), его нельзя
 * «недокоммитить». Дерево на VPS используется только для compose/env/Caddy.
 *
 * Сохраняется свойство «провал до переключения не роняет прод»: образы тянутся
 * (`pull`) ДО `down`/`up`; если pull упал — старые контейнеры продолжают работать.
 *
 * DR3: возвращает машиночитаемую JSON-сводку (тег, SHA, образы, smoke, длительность)
 * и пишет её в deploy-artifacts/. Откат = деплой предыдущего тега (см. _ssh-cabinet-rollback.mjs).
 *
 * Env (.env в корне репо или переменные окружения):
 *   BACKGROUND_MEDIA_IPV4, BACKGROUND_MEDIA_PASSWORD — доступ к VPS (как у media).
 *   CABINET_IMAGE_TAG    — тег образа: cabinet-vX.Y.Z (релиз), sha-<short> или main. Default: main
 *                          (НЕ latest: latest пушится только на релиз-теги — откат прода 2026-07-09).
 *   CABINET_API_IMAGE / CABINET_WEB_IMAGE — имена образов (пусто → дефолты compose-оверлея).
 *   CABINET_GIT_BRANCH   — ветка для синка compose/Caddy на VPS. Default: main.
 *
 * Гейты перед деплоем: preflight (чистое дерево) + ci-gate (зелёный CI коммита origin).
 * Обход: --allow-dirty / --allow-red-ci (или DEPLOY_ALLOW_DIRTY / DEPLOY_ALLOW_RED_CI).
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from 'ssh2';
import { deployPreflight } from './_deploy-preflight.mjs';
import { assertCiGreen } from './_deploy-ci-gate.mjs';

const DEFAULT_API_IMAGE = 'ghcr.io/officefish/membrana-cabinet-api';
const DEFAULT_WEB_IMAGE = 'ghcr.io/officefish/membrana-cabinet-web';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Считать значение из корневого .env (без учёта process.env). */
export function readEnvFile() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return () => '';
  const envText = readFileSync(envPath, 'utf8');
  return (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
}

/**
 * Задеплоить cabinet из образа registry по тегу. Возвращает JSON-сводку деплоя.
 * Не вызывает process.exit — это делает вызывающий (main-обёртка / rollback).
 */
export async function deployCabinetImage({
  imageTag,
  branch,
  apiImage = '',
  webImage = '',
  host,
  password,
  allowDirty,
  allowRedCi,
} = {}) {
  const resolvedApi = apiImage || DEFAULT_API_IMAGE;
  const resolvedWeb = webImage || DEFAULT_WEB_IMAGE;

  // DR0 gate: локальное состояние должно совпадать с origin/<branch> (синк compose из origin).
  const preflight = deployPreflight({
    branch,
    cwd: root,
    ...(allowDirty === undefined ? {} : { allowDirty }),
  });
  // DR1 gate: на прод едет только зелёный в CI коммит.
  assertCiGreen({
    branch,
    sha: preflight.originHead,
    ...(allowRedCi === undefined ? {} : { allowRedCi }),
  });

  const imageEnvExports = [
    'export CABINET_DEPLOY_MODE=image',
    `export CABINET_IMAGE_TAG="${imageTag}"`,
    apiImage ? `export CABINET_API_IMAGE="${apiImage}"` : '',
    webImage ? `export CABINET_WEB_IMAGE="${webImage}"` : '',
  ]
    .filter(Boolean)
    .join('\n');

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

  console.log(`Deploy cabinet image tag=${imageTag} (compose from ${branch}) → ${host}`);

  const startedAt = new Date();
  const result = await new Promise((resolvePromise) => {
    let out = '';
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.exec('bash -s', (err, stream) => {
          if (err) throw err;
          stream.write(remoteScript);
          stream.end();
          stream.on('data', (d) => {
            out += d.toString();
            process.stdout.write(d);
          });
          stream.stderr.on('data', (d) => {
            out += d.toString();
            process.stderr.write(d);
          });
          stream.on('close', (code) => {
            conn.end();
            resolvePromise({ code: code ?? 1, out });
          });
        });
      })
      .on('error', (e) => {
        resolvePromise({ code: 1, out: `${out}\n[ssh-error] ${e?.message ?? e}` });
      })
      .connect({ host, port: 22, username: 'root', password, readyTimeout: 60000 });
  });

  const finishedAt = new Date();
  const smokeOk = /CABINET IMAGE DEPLOY OK/.test(result.out);

  return {
    service: 'cabinet',
    mode: 'image',
    imageTag,
    images: { api: `${resolvedApi}:${imageTag}`, web: `${resolvedWeb}:${imageTag}` },
    branch,
    composeSha: preflight.originHead,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    exitCode: result.code,
    smokeOk,
    ok: result.code === 0 && smokeOk,
  };
}

/**
 * Резолв тега образа (deploy-image-tag-default, ретроспектива 2026-07-09).
 *
 * Дефолт — `main`, НЕ `latest`: workflow cabinet-images.yml пушит `latest`
 * только на релиз-теги `cabinet-v*`, а каждый push в main тегируется `main` /
 * `sha-<short>`. Дефолт `latest` 2026-07-09 молча выкатил СТАРЫЙ релизный
 * образ и откатил прод. Явный `CABINET_IMAGE_TAG` (env или .env) — приоритет.
 */
export function resolveCabinetImageTag({ env = process.env, envFileGet = () => '' } = {}) {
  return env.CABINET_IMAGE_TAG || envFileGet('CABINET_IMAGE_TAG') || 'main';
}

/** Записать JSON-сводку в deploy-artifacts/ и вернуть путь. */

export function writeDeploySummary(summary, { kind = 'deploy' } = {}) {
  const dir = resolve(root, 'deploy-artifacts');
  mkdirSync(dir, { recursive: true });
  const stamp = summary.finishedAt.replace(/[:.]/g, '-');
  const file = resolve(dir, `cabinet-${kind}-${stamp}.json`);
  writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  return file;
}

async function main() {
  const get = readEnvFile();
  const branch =
    process.env.CABINET_GIT_BRANCH || get('CABINET_GIT_BRANCH') || get('GIT_BRANCH') || 'main';
  const imageTag = resolveCabinetImageTag({ env: process.env, envFileGet: get });
  const apiImage = process.env.CABINET_API_IMAGE || get('CABINET_API_IMAGE') || '';
  const webImage = process.env.CABINET_WEB_IMAGE || get('CABINET_WEB_IMAGE') || '';
  const host = get('BACKGROUND_MEDIA_IPV4');
  const password = get('BACKGROUND_MEDIA_PASSWORD');
  if (!host || !password) {
    console.error('Set BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD in .env');
    process.exit(1);
  }

  const summary = await deployCabinetImage({ imageTag, branch, apiImage, webImage, host, password });

  // DR4: опционально прогнать расширенный smoke и вложить его в сводку.
  if (summary.ok && process.env.CABINET_SMOKE_AFTER_DEPLOY === '1') {
    const { runCabinetSmoke } = await import('./_ssh-cabinet-smoke.mjs');
    console.log('\n=== extended smoke (CABINET_SMOKE_AFTER_DEPLOY=1) ===');
    const smoke = await runCabinetSmoke({ host, password });
    summary.smoke = smoke;
    summary.ok = summary.ok && smoke.ok;
  }

  const file = writeDeploySummary(summary);
  console.log(`\n=== deploy summary (${file}) ===`);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok ? 0 : 1);
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  main();
}
