/**
 * Зуб классификатора сети (#1449). Фикстуры — из ЖИВОГО замера прода 29.07:
 * ровно те отказы, которые двое суток метились как `net` и увели диагностику в туннели.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { OUTCOME_IDS, TRANSPORT_OUTCOMES, classifyOutcome, summarize } from './lib/classify.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('ВЕЩДОК 29.07: grok — модель снята, НЕ сеть', () => {
  const r = classifyOutcome({
    httpStatus: 404,
    errorText: 'Grok 4 Fast is deprecated. xAI recommends switching to Grok 4.3',
  });
  assert.equal(r.outcome, 'model_removed');
  assert.equal(r.isTransport, false, 'это метилось как net и стоило двух суток');
});

test('ВЕЩДОК 29.07: gemini — эндпоинтов нет, НЕ сеть', () => {
  const r = classifyOutcome({ httpStatus: 404, errorText: 'No endpoints found for google/gemini-2.0-flash-001.' });
  assert.equal(r.outcome, 'model_removed');
  assert.equal(r.isTransport, false);
});

test('ВЕЩДОК 29.07: perplexity — кончились кредиты, НЕ сеть', () => {
  const r = classifyOutcome({
    httpStatus: 402,
    errorText: 'This request requires more credits. You requested up to 4096 tokens, but can only afford 3505.',
  });
  assert.equal(r.outcome, 'billing_exhausted');
  assert.equal(r.isTransport, false);
});

test('ВЕЩДОК 29.07: deepseek — ключа нет, НЕ сеть и НЕ вызов', () => {
  const r = classifyOutcome({ errorText: 'DEEPSEEK_API_KEY missing' });
  assert.equal(r.outcome, 'auth_missing_key');
  assert.equal(r.isTransport, false);
});

test('ВЕЩДОК 29.07: openrouter напрямую 403 = гео, через прокси 200 = ok', () => {
  assert.equal(classifyOutcome({ httpStatus: 403, viaProxy: false }).outcome, 'geo_blocked');
  assert.equal(classifyOutcome({ httpStatus: 200, viaProxy: true }).outcome, 'ok');
});

test('ГЛАВНЫЙ ИНВАРИАНТ: есть HTTP-статус ⇒ исход НЕ транспортный', () => {
  for (const status of [200, 401, 402, 403, 404, 429, 500, 503]) {
    for (const viaProxy of [true, false]) {
      const r = classifyOutcome({ httpStatus: status, viaProxy, errorText: 'deprecated credits' });
      if (r.outcome === 'provider_unreachable_http') continue; // шлюз честно сознался
      assert.equal(r.isTransport, false, `статус ${status} не может быть транспортом`);
    }
  }
});

test('транспорт — только когда ответа НЕТ вовсе', () => {
  assert.equal(classifyOutcome({ errorCode: 'ENOTFOUND' }).outcome, 'dns_fail');
  assert.equal(classifyOutcome({ errorCode: 'ECONNREFUSED' }).outcome, 'tcp_fail');
  assert.equal(classifyOutcome({ errorCode: 'CERT_HAS_EXPIRED' }).outcome, 'tls_fail');
  assert.equal(classifyOutcome({ errorCode: 'UND_ERR_HEADERS_TIMEOUT' }).outcome, 'timeout_idle');
  for (const id of ['dns_fail', 'tcp_fail', 'tls_fail', 'timeout_idle']) {
    assert.ok(TRANSPORT_OUTCOMES.includes(id));
  }
});

test('ВЕЩДОК voyage 28.07: HTML вместо API — заглушка посредника', () => {
  const r = classifyOutcome({ httpStatus: 200, body: '<!DOCTYPE html><html><head><title>Blocked</title>' });
  assert.equal(r.outcome, 'proxy_intercept');
  assert.equal(r.isTransport, true, 'единственный транспортный исход при живом статусе');
});

test('5xx: через прокси — посредник не дошёл; напрямую — вина провайдера', () => {
  assert.equal(classifyOutcome({ httpStatus: 503, viaProxy: true }).outcome, 'provider_unreachable_http');
  assert.equal(classifyOutcome({ httpStatus: 503, viaProxy: false }).outcome, 'provider_5xx');
});

test('честное незнание не выдаёт себя ни за сеть, ни за ok', () => {
  const r = classifyOutcome({});
  assert.equal(r.outcome, 'unknown_protocol');
  assert.equal(r.isTransport, false);
  assert.equal(classifyOutcome({ httpStatus: 404, errorText: 'что-то своё' }).outcome, 'unknown_protocol');
});

test('401 ≠ 402: непринятый ключ и кончившиеся деньги — разные исходы', () => {
  assert.equal(classifyOutcome({ httpStatus: 401 }).outcome, 'auth_invalid_key');
  assert.equal(classifyOutcome({ httpStatus: 402 }).outcome, 'billing_exhausted');
  assert.equal(classifyOutcome({ httpStatus: 429 }).outcome, 'rate_limited');
});

test('сводка: тик снов 29.07 НЕ объявляется сетевым отказом', () => {
  const s = summarize([
    classifyOutcome({ httpStatus: 404, errorText: 'deprecated' }),
    classifyOutcome({ errorText: 'DEEPSEEK_API_KEY missing' }),
    classifyOutcome({ httpStatus: 402, errorText: 'credits' }),
  ]);
  assert.equal(s.networkAtFault, false, 'ровно та ошибка, что стоила двух суток');
  assert.match(s.verdict, /сеть работает/u);
});

test('сводка: настоящий сетевой отказ распознаётся', () => {
  const s = summarize([classifyOutcome({ errorCode: 'ENOTFOUND' }), classifyOutcome({ errorCode: 'ETIMEDOUT' })]);
  assert.equal(s.networkAtFault, true);
  assert.match(s.verdict, /похоже на сетевой отказ/u);
});

test('один ok среди отказов снимает подозрение с сети', () => {
  const s = summarize([classifyOutcome({ errorCode: 'ENOTFOUND' }), classifyOutcome({ httpStatus: 200 })]);
  assert.equal(s.networkAtFault, false);
});

test('перечень кода и словарь outcomes.yml не расходятся', () => {
  const yml = readFileSync(join(repoRoot, 'docs/network/outcomes.yml'), 'utf8');
  const inYml = [...yml.matchAll(/^\s{2}- id:\s*(\S+)/gmu)].map((m) => m[1]);
  assert.deepEqual([...inYml].sort(), [...OUTCOME_IDS].sort(), 'словарь и код должны совпадать поимённо');
  const ymlTransport = [...yml.matchAll(/^\s{2}- (\w+)$/gmu)].map((m) => m[1]);
  assert.deepEqual(ymlTransport.sort(), [...TRANSPORT_OUTCOMES].sort(), 'транспортное множество расходится');
});

test('у каждого исхода словаря есть фикстура в этом файле', () => {
  const self = readFileSync(new URL(import.meta.url), 'utf8');
  for (const id of OUTCOME_IDS) {
    assert.ok(self.includes(`'${id}'`), `исход ${id} не покрыт ни одним тестом`);
  }
});
