#!/usr/bin/env node
/**
 * Prod smoke: MP5 telemetry journal API (reports + live records).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const BRANCH = process.env.MEMBRANA_DEPLOY_BRANCH ?? 'feat/membrane-platform-mp4';

const remoteScript = `#!/bin/bash
set -euo pipefail
ENV=/etc/membrana/cabinet.env
API=https://cabinet.membrana.space

cd /root/membrana
git fetch origin ${BRANCH}
git reset --hard FETCH_HEAD
chmod +x deploy/cabinet-stack.sh
ln -sf /etc/membrana/cabinet.env packages/background-cabinet/.env.docker
./deploy/cabinet-stack.sh build
./deploy/cabinet-stack.sh up
sleep 30

PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' "$ENV" | cut -d= -f2-)
TOKEN=$(curl -fsS -X POST "$API/v1/auth/login" -H 'Content-Type: application/json' -d "{\\"login\\":\\"admin\\",\\"password\\":\\"$PASS\\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== MP5: create report ==="
REPORT=$(curl -fsS -X POST "$API/v1/telemetry/reports" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "reportKind": "fft-threshold-test/v0.2",
  "clientEntryId": "smoke-mp5-report-1",
  "moduleName": "fft-threshold-test",
  "finishedAt": "2026-06-12T12:00:00.000Z",
  "payload": {"schema":"fft-threshold-test/v0.2","isDetected":true,"passRate":0.8,"passedCount":8,"frameCount":10},
  "tags": ["analysis","detection"]
}')
echo "$REPORT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('report OK', d['report']['id'][:8])"

echo "=== MP5: list reports ==="
curl -fsS "$API/v1/telemetry/reports" -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
assert len(d['reports']) >= 1, d
print('list reports OK', len(d['reports']))
"

echo "=== MP5: live record lifecycle ==="
LIVE=$(curl -fsS -X POST "$API/v1/telemetry/live-records" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "recordKind": "fft-threshold-test",
  "clientRecordId": "smoke-mp5-live-1",
  "startedAt": "2026-06-12T12:00:00.000Z",
  "payload": {"action":"analysis_start"}
}')
LID=$(echo "$LIVE" | python3 -c "import sys,json; print(json.load(sys.stdin)['liveRecord']['id'])")
curl -fsS -X PATCH "$API/v1/telemetry/live-records/$LID" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"status":"ended"}' >/dev/null
curl -fsS "$API/v1/telemetry/live-records" -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
assert any(r.get('status')=='ended' for r in d['liveRecords']), d
print('live records OK')
"

echo "=== MP5 ALL SMOKE OK ==="
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
  readyTimeout: 60000,
});
