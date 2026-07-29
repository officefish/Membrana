/**
 * Зуб витрины и предполётных кодов контейнера network (#1449).
 * Проверяем то, ради чего он заведён: контроль зелёный ⇒ сеть не виновата,
 * снимок протухает, агентский блок не носит секретов.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildProbeResult, buildSnapshot, isStale, preflightExitCode, renderAgentBlock, renderSnapshotMd } from './lib/probe-core.mjs';

const at = '2026-07-29T12:00:00.000Z';
const probe = (id, role, outcomes) =>
  buildProbeResult(
    { id, label: id, role },
    outcomes.map(([path, observation]) => ({ path, observation, latencyMs: 10 })),
  );

test('контроль зелёный ⇒ сеть НЕ виновата, что бы ни отвечали провайдеры', () => {
  const s = buildSnapshot({
    generatedAt: at,
    env: { proxyConfigured: true, proxyVars: ['HTTPS_PROXY'], host: 'h' },
    probes: [
      probe('control', 'control', [['direct', { httpStatus: 200 }]]),
      probe('openrouter', 'provider', [['direct', { httpStatus: 402, errorText: 'credits' }]]),
    ],
  });
  assert.equal(s.summary.networkAtFault, false);
  assert.match(s.summary.advice, /сеть машины исправна/u);
});

test('контроль красный ⇒ смотреть сеть машины прежде провайдеров', () => {
  const s = buildSnapshot({
    generatedAt: at,
    env: { proxyConfigured: false, proxyVars: [], host: 'h' },
    probes: [probe('control', 'control', [['direct', { errorCode: 'ENOTFOUND' }]])],
  });
  assert.equal(s.summary.networkAtFault, true);
  assert.match(s.summary.advice, /контрольная точка красная/u);
});

test('путь решает: прямой закрыт, через прокси открыт — помечается явно', () => {
  const p = probe('openrouter', 'provider', [
    ['direct', { httpStatus: 403, viaProxy: false }],
    ['proxy', { httpStatus: 200, viaProxy: true }],
  ]);
  assert.equal(p.proxyMatters, true, 'вещдок 29.07 — ровно это отличает гео от обрыва');
  assert.equal(p.outcome, 'ok', 'звено достижимо, если хоть один путь зелёный');
});

test('reachableStatuses профиля: 401 на корне без ключа — «дошли», не находка', () => {
  const p = buildProbeResult(
    { id: 'deepseek', label: 'DeepSeek', reachableStatuses: [401] },
    [{ path: 'direct', observation: { httpStatus: 401 }, latencyMs: 5 }],
  );
  assert.equal(p.outcome, 'ok');
  assert.match(p.paths[0].why, /для зонда без ключа/u);
});

test('коды возврата preflight различают сеть, ключи и деньги', () => {
  const mk = (probes) => ({ probes, summary: {} });
  assert.equal(preflightExitCode(mk([probe('a', 'control', [['direct', { httpStatus: 200 }]])])), 0);
  assert.equal(preflightExitCode(mk([probe('a', 'p', [['direct', { errorCode: 'ETIMEDOUT' }]])])), 10, 'транспорт');
  assert.equal(preflightExitCode(mk([probe('a', 'p', [['direct', { errorText: 'API_KEY missing' }]])])), 20, 'ключи');
  assert.equal(preflightExitCode(mk([probe('a', 'p', [['direct', { httpStatus: 402 }]])])), 30, 'деньги');
  assert.equal(preflightExitCode(mk([])), 2, 'нечего проверять — инструментальная');
});

test('транспорт важнее денег: если что-то не дошло вовсе, код 10', () => {
  const probes = [
    probe('a', 'p', [['direct', { httpStatus: 402 }]]),
    probe('b', 'p', [['direct', { errorCode: 'ENOTFOUND' }]]),
  ];
  assert.equal(preflightExitCode({ probes, summary: {} }), 10);
});

test('снимок старше 48 часов — воспоминание, не факт', () => {
  assert.equal(isStale({ generatedAt: at }, '2026-07-29T13:00:00.000Z'), false);
  assert.equal(isStale({ generatedAt: at }, '2026-08-01T13:00:00.000Z'), true);
  assert.equal(isStale(null, at), true, 'нет снимка — считаем протухшим, не зелёным');
});

test('агентский блок несёт правило чтения и не несёт секретов', () => {
  const s = buildSnapshot({
    generatedAt: at,
    env: { proxyConfigured: true, proxyVars: ['HTTPS_PROXY'], host: 'h' },
    probes: [probe('control', 'control', [['direct', { httpStatus: 200 }]])],
  });
  const md = renderAgentBlock(s, at);
  assert.match(md, /транспорт работает/u);
  assert.match(md, /ProxyAgent/u, 'грабля голого fetch названа');
  assert.doesNotMatch(md, /https?:\/\/[^\s)]*:\d+/u, 'адрес прокси со значением не печатается');
  assert.match(renderSnapshotMd(s, at), /Сетевое окружение — снимок/u);
});

test('витрина честно помечает протухший снимок', () => {
  const s = buildSnapshot({ generatedAt: at, env: { proxyConfigured: false, proxyVars: [], host: 'h' }, probes: [] });
  assert.match(renderSnapshotMd(s, '2026-08-05T00:00:00.000Z'), /УСТАРЕЛ/u);
});
