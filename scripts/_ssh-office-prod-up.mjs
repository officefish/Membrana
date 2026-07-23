#!/usr/bin/env node
/**
 * Sync O1+O2 build context to VPS (tar) and run office-stack build + up.
 * Office files may be ahead of remote git — uploads local sources.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'ssh2';
import { getOfficeSshConfig, repoRoot } from './_ssh-office-config.mjs';

// Не tmpdir(): на Windows bsdtar не знает --force-local, а GNU tar путает C:\ с host:file.
const cacheDir = join(repoRoot, 'scripts', 'cache');
mkdirSync(cacheDir, { recursive: true });
const tarPath = join(cacheDir, `office-src-${Date.now()}.tgz`);
const remoteTar = '/tmp/office-src.tgz';

const tarArgs = [
  '--exclude=packages/background-office/node_modules',
  '--exclude=packages/background-office/dist',
  '--exclude=packages/background-office/.env.docker',
  '-czf',
  tarPath,
  'package.json',
  'yarn.lock',
  '.yarnrc.yml',
  'tsconfig.base.json',
  '.dockerignore',
  'docs/virtual-team',
  'docs/WHITE_PAPER.md',
  'docs/ARCHITECTURE.md',
  'docs/SERVICES.md',
  'docs/truth/registry.json',
  'docs/prompts/DREAM_MASTER_PROMPT.md',
  'packages/services/rag',
  'packages/background-office',
  'scripts/lib/llm-procedures.json',
  'scripts/lib/llm-procedure-defaults.json',
  'scripts/lib/llm-provider-catalog.json',
  'scripts/lib/dreams-log.mjs',
  'scripts/lib/dreams-tick.mjs',
  'scripts/lib/dreams-format.mjs',
  'scripts/lib/dreams-providers.mjs',
  'scripts/lib/dreams-select.mjs',
  'scripts/lib/night-research.mjs',
  'scripts/lib/strategy-horizon.mjs',
  'scripts/lib/truth-graph.mjs',
  'scripts/llm-probe.mjs',
  'deploy/background-office.prod.compose.yml',
  'deploy/office-stack.sh',
  'deploy/generate-office-env.sh',
];

console.log('Packing office build context...');
execFileSync('tar', tarArgs, { cwd: repoRoot, stdio: 'inherit' });

const remoteScript = `#!/bin/bash
set -euo pipefail
cd /root/membrana
mkdir -p deploy packages/background-office/docker

tar -xzf ${remoteTar} -C /root/membrana
chmod +x deploy/office-stack.sh deploy/generate-office-env.sh

if [[ ! -f /etc/membrana/office.env ]]; then
  ./deploy/generate-office-env.sh /etc/membrana/office.env
else
  echo "office.env exists, skipping generate"
fi

ln -sf /etc/membrana/office.env packages/background-office/.env.docker

./deploy/office-stack.sh build
./deploy/office-stack.sh up
sleep 12
./deploy/office-stack.sh ps
curl -fsS http://127.0.0.1:3000/health && echo ""
rm -f ${remoteTar}
`;

function sftpPut(conn, local, remote) {
  return new Promise((resolvePromise, rejectPromise) => {
    conn.sftp((err, sftp) => {
      if (err) {
        rejectPromise(err);
        return;
      }
      sftp.fastPut(local, remote, (putErr) => {
        if (putErr) rejectPromise(putErr);
        else resolvePromise();
      });
    });
  });
}

function execBash(conn, script) {
  return new Promise((resolvePromise, rejectPromise) => {
    conn.exec('bash -s', (err, stream) => {
      if (err) {
        rejectPromise(err);
        return;
      }
      stream.write(script);
      stream.end();
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
      stream.on('close', (code) => {
        if (code === 0) resolvePromise(code);
        else rejectPromise(new Error(`remote exit ${code}`));
      });
    });
  });
}

function runDeploy() {
  return new Promise((resolvePromise, rejectPromise) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      rejectPromise(new Error('SSH timeout (45m)'));
    }, 45 * 60 * 1000);

    conn
      .on('ready', async () => {
        try {
          console.log('Uploading tarball...');
          await sftpPut(conn, tarPath, remoteTar);
          console.log('Building and starting office stack on VPS...\n');
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
}

const { host, username } = getOfficeSshConfig();
console.log(`Office prod deploy → ${username}@${host}\n`);

try {
  await runDeploy();
  console.log('\nOffice prod deploy OK.');
} finally {
  try {
    unlinkSync(tarPath);
  } catch {
    /* ignore */
  }
}
