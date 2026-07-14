import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDnsGate, renderGateReport, GATE_RESOLVERS } from './panel-dns-gate.mjs';

const IP = '176.124.218.4';

test('go: все резолверы согласны (порядок адресов не важен)', () => {
  const v = evaluateDnsGate([
    { resolver: '1.1.1.1', addrs: [IP, '10.0.0.1'] },
    { resolver: '8.8.8.8', addrs: ['10.0.0.1', IP] },
  ]);
  assert.equal(v.go, true);
});

test('no-go: расхождение резолверов (запись ещё расползается)', () => {
  const v = evaluateDnsGate([
    { resolver: '1.1.1.1', addrs: [IP] },
    { resolver: '8.8.8.8', addrs: ['72.56.27.58'] },
  ]);
  assert.equal(v.go, false);
  assert.ok(v.reason.includes('расходятся'));
});

test('no-go: ошибка/пустой ответ у части резолверов', () => {
  assert.equal(
    evaluateDnsGate([
      { resolver: '1.1.1.1', addrs: [IP] },
      { resolver: '8.8.8.8', error: 'ENOTFOUND' },
    ]).go,
    false,
  );
  assert.equal(
    evaluateDnsGate([
      { resolver: '1.1.1.1', addrs: [] },
      { resolver: '8.8.8.8', addrs: [IP] },
    ]).go,
    false,
  );
  assert.equal(evaluateDnsGate([]).go, false);
});

test('expect: несовпадение с IP VDS → no-go; совпадение → go', () => {
  const results = [
    { resolver: '1.1.1.1', addrs: [IP] },
    { resolver: '8.8.8.8', addrs: [IP] },
  ];
  assert.equal(evaluateDnsGate(results, '72.56.27.58').go, false);
  assert.equal(evaluateDnsGate(results, IP).go, true);
});

test('отчёт: словом [go]/[no-go], предупреждение LE только при no-go, детерминирован', () => {
  const results = [
    { resolver: '1.1.1.1', addrs: [IP] },
    { resolver: '8.8.8.8', error: 'ETIMEOUT' },
  ];
  const verdict = evaluateDnsGate(results);
  const a = renderGateReport('panel.mmbrn.tech', results, verdict);
  assert.equal(a, renderGateReport('panel.mmbrn.tech', results, verdict));
  assert.ok(a.includes('[no-go]'));
  assert.ok(a.includes('rate-limit'));
  const ok = evaluateDnsGate([{ resolver: '1.1.1.1', addrs: [IP] }]);
  assert.ok(!renderGateReport('x', [{ resolver: '1.1.1.1', addrs: [IP] }], ok).includes('rate-limit'));
});

test('минимум два независимых резолвера в конфигурации гейта', () => {
  assert.ok(GATE_RESOLVERS.length >= 2);
  assert.equal(new Set(GATE_RESOLVERS).size, GATE_RESOLVERS.length);
});
