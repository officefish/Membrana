import assert from 'node:assert/strict';
import test from 'node:test';

import { ASK_PROCEDURE_ID, runAskPersonaLlm } from './ask-persona.mjs';

test('runAskPersonaLlm uses procedure chain and succeeds on fallback provider', async () => {
  const lines = [];
  const run = await runAskPersonaLlm({
    prompt: 'ping',
    log: (line) => lines.push(line),
    invoke: async ({ procedureId, prompt, maxTokens, onAttempt }) => {
      assert.equal(procedureId, ASK_PROCEDURE_ID);
      assert.equal(prompt, 'ping');
      assert.equal(maxTokens, 4096);
      onAttempt({ provider: 'anthropic', model: 'claude-haiku-4-5-20251001', attemptIndex: 0, ok: false, errorClass: 'rate_limit' });
      onAttempt({ provider: 'xai', model: 'grok-4.5', attemptIndex: 1, ok: true });
      return { ok: true, text: 'pong', provider: 'xai', model: 'grok-4.5', source: 'default', attempts: 2 };
    },
  });

  assert.equal(run.exitCode, 0);
  assert.equal(run.answer, 'pong');
  assert.equal(run.provider, 'xai');
  assert.ok(lines.some((line) => /anthropic\/claude-haiku-4-5-20251001 failed: rate_limit/.test(line)));
  assert.ok(lines.some((line) => /ask → xai\/grok-4\.5/.test(line)));
});

test('runAskPersonaLlm returns failure when chain is exhausted', async () => {
  const lines = [];
  const run = await runAskPersonaLlm({
    prompt: 'ping',
    log: (line) => lines.push(line),
    invoke: async ({ onAttempt }) => {
      onAttempt({ provider: 'anthropic', model: 'm1', attemptIndex: 0, ok: false, errorClass: 'rate_limit' });
      onAttempt({ provider: 'deepseek', model: 'deepseek-chat', attemptIndex: 1, ok: false, errorClass: 'auth' });
      return { ok: false, attempts: 2, errorClass: 'auth', provider: 'deepseek', model: 'deepseek-chat', source: 'default' };
    },
  });

  assert.equal(run.exitCode, 1);
  assert.equal(run.answer, '');
  assert.ok(lines.some((line) => /цепочка исчерпана для ask/.test(line)));
});
