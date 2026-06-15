#!/usr/bin/env node
/**
 * Prod hotfix: deploy catalog dedupe migration + verify 120 unique tariff samples.
 * Usage: MEMBRANA_DEPLOY_BRANCH=<branch> node scripts/_ssh-catalog-dedupe-prod.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const BRANCH = process.env.MEMBRANA_DEPLOY_BRANCH ?? 'feat/sample-library-drone-detection-sld1-sld2';
const USER_DEVICE = process.env.MEMBRANA_PROD_DEVICE_ID ?? '6a5b06c7-2c47-4e74-8cf0-293196fc2087';

const remoteScript = `#!/bin/bash
set -euo pipefail
MEDIA_ENV=/etc/membrana/media.env
MEDIA_TOKEN=$(grep '^API_INTERNAL_TOKEN=' "$MEDIA_ENV" | cut -d= -f2-)
DEV='${USER_DEVICE}'
export DEV

cd /root/membrana
git fetch origin ${BRANCH}
git reset --hard FETCH_HEAD
chmod +x deploy/media-stack.sh
./deploy/media-stack.sh build
./deploy/media-stack.sh up
sleep 20

echo "=== migration status ==="
docker compose -f packages/background-media/docker-compose.yml -f deploy/background-media.prod.compose.yml --env-file "$MEDIA_ENV" exec -T media-api sh -c 'cd /app/packages/background-media && npx prisma migrate status' 2>&1 | tail -8

echo "=== post-migration counts for user device ==="
docker compose -f packages/background-media/docker-compose.yml -f deploy/background-media.prod.compose.yml --env-file "$MEDIA_ENV" exec -T postgres psql -U membrana -d membrana_media -At -c "
SELECT COUNT(*)||'|'||COUNT(DISTINCT title)
FROM \\"Sample\\" s
JOIN \\"Collection\\" c ON c.id=s.\\"collectionId\\" AND c.\\"deviceId\\"=s.\\"deviceId\\"
WHERE s.\\"deviceId\\"='$DEV' AND c.\\"systemKey\\"='tariff-dataset';
"

echo "=== duplicate titles (should be empty) ==="
docker compose -f packages/background-media/docker-compose.yml -f deploy/background-media.prod.compose.yml --env-file "$MEDIA_ENV" exec -T postgres psql -U membrana -d membrana_media -c "
SELECT title, COUNT(*) FROM \\"Sample\\" s
JOIN \\"Collection\\" c ON c.id=s.\\"collectionId\\" AND c.\\"deviceId\\"=s.\\"deviceId\\"
WHERE s.\\"deviceId\\"='$DEV' AND c.\\"systemKey\\"='tariff-dataset'
GROUP BY title HAVING COUNT(*)>1 LIMIT 5;
"

python3 -c "
import json, subprocess, os
dev = os.environ['DEV']
tok = '''$MEDIA_TOKEN'''
samples = json.loads(subprocess.check_output([
  'curl', '-fsS', f'http://127.0.0.1:3010/v1/devices/{dev}/collections/__tariff_dataset__/samples',
  '-H', f'X-Membrana-Token: {tok}',
]))
titles = [s['title'] for s in samples]
assert len(samples) == 120, f'expected 120 api rows, got {len(samples)}'
assert len(set(titles)) == 120, f'expected 120 unique titles, got {len(set(titles))}'
print('catalog dedupe prod OK:', len(samples), 'samples,', len(set(titles)), 'unique titles')
"
`;

const conn = new Client();
conn.on('ready', () => {
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
}).connect({
  host: get('BACKGROUND_MEDIA_IPV4'),
  port: 22,
  username: 'root',
  password: get('BACKGROUND_MEDIA_PASSWORD'),
  readyTimeout: 30000,
});
