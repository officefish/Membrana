#!/usr/bin/env node
/**
 * Prod smoke: TJ6 live journal — unified journal-items API + live track/report rows.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const BRANCH = process.env.MEMBRANA_DEPLOY_BRANCH ?? 'feat/telemetry-journal-live-tj6';

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

echo "=== TJ6: create live track (TelemetryLiveRecord / telemetry-track/v1) ==="
curl -fsS -X POST "$API/v1/telemetry/live-records" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "recordKind": "telemetry-track/v1",
  "clientRecordId": "smoke-tj6-track-1",
  "moduleId": "microphone",
  "startedAt": "2026-06-15T12:00:00.000Z",
  "payload": {
    "item": {
      "schema": "telemetry-track/v1",
      "trackId": "smoke-track-1",
      "sampleId": "smoke-sample-1",
      "title": "smoke-mic-auto-5s",
      "durationSec": 5,
      "sampleRate": 48000,
      "captureMode": "auto",
      "createdAtIso": "2026-06-15T12:00:00.000Z"
    },
    "moduleName": "microphone",
    "tags": ["live", "track"]
  }
}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('track row OK', d['liveRecord']['id'][:8])"

echo "=== TJ6: create drone report ==="
curl -fsS -X POST "$API/v1/telemetry/reports" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "reportKind": "drone-detection-report/v1",
  "clientEntryId": "smoke-tj6-report-1",
  "moduleId": "microphone",
  "moduleName": "microphone",
  "finishedAt": "2026-06-15T12:00:05.000Z",
  "payload": {
    "schema": "drone-detection-report/v1",
    "reportId": "smoke-rep-1",
    "trackId": "smoke-track-1",
    "isDetected": true,
    "summaryText": "TJ6 smoke detection",
    "payload": {}
  },
  "tags": ["live", "report", "detection"]
}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('report row OK', d['report']['id'][:8])"

echo "=== TJ6: unified journal-items ==="
curl -fsS "$API/v1/telemetry/journal-items?limit=50" -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('items',[])
kinds={i.get('kind') for i in items}
assert 'track' in kinds, items
assert 'report' in kinds, items
det=[i for i in items if i.get('kind')=='report' and i.get('report',{}).get('isDetected')]
assert len(det) >= 1, items
print('journal-items OK', len(items), 'items', 'kinds', sorted(kinds))
"

echo "=== TJ6 ALL SMOKE OK ==="
curl -sk -o /dev/null -w "cabinet SPA: %{http_code}\\n" https://cabinet.membrana.space/
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
  readyTimeout: 120000,
});
