import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CREDIT_FALLBACKS, isCreditExhausted } from './_anthropic-env.mjs';

test('isCreditExhausted: живое тело ошибки 2026-07-14 распознаётся', () => {
  const live =
    '{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."}}';
  assert.equal(isCreditExhausted(live), true);
  assert.equal(isCreditExhausted('{"error":"security policy"}'), false);
  assert.equal(isCreditExhausted(null), false);
});

test('CREDIT_FALLBACKS: единая подсказка перечисляет фолбэк каждого инструмента', () => {
  for (const tool of ['consilium', 'insight review', 'code-review', 'task:review:run', 'team-evening-feedback']) {
    assert.ok(CREDIT_FALLBACKS.includes(tool), tool);
  }
  assert.ok(!/\[/.test(CREDIT_FALLBACKS), 'без ANSI — статус словом');
});
