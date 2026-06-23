#!/usr/bin/env node
/**
 * U10 W4/W5 prod deploy: media rebuild (migrate) + cabinet image + prod-smoke.
 *
 * Порядок: preflight + ci-gate → media build/up → cabinet image pull/up → U10 smoke.
 *
 * Env:
 *   BACKGROUND_MEDIA_IPV4, BACKGROUND_MEDIA_PASSWORD — VPS (как у других cabinet:*:prod).
 *   CABINET_IMAGE_TAG — тег GHCR (default: latest; релиз: cabinet-vX.Y.Z).
 *   CABINET_GIT_BRANCH — ветка для compose на VPS (default: main).
 *   DEPLOY_ALLOW_DIRTY / DEPLOY_ALLOW_RED_CI — обход гейтов.
 *
 * Запуск:
 *   CABINET_IMAGE_TAG=cabinet-v0.2.0 yarn cabinet:u10-workspace:prod
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from 'ssh2';
import { deployPreflight } from './_deploy-preflight.mjs';
import { assertCiGreen } from './_deploy-ci-gate.mjs';
import { runU10WorkspaceSmoke } from './lib/u10-workspace-prod-smoke.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readEnvFile() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return () => '';
  const envText = readFileSync(envPath, 'utf8');
  return (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
}

/**
 * @param {object} opts
 * @param {string} opts.branch
 * @param {string} opts.imageTag
 * @param {string} opts.host
 * @param {string} opts.password
 */
export async function deployU10WorkspaceProd({ branch, imageTag, host, password, allowDirty, allowRedCi }) {
  const preflight = deployPreflight({
    branch,
    cwd: root,
    ...(allowDirty === undefined ? {} : { allowDirty }),
  });
  assertCiGreen({
    branch,
    sha: preflight.originHead,
    ...(allowRedCi === undefined ? {} : { allowRedCi }),
  });

  const remoteScript = `#!/bin/bash
set -euo pipefail
cd /root/membrana

echo "=== git sync (${branch}) ==="
git fetch origin "${branch}"
git reset --hard FETCH_HEAD
git log -1 --oneline

chmod +x deploy/media-stack.sh deploy/cabinet-stack.sh

echo "=== media build + up (W5 migrate) ==="
./deploy/media-stack.sh build
./deploy/media-stack.sh down || true
./deploy/media-stack.sh up
sleep 20

if [ ! -f /etc/membrana/cabinet.env ]; then
  chmod +x deploy/generate-cabinet-env.sh
  ./deploy/generate-cabinet-env.sh /etc/membrana/cabinet.env
fi
ln -sf /etc/membrana/cabinet.env packages/background-cabinet/.env.docker

echo "=== cabinet image deploy (tag: ${imageTag}) ==="
export CABINET_DEPLOY_MODE=image
export CABINET_IMAGE_TAG="${imageTag}"
./deploy/cabinet-stack.sh pull
./deploy/cabinet-stack.sh down || true
sleep 2
./deploy/cabinet-stack.sh up
sleep 25

curl -fsS http://127.0.0.1:3020/health; echo
curl -fsS http://127.0.0.1:3010/health; echo
echo "U10 WORKSPACE DEPLOY OK (tag: ${imageTag})"
`;

  console.log(`Deploy U10 workspace (media+cabinet tag=${imageTag}) → ${host}`);

  const startedAt = new Date();
  const deployResult = await new Promise((resolvePromise) => {
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
      .on('error', (e) => resolvePromise({ code: 1, out: `[ssh-error] ${e?.message ?? e}` }))
      .connect({ host, port: 22, username: 'root', password, readyTimeout: 120000 });
  });

  const deployOk = deployResult.code === 0 && /U10 WORKSPACE DEPLOY OK/.test(deployResult.out);
  let smoke = { ok: false, skipped: true };
  if (deployOk) {
    console.log('\n=== U10 prod smoke ===');
    smoke = await runU10WorkspaceSmoke({ host, password });
    smoke.skipped = false;
  }

  const finishedAt = new Date();
  const summary = {
    epic: 'db-user-workspace-u10',
    branch,
    imageTag,
    composeSha: preflight.originHead,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    deployOk,
    smokeOk: smoke.ok,
    ok: deployOk && smoke.ok,
  };

  const dir = resolve(root, 'deploy-artifacts');
  mkdirSync(dir, { recursive: true });
  const stamp = summary.finishedAt.replace(/[:.]/g, '-');
  const file = resolve(dir, `u10-workspace-prod-${stamp}.json`);
  writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`\n=== summary (${file}) ===`);
  console.log(JSON.stringify(summary, null, 2));

  return summary;
}

async function main() {
  const get = readEnvFile();
  const branch =
    process.env.CABINET_GIT_BRANCH || get('CABINET_GIT_BRANCH') || get('GIT_BRANCH') || 'main';
  const imageTag = process.env.CABINET_IMAGE_TAG || get('CABINET_IMAGE_TAG') || 'latest';
  const host = get('BACKGROUND_MEDIA_IPV4');
  const password = get('BACKGROUND_MEDIA_PASSWORD');
  if (!host || !password) {
    console.error('Set BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD in .env');
    process.exit(1);
  }

  const summary = await deployU10WorkspaceProd({ branch, imageTag, host, password });
  process.exit(summary.ok ? 0 : 1);
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  void main();
}
