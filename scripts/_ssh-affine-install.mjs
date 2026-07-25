#!/usr/bin/env node
/**
 * Живой install AFFiNE на office VDS → strategy.mmbrn.tech (SAR W2 / #1159).
 *
 * Паттерн _ssh-panel-deploy (tar → sftp → bash). Делает:
 *   0) yarn affine:capacity-gate — STOP при [no-go] (инвариант R4);
 *   1) раскладка /opt/membrana-affine/{compose.yml,.env,postgres,storage,config,backups};
 *   2) секреты только в /opt/membrana-affine/.env (DB_PASSWORD генерируется, не печатается);
 *   3) docker compose pull && up -d (bind 127.0.0.1:3010);
 *   4) /etc/caddy/Caddyfile.d/strategy.caddy → validate → reload (отдельный site-block);
 *   5) smoke HTTPS + docker stats + MemAvailable (сводка в лог).
 *
 * ГЕЙТ: capacity [go] обязателен. DNS [go] — до LE (yarn panel:dns-gate).
 * Admin bootstrap в UI — владелец (агент не создаёт admin).
 *
 *   yarn affine:install
 *   node scripts/_ssh-affine-install.mjs --skip-capacity   # только если gate уже прогнан
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { Client } from 'ssh2';
import { getOfficeSshConfig, repoRoot } from './_ssh-office-config.mjs';

const STRATEGY_DOMAIN = process.env.STRATEGY_DOMAIN?.trim() || 'strategy.mmbrn.tech';
const AFFINE_PORT = process.env.AFFINE_PORT?.trim() || '3010';
const REMOTE_ROOT = '/opt/membrana-affine';
const SKIP_CAPACITY = process.argv.includes('--skip-capacity');

const cacheDir = join(repoRoot, 'scripts', 'cache');
mkdirSync(cacheDir, { recursive: true });
const tarPath = join(cacheDir, `affine-bundle-${Date.now()}.tgz`);
const remoteTar = '/tmp/affine-bundle.tgz';
const envSeedPath = join(cacheDir, `affine-env-seed-${Date.now()}.env`);
const remoteEnvSeed = '/tmp/affine-env-seed.env';

function runCapacityGate() {
  const gatePath = resolve(repoRoot, 'scripts/affine-capacity-gate.mjs');
  const r = spawnSync(process.execPath, [gatePath], {
    encoding: 'utf8',
    env: process.env,
    cwd: repoRoot,
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  process.stdout.write(out);
  if (r.error) {
    throw new Error(`capacity-gate failed: ${r.error.message}`);
  }
  if (r.status === 4) {
    throw new Error('capacity-gate [no-go] — compose up Affine НЕ запускать (R4)');
  }
  if (r.status !== 0) {
    throw new Error(`capacity-gate exit ${r.status}`);
  }
}

function renderStrategyCaddyfile() {
  const template = readFileSync(resolve(repoRoot, 'deploy/Caddyfile.strategy.template'), 'utf8');
  const rendered = template
    .replaceAll('{{STRATEGY_DOMAIN}}', STRATEGY_DOMAIN)
    .replaceAll('{{AFFINE_PORT}}', AFFINE_PORT);
  if (rendered.includes('{{')) throw new Error('strategy Caddyfile: неподставленный плейсхолдер');
  return rendered.replace(/^#.*\n/gm, '').trim();
}

function sftpPut(conn, local, remote) {
  return new Promise((resolvePromise, rejectPromise) => {
    conn.sftp((err, sftp) => {
      if (err) return rejectPromise(err);
      sftp.fastPut(local, remote, (putErr) => (putErr ? rejectPromise(putErr) : resolvePromise()));
    });
  });
}

function execBash(conn, script) {
  return new Promise((resolvePromise, rejectPromise) => {
    conn.exec('bash -s', (err, stream) => {
      if (err) return rejectPromise(err);
      stream.write(script);
      stream.end();
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
      stream.on('close', (code) =>
        code === 0 ? resolvePromise(0) : rejectPromise(new Error(`remote exit ${code}`)),
      );
    });
  });
}

function packBundle() {
  const composeSrc = resolve(repoRoot, 'deploy/affine/compose.yml');
  if (!existsSync(composeSrc)) {
    throw new Error(`missing ${composeSrc}`);
  }
  const staging = join(cacheDir, `affine-staging-${Date.now()}`);
  mkdirSync(staging, { recursive: true });
  writeFileSync(join(staging, 'compose.yml'), readFileSync(composeSrc));
  execFileSync('tar', ['-czf', tarPath, '-C', staging, 'compose.yml'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

function writeEnvSeed(dbPassword) {
  const body = [
    'AFFINE_REVISION=stable',
    `PORT=${AFFINE_PORT}`,
    `AFFINE_SERVER_EXTERNAL_URL=https://${STRATEGY_DOMAIN}`,
    `DB_DATA_LOCATION=${REMOTE_ROOT}/postgres`,
    `UPLOAD_LOCATION=${REMOTE_ROOT}/storage`,
    `CONFIG_LOCATION=${REMOTE_ROOT}/config`,
    'DB_USERNAME=affine',
    `DB_PASSWORD=${dbPassword}`,
    'DB_DATABASE=affine',
    '',
  ].join('\n');
  writeFileSync(envSeedPath, body, { encoding: 'utf8', mode: 0o600 });
}

const caddyfile = renderStrategyCaddyfile();

const remoteScript = `#!/bin/bash
set -euo pipefail

ROOT=${REMOTE_ROOT}
DOMAIN=${STRATEGY_DOMAIN}
PORT=${AFFINE_PORT}

echo "=== [1/5] layout \${ROOT} ==="
mkdir -p "\${ROOT}/postgres" "\${ROOT}/storage" "\${ROOT}/config" "\${ROOT}/backups"
tar -xzf ${remoteTar} -C "\${ROOT}"
rm -f ${remoteTar}

echo "=== [2/5] .env (idempotent; secrets not echoed) ==="
if [ -f "\${ROOT}/.env" ] && grep -q '^DB_PASSWORD=.' "\${ROOT}/.env"; then
  echo "  .env уже есть с DB_PASSWORD — обновляю URL/paths, пароль не трогаю"
  # refresh non-secret keys; keep existing DB_PASSWORD
  ENV_TMP=\$(mktemp)
  grep -v -E '^(AFFINE_REVISION|PORT|AFFINE_SERVER_EXTERNAL_URL|DB_DATA_LOCATION|UPLOAD_LOCATION|CONFIG_LOCATION|DB_USERNAME|DB_DATABASE)=' "\${ROOT}/.env" > "\${ENV_TMP}" || true
  {
    echo "AFFINE_REVISION=stable"
    echo "PORT=\${PORT}"
    echo "AFFINE_SERVER_EXTERNAL_URL=https://\${DOMAIN}"
    echo "DB_DATA_LOCATION=\${ROOT}/postgres"
    echo "UPLOAD_LOCATION=\${ROOT}/storage"
    echo "CONFIG_LOCATION=\${ROOT}/config"
    echo "DB_USERNAME=affine"
    echo "DB_DATABASE=affine"
    cat "\${ENV_TMP}"
  } > "\${ROOT}/.env.new"
  # restore password line from old if missing in new
  if ! grep -q '^DB_PASSWORD=.' "\${ROOT}/.env.new"; then
    grep '^DB_PASSWORD=' "\${ROOT}/.env" >> "\${ROOT}/.env.new" || true
  fi
  mv "\${ROOT}/.env.new" "\${ROOT}/.env"
  rm -f "\${ENV_TMP}"
else
  echo "  создаю .env из seed"
  cp ${remoteEnvSeed} "\${ROOT}/.env"
fi
chmod 600 "\${ROOT}/.env"
rm -f ${remoteEnvSeed}

echo "=== [3/5] docker compose pull + up ==="
cd "\${ROOT}"
docker compose -f compose.yml --env-file .env pull
docker compose -f compose.yml --env-file .env up -d
echo "  waiting for affine_server..."
for i in \$(seq 1 60); do
  if curl -sf --max-time 3 "http://127.0.0.1:\${PORT}/" >/dev/null 2>&1; then
    echo "  local HTTP ok (attempt \$i)"
    break
  fi
  # Affine may redirect to setup — any TCP response from the app is enough
  CODE=\$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:\${PORT}/" || true)
  if [ -n "\$CODE" ] && [ "\$CODE" != "000" ]; then
    echo "  local HTTP \$CODE (attempt \$i)"
    break
  fi
  sleep 5
done
docker compose -f compose.yml --env-file .env ps
ss -ltnp | grep -E ":${AFFINE_PORT}\\b" || true
# R3: must not listen on 0.0.0.0 / *
PUBLIC_BIND=$(ss -ltnp | grep -E "0\\.0\\.0\\.0:${AFFINE_PORT}\\b|\\*:${AFFINE_PORT}\\b" || true)
if [ -n "$PUBLIC_BIND" ]; then
  echo "[fail] Affine port exposed on public bind — abort"
  echo "$PUBLIC_BIND"
  exit 1
fi

echo "=== [4/5] caddy site-block strategy ==="
mkdir -p /etc/caddy/Caddyfile.d
cat > /etc/caddy/Caddyfile.d/strategy.caddy <<'CADDY_EOF'
${caddyfile}
CADDY_EOF
# Не дублировать import (урок ambiguous site definition)
grep -q 'Caddyfile\\.d' /etc/caddy/Caddyfile || echo 'import /etc/caddy/Caddyfile.d/*' >> /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

echo "=== [5/5] LE wait + smoke + capacity note ==="
sleep 25
HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' --max-time 45 "https://\${DOMAIN}/" || echo 000)
REDIR=\$(curl -sI --max-time 45 "https://\${DOMAIN}/" | head -n 5 || true)
echo "https://\${DOMAIN}/ -> HTTP \$HTTP_CODE"
echo "\$REDIR"
echo "--- docker stats (no-stream) ---"
docker stats --no-stream --format 'table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}' || true
echo "--- free / df ---"
free -h
df -h /
echo "[deploy-summary] affine=ok bind=127.0.0.1:\${PORT} caddy=reloaded https=\$HTTP_CODE domain=\${DOMAIN}"
`;

async function main() {
  if (!SKIP_CAPACITY) {
    console.log('=== capacity gate ===');
    runCapacityGate();
  } else {
    console.log('=== capacity gate SKIPPED (--skip-capacity) ===');
  }

  const dbPassword = randomBytes(24).toString('base64url');
  writeEnvSeed(dbPassword);
  packBundle();

  const { host, username } = getOfficeSshConfig();
  console.log(`\nAffine install → ${username}@${host} (${STRATEGY_DOMAIN})\n`);

  await new Promise((resolvePromise, rejectPromise) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      rejectPromise(new Error('SSH timeout (20m)'));
    }, 20 * 60 * 1000);
    conn
      .on('ready', async () => {
        try {
          console.log('Uploading compose bundle + env seed...');
          await sftpPut(conn, tarPath, remoteTar);
          await sftpPut(conn, envSeedPath, remoteEnvSeed);
          await execBash(conn, remoteScript);
          clearTimeout(timeout);
          conn.end();
          resolvePromise(0);
        } catch (e) {
          clearTimeout(timeout);
          conn.end();
          rejectPromise(e);
        }
      })
      .on('error', rejectPromise)
      .connect(getOfficeSshConfig());
  });

  console.log('\nAffine install OK.');
  console.log(`Live: https://${STRATEGY_DOMAIN}/`);
  console.log('Owner: открой UI и создай первого admin (агент bootstrap не делает).');
}

try {
  await main();
  process.exitCode = 0;
} catch (e) {
  console.error(`[fail] ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
} finally {
  try {
    unlinkSync(tarPath);
  } catch {
    /* ignore */
  }
  try {
    unlinkSync(envSeedPath);
  } catch {
    /* ignore */
  }
}
