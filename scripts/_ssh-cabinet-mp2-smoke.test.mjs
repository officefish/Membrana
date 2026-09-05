import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCabinetMp2RemoteScript,
  imageTariffGridVerdict,
  pairInvalidKeyVerdict,
  tariffsNoSessionVerdict,
} from './lib/cabinet-mp2-smoke.mjs';

test('tariffs no-session: only exact 401 is green; yesterday 503 is red', () => {
  assert.equal(tariffsNoSessionVerdict(401).ok, true);

  const corrupted = tariffsNoSessionVerdict(503);
  assert.equal(corrupted.ok, false);
  assert.match(corrupted.reason, /expected exact 401, got 503/u);

  assert.equal(tariffsNoSessionVerdict(200).ok, false);
  assert.equal(tariffsNoSessionVerdict(404).ok, false);
});

test('pair invalid-key: domain refusal is green, transport 400 and 5xx are red', () => {
  assert.equal(pairInvalidKeyVerdict({ status: 401, body: '' }).ok, true);
  assert.equal(pairInvalidKeyVerdict({ status: 404, body: '' }).ok, true);
  assert.equal(pairInvalidKeyVerdict({ status: 200, body: '{"ok":false,"reason":"invalid-key"}' }).ok, true);

  const emptyBodyTransport = pairInvalidKeyVerdict({
    status: 400,
    body: '{"statusCode":400,"message":"Body cannot be empty"}',
  });
  assert.equal(emptyBodyTransport.ok, false);
  assert.match(emptyBodyTransport.reason, /transport 400/u);

  assert.equal(pairInvalidKeyVerdict({ status: 503, body: 'Service Unavailable' }).ok, false);
  assert.equal(pairInvalidKeyVerdict({ status: 200, body: '{"ok":true}' }).ok, false);
  assert.equal(pairInvalidKeyVerdict({ status: 200, body: 'not json' }).ok, false);
});

test('runtime image tariff grid: missing file corruption is red', () => {
  assert.equal(imageTariffGridVerdict(0).ok, true);

  const missingGrid = imageTariffGridVerdict(1);
  assert.equal(missingGrid.ok, false);
  assert.match(missingGrid.reason, /tariff grid missing/u);
});

test('remote smoke checks tariffs, invalid pair body and image grid before final pass', () => {
  const script = buildCabinetMp2RemoteScript({
    api: 'https://example.test',
    container: 'cabinet-api',
    tariffGridPath: '/app/docs/tariffs/tariff-grid.json',
    invalidPairAccessKey: 'bad-key',
  });

  assert.match(script, /curl -skS -o "\$TARIFFS_BODY" -w "%\{http_code\}" "\$API\/v1\/tariffs"/u);
  assert.match(script, /\[ "\$TARIFFS_CODE" != "401" \]/u);
  assert.match(script, /curl -skS -o "\$PAIR_BODY" -w "%\{http_code\}" -X POST "\$API\/v1\/pair"/u);
  assert.match(script, /-H 'Content-Type: application\/json' -d '\{"accessKey":"bad-key","clientLabel":"deploy-smoke-invalid-key"\}'/u);
  assert.match(script, /got transport 400/u);
  assert.match(script, /\.\/deploy\/cabinet-stack\.sh ps -q "\$CABINET_API_CONTAINER"/u);
  assert.match(script, /docker exec "\$CABINET_API_CONTAINER" test -f "\$TARIFF_GRID_IN_IMAGE_PATH"/u);

  const health = script.indexOf('=== MP1 health ===');
  const tariffs = script.indexOf('=== MP2 tariffs no session ===');
  const pair = script.indexOf('=== MP2 pair invalid key ===');
  const grid = script.indexOf('=== MP2 image tariff grid ===');
  const login = script.indexOf('=== MP1 login + me ===');
  const pass = script.indexOf('=== ALL MP2 SMOKE OK ===');
  assert.ok(health >= 0 && health < tariffs);
  assert.ok(tariffs < pair);
  assert.ok(pair < grid);
  assert.ok(grid < login);
  assert.ok(login < pass);
});
