import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyOutcome,
  diagnosePair,
  maskKey,
  parseDotEnv,
  renderProbeTable,
  PROVIDERS,
} from './llm-probe.mjs';

test('maskKey: значение не утекает, короткие ключи полностью скрыты', () => {
  assert.equal(maskKey('sk-abcdefghijklmnop1234'), 'sk-...1234');
  assert.equal(maskKey('short'), '***');
  assert.equal(maskKey(''), '(нет)');
  assert.ok(!maskKey('sk-verysecretkey0000').includes('verysecret'));
});

test('classifyOutcome: живые классы 2026-07-13 (реальные исходы зондов)', () => {
  // DeepSeek без баланса — 402
  assert.equal(classifyOutcome({ status: 402, bodyText: 'Insufficient Balance' }), 'balance');
  // Voyage через DPI — 403 c HTML-страницей
  assert.equal(classifyOutcome({ status: 403, bodyText: '<!doctype html><meta charset="utf-8">403' }), 'blocked-html');
  // Voyage через прокси на пустое тело — 400 JSON: API жив
  assert.equal(classifyOutcome({ status: 400, bodyText: '{"detail":"not valid JSON"}' }), 'ok');
  // OpenRouter 403 security policy — JSON, не HTML
  assert.equal(classifyOutcome({ status: 403, bodyText: '{"error":"security policy"}' }), 'auth/geo');
  // Voyage rate-limit без платёжного метода
  assert.equal(classifyOutcome({ status: 429, bodyText: 'add a payment method in the billing page' }), 'balance');
  assert.equal(classifyOutcome({ status: 429, bodyText: 'slow down' }), 'rate-limit');
  assert.equal(classifyOutcome({ status: 200, bodyText: '{}' }), 'ok');
  assert.equal(classifyOutcome({ status: 411, bodyText: 'Length Required' }), 'ok');
  assert.equal(classifyOutcome({ error: 'getaddrinfo ENOTFOUND api.x.com' }), 'net');
  assert.equal(classifyOutcome({ error: 'Client network socket disconnected before TLS' }), 'tls-fail');
  assert.equal(classifyOutcome({ error: 'The operation was aborted due to timeout' }), 'timeout');
  assert.equal(classifyOutcome({ status: 500, bodyText: 'oops' }), 'http-500');
});

test('diagnosePair: DPI-паттерн — direct мёртв, via-proxy жив', () => {
  assert.equal(diagnosePair('blocked-html', 'ok'), 'dpi-block (только через прокси)');
  assert.equal(diagnosePair('tls-fail', 'balance'), 'dpi-block (только через прокси)');
  assert.equal(diagnosePair('ok', null), 'ok (прямой путь)');
  assert.equal(diagnosePair('balance', 'balance'), 'balance (пополнить счёт)');
  assert.equal(diagnosePair('auth/geo', null), 'auth/geo');
  assert.equal(diagnosePair('no-key', null), 'no-key (нет ключа в .env)');
});

test('renderProbeTable: выравнивание, статус словом, ключ замаскирован', () => {
  const rows = [
    { provider: 'deepseek', key: 'sk-...1234', direct: 'balance', viaProxy: null, diagnosis: 'balance (пополнить счёт)' },
    { provider: 'voyage', key: 'pa-...zzzz', direct: 'blocked-html', viaProxy: 'ok', diagnosis: 'dpi-block (только через прокси)' },
  ];
  const out = renderProbeTable(rows);
  const lines = out.split('\n');
  assert.equal(lines.length, 4); // header + разделитель + 2 строки
  assert.ok(lines[0].includes('provider') && lines[0].includes('diagnosis'));
  assert.ok(out.includes('(прокси не задан)'));
  assert.ok(out.includes('dpi-block'));
  assert.ok(!out.includes(String.fromCharCode(27)), 'без ANSI — статус словом');
  // выравнивание: у всех строк колонка-разделители на одинаковых позициях
  const pipeIdx = lines[0].indexOf('|');
  assert.ok(lines.slice(2).every((l) => l.indexOf('|') === pipeIdx));
});

test('parseDotEnv: имена/значения, кавычки снимаются, мусор игнорируется', () => {
  const env = parseDotEnv('A=1\n# comment\nB="two"\nbad line\nC=  spaced  ');
  assert.deepEqual(env, { A: '1', B: 'two', C: 'spaced' });
});

test('PROVIDERS: у всех минимальный запрос (max_tokens 1 / один input)', () => {
  for (const [name, spec] of Object.entries(PROVIDERS)) {
    const body = spec.body();
    if ('max_tokens' in body) assert.equal(body.max_tokens, 1, name);
    if ('input' in body) assert.equal(body.input.length, 1, name);
    assert.ok(spec.keyEnv.length >= 1, name);
  }
});
