#!/usr/bin/env node
/**
 * Sync O1+O2 build context to VPS (tar) and run office-stack build + up.
 * Office files may be ahead of remote git — uploads local sources.
 */
import { execSync } from 'node:child_process';
import { unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'ssh2';
import { getOfficeSshConfig, repoRoot } from './_ssh-office-config.mjs';

const tarPath = join(tmpdir(), `office-src-${Date.now()}.tgz`);
const remoteTar = '/tmp/office-src.tgz';

const tarArgs = [
  'tar',
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
  'packages/services/rag',
  'packages/background-office',
  'deploy/background-office.prod.compose.yml',
  'deploy/office-stack.sh',
  'deploy/generate-office-env.sh',
];

console.log('Packing office build context...');
execSync(tarArgs.join(' '), { cwd: repoRoot, stdio: 'inherit' });

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
