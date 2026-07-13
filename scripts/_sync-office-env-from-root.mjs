#!/usr/bin/env node
/**
 * Sync office integration keys from root .env to local package env files and VPS.
 * Does not print secret values.
 *
 * Usage:
 *   node scripts/_sync-office-env-from-root.mjs
 *   node scripts/_sync-office-env-from-root.mjs --no-remote   # local only
 *   node scripts/_sync-office-env-from-root.mjs --restart       # + office-stack up on VPS
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'ssh2';
import { getOfficeSshConfig, repoRoot } from './_ssh-office-config.mjs';

const noRemote = process.argv.includes('--no-remote');
const restart = process.argv.includes('--restart');

const INTEGRATION_KEYS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'LINEAR_API_KEY',
  'LINEAR_WEBHOOK_SECRET',
  'GITHUB_TOKEN',
  'GITHUB_OWNER',
  'GITHUB_REPO',
];

/** Опциональные ключи (#428 telegram): синкаются только если заданы в корневом .env. */
const OPTIONAL_INTEGRATION_KEYS = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ALLY_CHAT_ID'];

const LOCAL_DEV_KEYS = [
  'PORT',
  'NODE_ENV',
  'LOG_LEVEL',
  'API_INTERNAL_TOKEN',
  ...INTEGRATION_KEYS,
];

function parseEnv(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    map.set(m[1], m[2]);
  }
  return map;
}

function requireKeys(root, keys) {
  const missing = keys.filter((k) => !root.get(k)?.trim());
  if (missing.length) {
    throw new Error(`Missing in root .env: ${missing.join(', ')}`);
  }
}

function writePackageEnv(relPath, keys, root, header) {
  const lines = [header, ''];
  for (const key of keys) {
    lines.push(`${key}=${root.get(key)}`);
  }
  lines.push('');
  const path = resolve(repoRoot, relPath);
  writeFileSync(path, lines.join('\n'), 'utf8');
  console.log(`Updated ${relPath}`);
}

function writeDockerEnv(relPath, root, optionalKeys) {
  const optionalBlock = optionalKeys.length
    ? `\n${optionalKeys.map((k) => `${k}=${root.get(k)}`).join('\n')}\n`
    : '';
  const content = `# Docker Compose — synced from root .env (do not commit secrets)
# Regenerate: node scripts/_sync-office-env-from-root.mjs

OFFICE_PORT=3000
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

API_INTERNAL_TOKEN=${root.get('API_INTERNAL_TOKEN')}

ANTHROPIC_API_KEY=${root.get('ANTHROPIC_API_KEY')}
ANTHROPIC_MODEL=${root.get('ANTHROPIC_MODEL')}

LINEAR_API_KEY=${root.get('LINEAR_API_KEY')}
LINEAR_WEBHOOK_SECRET=${root.get('LINEAR_WEBHOOK_SECRET')}

GITHUB_TOKEN=${root.get('GITHUB_TOKEN')}
GITHUB_OWNER=${root.get('GITHUB_OWNER')}
GITHUB_REPO=${root.get('GITHUB_REPO')}
${optionalBlock}`;
  const path = resolve(repoRoot, relPath);
  writeFileSync(path, content, 'utf8');
  console.log(`Updated ${relPath}`);
}

function syncRemote(root, optionalKeys) {
  const keys = [...INTEGRATION_KEYS, ...optionalKeys];
  const payload = Buffer.from(
    JSON.stringify(Object.fromEntries(keys.map((k) => [k, root.get(k)]))),
  ).toString('base64');

  const remoteScript = `#!/bin/bash
set -euo pipefail
ENV_FILE=/etc/membrana/office.env
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi
python3 - <<'PY'
import base64, json, re
from pathlib import Path

updates = json.loads(base64.b64decode("${payload}").decode())
path = Path("/etc/membrana/office.env")
lines = path.read_text().splitlines()
seen = set()
out = []
for line in lines:
    m = re.match(r'^([A-Z0-9_]+)=', line)
    if m and m.group(1) in updates:
        key = m.group(1)
        out.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, val in updates.items():
    if key not in seen:
        out.append(f"{key}={val}")
path.write_text("\\n".join(out) + "\\n")
path.chmod(0o600)
PY
echo "Updated /etc/membrana/office.env (API_INTERNAL_TOKEN unchanged)"
grep -E '^(ANTHROPIC_API_KEY|LINEAR_API_KEY|LINEAR_WEBHOOK_SECRET|GITHUB_TOKEN)=' "$ENV_FILE" | sed 's/=.*/=<synced>/'
`;

  return new Promise((resolvePromise, rejectPromise) => {
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.exec('bash -s', (err, stream) => {
          if (err) {
            conn.end();
            rejectPromise(err);
            return;
          }
          stream.write(remoteScript);
          stream.end();
          stream.on('data', (d) => process.stdout.write(d));
          stream.stderr.on('data', (d) => process.stderr.write(d));
          stream.on('close', (code) => {
            if (restart && code === 0) {
              conn.exec(
                'cd /root/membrana && ln -sf /etc/membrana/office.env packages/background-office/.env.docker && ./deploy/office-stack.sh up --force-recreate',
                (err2, stream2) => {
                  if (err2) {
                    conn.end();
                    rejectPromise(err2);
                    return;
                  }
                  stream2.on('data', (d) => process.stdout.write(d));
                  stream2.stderr.on('data', (d) => process.stderr.write(d));
                  stream2.on('close', (code2) => {
                    conn.end();
                    if (code2 === 0) resolvePromise();
                    else rejectPromise(new Error(`restart exit ${code2}`));
                  });
                },
              );
              return;
            }
            conn.end();
            if (code === 0) resolvePromise();
            else rejectPromise(new Error(`remote exit ${code}`));
          });
        });
      })
      .on('error', rejectPromise)
      .connect(getOfficeSshConfig());
  });
}

const rootText = readFileSync(resolve(repoRoot, '.env'), 'utf8');
const root = parseEnv(rootText);

requireKeys(root, INTEGRATION_KEYS);
requireKeys(root, ['API_INTERNAL_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO']);

const presentOptionalKeys = OPTIONAL_INTEGRATION_KEYS.filter((k) => root.get(k)?.trim());

console.log('Syncing office env from root .env ...\n');

writePackageEnv(
  'packages/background-office/.env',
  [...LOCAL_DEV_KEYS, ...presentOptionalKeys],
  root,
  '# Synced from repo root .env — local dev (yarn office:dev)',
);

writeDockerEnv('packages/background-office/.env.docker', root, presentOptionalKeys);

if (!noRemote) {
  const { host, username } = getOfficeSshConfig();
  console.log(`\nRemote: ${username}@${host}`);
  await syncRemote(root, presentOptionalKeys);
}

console.log('\nDone.');
