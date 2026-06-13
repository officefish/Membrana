#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const remoteScript = `#!/bin/bash
set -euo pipefail
if grep -q '^CABINET_RUN_SEED=true' /etc/membrana/cabinet.env; then
  sed -i 's/^CABINET_RUN_SEED=true/CABINET_RUN_SEED=false/' /etc/membrana/cabinet.env
  echo "CABINET_RUN_SEED set to false"
fi
grep '^CABINET_RUN_SEED=' /etc/membrana/cabinet.env
grep '^ALLOW_REGISTRATION=' /etc/membrana/cabinet.env
cd /root/membrana && ./deploy/cabinet-stack.sh up
echo "stack restarted"
`;

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
    host: get('BACKGROUND_MEDIA_IPV4'),
    port: 22,
    username: 'root',
    password: get('BACKGROUND_MEDIA_PASSWORD'),
    readyTimeout: 30000,
  });
