import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyNetDiag, formatNetDiagSummary } from './lib/net-diag.mjs';

const base = {
  tcpConnect: true,
  bannerReceived: true,
  smallPing: true,
  largePingDF: true,
  icmpLossPct: 3,
  fullTcpExchange: true,
};

test('ok — полный обмен проходит', () => {
  assert.equal(classifyNetDiag(base).verdict, 'ok');
});

test('unreachable — нет TCP-connect', () => {
  assert.equal(classifyNetDiag({ ...base, tcpConnect: false }).verdict, 'unreachable');
});

test('tcp-data-filter — маршрут/ICMP чисты, крупный DF ОК, но полный обмен виснет (кейс office-vds)', () => {
  const v = classifyNetDiag({ ...base, fullTcpExchange: false });
  assert.equal(v.verdict, 'tcp-data-filter');
  assert.match(v.reason, /stateful/);
});

test('pmtu-blackhole — малый пинг ОК, крупный DF FAIL', () => {
  const v = classifyNetDiag({ ...base, fullTcpExchange: false, largePingDF: false });
  assert.equal(v.verdict, 'pmtu-blackhole');
});

test('packet-loss — высокая потеря ICMP', () => {
  const v = classifyNetDiag({ ...base, fullTcpExchange: false, icmpLossPct: 40 });
  assert.equal(v.verdict, 'packet-loss');
});

test('приоритет: pmtu важнее packet-loss при крупном DF FAIL', () => {
  const v = classifyNetDiag({ ...base, fullTcpExchange: false, largePingDF: false, icmpLossPct: 40 });
  assert.equal(v.verdict, 'pmtu-blackhole');
});

test('formatNetDiagSummary содержит вердикт и пробы', () => {
  const p = { ...base, fullTcpExchange: false };
  const s = formatNetDiagSummary({ ip: '1.2.3.4', port: 22 }, p, classifyNetDiag(p));
  assert.match(s, /net:diag 1\.2\.3\.4:22/);
  assert.match(s, /ВЕРДИКТ: tcp-data-filter/);
  assert.match(s, /Полный TCP-обмен.*FAIL/);
});
