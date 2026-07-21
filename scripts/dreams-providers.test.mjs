import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DREAM_PROVIDERS } from './lib/dreams-select.mjs';
import {
  DREAM_PROVIDER_ROUTES,
  providerUnavailableResult,
  routeDreamProvider,
} from './lib/dreams-providers.mjs';

test('каждый DREAM_PROVIDERS имеет маршрут', () => {
  for (const p of DREAM_PROVIDERS) {
    const r = routeDreamProvider(p);
    assert.ok(r, `missing route for ${p}`);
    assert.ok(r.channel === 'deepseek' || r.channel === 'openrouter');
  }
  assert.equal(DREAM_PROVIDERS.length, Object.keys(DREAM_PROVIDER_ROUTES).length);
});

test('providerUnavailableResult → ok:false status 503 (failover-friendly)', () => {
  const r = providerUnavailableResult('grok', 'OPENROUTER_API_KEY missing');
  assert.equal(r.ok, false);
  assert.equal(r.status, 503);
  assert.match(r.bodyText, /grok/);
});
