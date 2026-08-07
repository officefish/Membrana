import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DreamsLog } from './lib/dreams-log.mjs';
import {
  runDreamTick,
  commitDreamTick,
  shouldFailover,
  observationOf,
  FAILOVER_OUTCOMES,
} from './lib/dreams-tick.mjs';
import { providerChain } from './lib/dreams-select.mjs';
import { OUTCOME_IDS, TRANSPORT_OUTCOMES, classifyOutcome } from './network/lib/classify.mjs';

const PROMPT = '## DREAM_MASTER_VERSION\n\n`1.0.0`\n';

/** Род, который сны присвоили бы этому ответу/исключению порта. */
const outcomeFor = (result) => classifyOutcome(observationOf(result)).outcome;

test('shouldFailover: любой не-ok род крутит кубик; ok — нет', () => {
  assert.equal(shouldFailover('billing_exhausted'), true);
  assert.equal(shouldFailover('rate_limited'), true);
  assert.equal(shouldFailover('model_removed'), true);
  assert.equal(shouldFailover('auth_missing_key'), true);
  assert.equal(shouldFailover('provider_5xx'), true);
  assert.equal(shouldFailover('ok'), false);
  assert.equal(shouldFailover('net'), false, 'старого словаря больше нет — «net» не род');
});

test('FAILOVER_OUTCOMES = OUTCOME_IDS \\ {ok} — новый род требует решения вслух', () => {
  const expected = OUTCOME_IDS.filter((id) => id !== 'ok');
  assert.deepEqual([...FAILOVER_OUTCOMES].sort(), [...expected].sort());
  for (const t of TRANSPORT_OUTCOMES) assert.ok(FAILOVER_OUTCOMES.has(t), `${t} обязан крутить кубик`);
});

// ─── живые исходы прода 07.08: три «net», оказавшиеся тремя разными родами ───
//
// Вещдок — GET office.mmbrn.tech/v1/dreams/digest/2026-08-07: 12 тиков, 12 синтезов
// через perplexity, и на каждом три отказа с detail'ами ниже. Старый классификатор
// (llm-probe.mjs:163, catch-all `return 'net'`) метил все три транспортом, и диагноз
// девять дней читался как «у office-VDS нет исходящего маршрута к LLM».

test('ключа нет в окружении → auth_missing_key, а НЕ транспорт', () => {
  assert.equal(outcomeFor({ error: 'DEEPSEEK_API_KEY missing' }), 'auth_missing_key');
});

test('HTTP 404 «модель снята» из ТЕКСТА исключения → model_removed', () => {
  // Порт бросает Error, статуса в поле нет — он внутри строки. Без извлечения
  // classifyOutcome увидел бы status=null, где живёт транспорт.
  const grok = 'OpenRouter HTTP 404: {"error":{"message":"Grok 4 Fast is deprecated. xAI recommends switching to Grok 4.3","code":404}}';
  const gemini = 'OpenRouter HTTP 404: {"error":{"message":"No endpoints found for google/gemini-2.0-flash-001.","code":404}}';
  assert.equal(outcomeFor({ error: grok }), 'model_removed');
  assert.equal(outcomeFor({ error: gemini }), 'model_removed');
});

test('транспорт остаётся транспортом: код в строке исключения распознан', () => {
  assert.equal(outcomeFor({ error: 'connect ENOTFOUND api.deepseek.com' }), 'dns_fail');
  assert.equal(outcomeFor({ error: 'The operation was aborted due to timeout' }), 'timeout_idle');
  assert.equal(
    outcomeFor({ error: 'что-то невнятное без кода и статуса' }),
    'unknown_protocol',
    'честное незнание вместо ложного «сеть»',
  );
});

test('observationOf: статус из поля важнее статуса из текста', () => {
  const o = observationOf({ status: 429, bodyText: 'HTTP 500 в тексте тела' });
  assert.equal(o.httpStatus, 429);
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
  assert.equal(ev.attempts[0].outcome, 'billing_exhausted');
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
  assert.ok(ev.attempts.every((a) => a.outcome === 'rate_limited'));
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
