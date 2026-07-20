import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DreamsLog } from './lib/dreams-log.mjs';
import { runDreamTick, commitDreamTick, shouldFailover } from './lib/dreams-tick.mjs';
import { providerChain } from './lib/dreams-select.mjs';

const PROMPT = '## DREAM_MASTER_VERSION\n\n`1.0.0`\n';

test('shouldFailover: balance/auth/rate-limit → да; ok → нет', () => {
  assert.equal(shouldFailover('balance'), true);
  assert.equal(shouldFailover('auth/geo'), true);
  assert.equal(shouldFailover('rate-limit'), true);
  assert.equal(shouldFailover('ok'), false);
  assert.equal(shouldFailover('http-500'), true);
});

test('runDreamTick: нет пары → skipped', async () => {
  const ev = await runDreamTick({
    day: '2026-07-20',
    hour: 2,
    pair: null,
    promptMd: PROMPT,
    synthesize: async () => ({ ok: true, text: 'nope' }),
  });
  assert.equal(ev.status, 'skipped');
  assert.equal(ev.version, '1.0.0');
});

test('runDreamTick: failover по balance → следующий провайдер; успех = synthesized', async () => {
  const seed = '2026-07-20|h4|t1+t2';
  const chain = providerChain(seed);
  let calls = 0;
  const ev = await runDreamTick({
    day: '2026-07-20',
    hour: 4,
    pair: ['t1', 't2'],
    promptMd: PROMPT,
    seed,
    synthesize: async (provider) => {
      calls += 1;
      if (provider === chain[0]) {
        return { ok: false, status: 402, bodyText: 'Insufficient Balance' };
      }
      return { ok: true, text: `сон от ${provider}`, score: 0.7 };
    },
  });
  assert.equal(ev.status, 'synthesized');
  assert.equal(ev.provider, chain[1]);
  assert.equal(ev.attempts.length, 2);
  assert.equal(ev.attempts[0].outcome, 'balance');
  assert.equal(calls, 2);
});

test('runDreamTick: все провайдеры упали → synthesisFailed, attempts=|P|', async () => {
  const ev = await runDreamTick({
    day: '2026-07-20',
    hour: 8,
    pair: ['x', 'y'],
    promptMd: PROMPT,
    seed: 'fail-all',
    synthesize: async () => ({ ok: false, status: 429, bodyText: 'slow down' }),
  });
  assert.equal(ev.status, 'synthesisFailed');
  assert.equal(ev.attempts.length, 4);
  assert.ok(ev.attempts.every((a) => a.outcome === 'rate-limit'));
});

test('commitDreamTick: слот уже есть → не залп', async () => {
  const log = new DreamsLog();
  const input = {
    day: '2026-07-20',
    hour: 6,
    pair: ['a', 'b'],
    promptMd: PROMPT,
    synthesize: async () => ({ ok: true, text: 'one', score: 0.5 }),
  };
  assert.equal((await commitDreamTick(log, input)).ok, true);
  const second = await commitDreamTick(log, input);
  assert.equal(second.ok, false);
  assert.equal(second.skipped, true);
  assert.equal(log.readDay('2026-07-20').length, 1);
});
