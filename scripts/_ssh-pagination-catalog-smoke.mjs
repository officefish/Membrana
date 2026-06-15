#!/usr/bin/env node
/** Post-deploy smoke: cabinet catalog pagination only. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const remoteScript = `#!/bin/bash
set -euo pipefail
ENV=/etc/membrana/cabinet.env
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' "$ENV" | cut -d= -f2-)
TOK=$(curl -fsS -X POST https://cabinet.membrana.space/v1/auth/login -H "Content-Type: application/json" -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
MID=$(curl -fsS https://cabinet.membrana.space/v1/membranes/me -H "Authorization: Bearer $TOK" | python3 -c "import sys,json; print(json.load(sys.stdin)['membrane']['id'])")
python3 <<PY
import json, subprocess
tok = """$TOK"""
mid = """$MID"""
page1 = json.loads(subprocess.check_output([
  'curl', '-fsS',
  f'https://cabinet.membrana.space/v1/membranes/{mid}/catalog?page=1&limit=40',
  '-H', f'Authorization: Bearer {tok}',
]))
assert page1['sampleCount'] == 120, page1['sampleCount']
assert page1['totalPages'] == 3, page1['totalPages']
assert len(page1['samples']) == 40, len(page1['samples'])
page2 = json.loads(subprocess.check_output([
  'curl', '-fsS',
  f'https://cabinet.membrana.space/v1/membranes/{mid}/catalog?page=2&limit=40',
  '-H', f'Authorization: Bearer {tok}',
]))
assert len(page2['samples']) == 40
print('cabinet catalog pagination OK', page1['sampleCount'], 'total')
PY
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
