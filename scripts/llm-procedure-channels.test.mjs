import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  runProcedureChain,
} from './lib/llm-procedure-chain.mjs';
import {
  buildUsageEvent,
  emitUsage,
  isUsageEmitEnabled,
  usageEventProblems,
} from './lib/llm-procedure-emit.mjs';
import {
  loadProcedureDefaults,
  loadProcedureRegistry,
  loadProviderCatalog,
  procedureDefaultsProblems,
  procedureRegistryProblems,
  providerCatalogProblems,
  V1_PROCEDURE_IDS,
} from './lib/llm-procedure-registry.mjs';
import { resolveEffective } from './lib/llm-procedure-resolve.mjs';
import {
  buildProviderRequest,
  classifyTransportError,
  callProvider,
  parseProviderResponse,
} from './lib/llm-procedure-transport.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

test('git registry: v1 ids + entryMjs exist', () => {
  const reg = loadProcedureRegistry();
  const problems = procedureRegistryProblems(reg, {
    fileExists: (rel) => existsSync(join(REPO, rel)),
  });
  assert.deepEqual(problems, []);
  for (const id of V1_PROCEDURE_IDS) {
    assert.ok(reg.procedures.some((p) => p.id === id && p.meters === true));
  }
});

test('defaults + catalog: clean for ritual enum', () => {
  const defaults = loadProcedureDefaults();
  const catalog = loadProviderCatalog();
  assert.deepEqual(procedureDefaultsProblems(defaults, { ritualEnum: catalog.ritualEnum }), []);
  assert.deepEqual(providerCatalogProblems(catalog), []);
  assert.deepEqual(catalog.ritualEnum, ['anthropic', 'openrouter']);
});

test('resolveEffective: overlay wins; else default + source', () => {
  const registry = {
    procedures: [
      { id: 'code-review', entryMjs: 'scripts/code-review.mjs', meters: true },
    ],
  };
  const defaults = {
    'code-review': { chain: [{ provider: 'anthropic', model: 'm-default' }] },
  };

  const fromDefault = resolveEffective('code-review', {
    registry,
    defaults,
    overlay: null,
  });
  assert.equal(fromDefault.source, 'default');
  assert.equal(fromDefault.chain[0].model, 'm-default');

  const fromOverlay = resolveEffective('code-review', {
    registry,
    defaults,
    overlay: {
      'code-review': { chain: [{ provider: 'openrouter', model: 'm-over' }] },
    },
  });
  assert.equal(fromOverlay.source, 'overlay');
  assert.equal(fromOverlay.chain[0].provider, 'openrouter');
  assert.equal(fromOverlay.chain[0].model, 'm-over');
});

test('resolveEffective: empty overlay falls back to default', () => {
  const e = resolveEffective('consilium', {
    registry: loadProcedureRegistry(),
    defaults: loadProcedureDefaults(),
    overlay: { consilium: { chain: [] } },
  });
  assert.equal(e.source, 'default');
  assert.ok(e.chain.length >= 1);
});

test('resolveEffective: builtin-fail when no chain', () => {
  assert.throws(
    () =>
      resolveEffective('ghost', {
        registry: { procedures: [{ id: 'ghost', entryMjs: 'x', meters: false }] },
        defaults: {},
        overlay: null,
      }),
    /builtin-fail|нет chain/,
  );
});

test('classifyTransportError: rate_limit / auth', () => {
  assert.equal(classifyTransportError(429), 'rate_limit');
  assert.equal(classifyTransportError(401), 'auth');
  assert.equal(classifyTransportError(400, 'usage limit reached'), 'rate_limit');
});

test('buildProviderRequest: anthropic + openrouter shapes', () => {
  const catalog = loadProviderCatalog();
  const a = buildProviderRequest({
    provider: 'anthropic',
    model: 'claude-x',
    prompt: 'hi',
    apiKey: 'sk-a',
    catalog,
  });
  assert.match(a.url, /api\.anthropic\.com/);
  assert.equal(a.headers['x-api-key'], 'sk-a');
  assert.equal(a.bodyJson.model, 'claude-x');

  const o = buildProviderRequest({
    provider: 'openrouter',
    model: 'meta/x',
    prompt: 'hi',
    apiKey: 'sk-o',
    catalog,
  });
  assert.match(o.url, /openrouter\.ai/);
  assert.match(o.headers.authorization, /^Bearer sk-o/);
  assert.equal(o.bodyJson.messages[0].content, 'hi');
});

test('parseProviderResponse: tokens nullable', () => {
  const a = parseProviderResponse(
    'anthropic',
    JSON.stringify({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 3, output_tokens: 7 },
    }),
  );
  assert.equal(a.text, 'ok');
  assert.equal(a.tokensIn, 3);
  assert.equal(a.tokensOut, 7);

  const bare = parseProviderResponse('openai-compatible', JSON.stringify({ choices: [{ message: { content: 'x' } }] }));
  assert.equal(bare.text, 'x');
  assert.equal(bare.tokensIn, null);
  assert.equal(bare.tokensOut, null);
});

test('callProvider: injectable postFn', async () => {
  const r = await callProvider({
    provider: 'anthropic',
    model: 'm',
    prompt: 'p',
    apiKey: 'k',
    catalog: loadProviderCatalog(),
    postFn: async () => ({
      ok: true,
      status: 200,
      text: JSON.stringify({
        content: [{ type: 'text', text: 'done' }],
        usage: { input_tokens: 1, output_tokens: 2 },
      }),
    }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.text, 'done');
  assert.equal(r.tokensIn, 1);
});

test('emitUsage: opt-out + forbid prompt fields + POST', async () => {
  assert.equal(isUsageEmitEnabled({ LLM_USAGE_EMIT: '0' }), false);
  const off = await emitUsage(
    buildUsageEvent({
      procedureId: 'code-review',
      provider: 'anthropic',
      model: 'm',
      source: 'default',
      latencyMs: 1,
      ok: true,
    }),
    { env: { LLM_USAGE_EMIT: '0' } },
  );
  assert.equal(off.reason, 'opt-out');

  const bad = usageEventProblems({
    eventId: '1',
    ts: new Date().toISOString(),
    procedureId: 'code-review',
    provider: 'anthropic',
    model: 'm',
    source: 'default',
    latencyMs: 1,
    ok: true,
    prompt: 'SECRET',
  });
  assert.ok(bad.some((p) => p.includes('prompt')));

  let posted = null;
  const ok = await emitUsage(
    buildUsageEvent({
      procedureId: 'code-review',
      provider: 'openrouter',
      model: 'm',
      source: 'default',
      latencyMs: 5,
      ok: true,
      tokensIn: null,
      tokensOut: 2,
    }),
    {
      env: { LLM_USAGE_EMIT: '1', OFFICE_BASE_URL: 'http://office.test' },
      token: 'tok',
      fetchImpl: async (url, init) => {
        posted = { url, init };
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, duplicate: false }),
        };
      },
    },
  );
  assert.equal(ok.emitted, true);
  assert.equal(ok.reason, 'ok');
  assert.equal(posted.url, 'http://office.test/v1/llm-usage/events');
  assert.equal(posted.init.headers['x-membrana-token'], 'tok');
  const body = JSON.parse(posted.init.body);
  assert.equal(body.tokensIn, null);
  assert.equal('prompt' in body, false);
});

test('runProcedureChain: failover + emit per attempt + STOP', async () => {
  const emitted = [];
  const effective = {
    procedureId: 'code-review',
    source: 'default',
    meters: true,
    entryMjs: 'scripts/code-review.mjs',
    chain: [
      { provider: 'anthropic', model: 'a' },
      { provider: 'openrouter', model: 'b' },
    ],
  };

  const ok = await runProcedureChain({
    effective,
    prompt: 'x',
    invokeAttempt: async ({ attemptIndex }) => {
      if (attemptIndex === 0) {
        return { ok: false, errorClass: 'rate_limit', latencyMs: 10 };
      }
      return { ok: true, text: 'from-or', latencyMs: 20, tokensIn: null, tokensOut: 5 };
    },
    emit: async (ev) => {
      emitted.push(ev);
      return { emitted: false, reason: 'stub' };
    },
  });

  assert.equal(ok.ok, true);
  assert.equal(ok.provider, 'openrouter');
  assert.equal(ok.text, 'from-or');
  assert.equal(ok.attempts, 2);
  assert.equal(emitted.length, 2);
  assert.equal(emitted[0].ok, false);
  assert.equal(emitted[0].errorClass, 'rate_limit');
  assert.equal(emitted[1].ok, true);
  assert.equal(emitted[1].tokensOut, 5);
  assert.equal(emitted[1].tokensIn, null);

  const stop = await runProcedureChain({
    effective,
    prompt: 'x',
    invokeAttempt: async () => ({ ok: false, errorClass: 'auth', latencyMs: 1 }),
    emit: async () => ({ emitted: false, reason: 'stub' }),
  });
  assert.equal(stop.ok, false);
  assert.equal(stop.attempts, 2);
  assert.equal(stop.errorClass, 'auth');
});

test('schema file present (Phase A must)', () => {
  assert.ok(existsSync(join(REPO, 'scripts/lib/llm-procedure-schema.json')));
});

test('normalizeMessages: anthropic blocks → openai strings', async () => {
  const { normalizeMessages } = await import('./lib/llm-procedure-transport.mjs');
  const turns = normalizeMessages(
    [
      { role: 'user', content: [{ type: 'text', text: 'q' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'a' }] },
    ],
    undefined,
    'openai-compatible',
  );
  assert.deepEqual(turns, [
    { role: 'user', content: 'q' },
    { role: 'assistant', content: 'a' },
  ]);
});

test('ritual module does not import experimental/', async () => {
  const { readFileSync } = await import('node:fs');
  const importRe = /from\s+['"][^'"]*experimental\//;
  for (const rel of [
    'scripts/lib/llm-procedure-ritual.mjs',
    'scripts/code-review.mjs',
    'scripts/consilium.mjs',
  ]) {
    const src = readFileSync(join(REPO, rel), 'utf8');
    assert.equal(importRe.test(src), false, `${rel} must not import experimental/ (X1)`);
  }
});
