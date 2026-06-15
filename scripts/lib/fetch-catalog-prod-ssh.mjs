/**
 * Fetch full catalog JSON from prod via SSH + cabinet API (uses VPS cabinet.env).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @returns {Promise<{
 *   samples: import('./ground-truth-export.mjs').CatalogSampleRef[];
 *   sampleCount: number;
 *   catalogId: string;
 *   membraneId: string;
 *   apiBase: string;
 *   fetchedAt: string;
 * }>}
 */
export function fetchCatalogGroundTruthViaSsh() {
  const envPath = resolve(root, '.env');
  const envText = readFileSync(envPath, 'utf8');
  const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
  const host = get('BACKGROUND_MEDIA_IPV4');
  const password = get('BACKGROUND_MEDIA_PASSWORD');
  if (!host || !password) {
    throw new Error('Missing BACKGROUND_MEDIA_IPV4 or BACKGROUND_MEDIA_PASSWORD in .env');
  }

  const remoteScript = `#!/bin/bash
set -euo pipefail
CENV=/etc/membrana/cabinet.env
API=https://cabinet.membrana.space
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' "$CENV" | cut -d= -f2-)
TOK=$(curl -fsS -X POST "$API/v1/auth/login" -H "Content-Type: application/json" -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
MID=$(curl -fsS "$API/v1/membranes/me" -H "Authorization: Bearer $TOK" | python3 -c "import sys,json; print(json.load(sys.stdin)['membrane']['id'])")
python3 <<PY
import json, subprocess
api = "$API"
tok = """$TOK"""
mid = """$MID"""
samples = []
page = 1
total_pages = 1
catalog_id = ""
sample_count = 0
while page <= total_pages:
    data = json.loads(subprocess.check_output([
        'curl', '-fsS',
        f'{api}/v1/membranes/{mid}/catalog?page={page}&limit=40',
        '-H', f'Authorization: Bearer {tok}',
    ]))
    total_pages = data['totalPages']
    sample_count = data['sampleCount']
    catalog_id = data['catalogId']
    samples.extend(data['samples'])
    page += 1
print(json.dumps({
    'apiBase': api,
    'membraneId': mid,
    'catalogId': catalog_id,
    'sampleCount': sample_count,
    'samples': samples,
}, ensure_ascii=False))
PY
`;

  return new Promise((resolvePromise, reject) => {
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.exec('bash -s', (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }
          let stdout = '';
          stream.write(remoteScript);
          stream.end();
          stream.on('data', (d) => {
            stdout += d.toString();
          });
          stream.stderr.on('data', (d) => {
            process.stderr.write(d);
          });
          stream.on('close', (code) => {
            conn.end();
            if (code !== 0) {
              reject(new Error(`SSH catalog fetch exited ${code ?? 1}`));
              return;
            }
            try {
              const parsed = JSON.parse(stdout.trim());
              resolvePromise({
                ...parsed,
                fetchedAt: new Date().toISOString(),
              });
            } catch (e) {
              reject(new Error(`Invalid catalog JSON from SSH: ${e instanceof Error ? e.message : String(e)}`));
            }
          });
        });
      })
      .on('error', reject)
      .connect({
        host,
        port: 22,
        username: 'root',
        password,
        readyTimeout: 30000,
      });
  });
}
