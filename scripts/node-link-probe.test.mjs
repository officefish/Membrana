import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_HEARTBEAT_SEC,
  DEFAULT_MINUTES,
  parseProbeArgs,
  resolveDefaultWsUrl,
  summarizeProbe,
} from './node-link-probe.mjs';

test('parseProbeArgs: дефолты и разбор флагов', () => {
  const def = parseProbeArgs([]);
  assert.equal(def.minutes, DEFAULT_MINUTES);
  assert.equal(def.heartbeatSec, DEFAULT_HEARTBEAT_SEC);

  const parsed = parseProbeArgs([
    '--device-id', 'dev-1',
    '--token', 'tok',
    '--minutes', '5',
    '--heartbeat-sec', '10',
    '--url', 'wss://example/v1/nodes/realtime',
  ]);
  assert.equal(parsed.deviceId, 'dev-1');
  assert.equal(parsed.token, 'tok');
  assert.equal(parsed.minutes, 5);
  assert.equal(parsed.heartbeatSec, 10);
  assert.equal(parsed.url, 'wss://example/v1/nodes/realtime');

  // мусор в числах → дефолты
  const junk = parseProbeArgs(['--minutes', 'abc', '--heartbeat-sec', '-5']);
  assert.equal(junk.minutes, DEFAULT_MINUTES);
  assert.equal(junk.heartbeatSec, DEFAULT_HEARTBEAT_SEC);
});

test('resolveDefaultWsUrl: wss из VITE_CABINET_API_URL репо', () => {
  const url = resolveDefaultWsUrl();
  assert.ok(url, 'env-файлы репо должны дать URL');
  assert.match(url, /^wss:\/\//);
  assert.match(url, /\/v1\/nodes\/realtime$/);
});

test('summarizeProbe: без разрывов → УСТОЙЧИВО, uptime ~100%', () => {
  const t0 = 1_000_000;
  const s = summarizeProbe([{ type: 'open', at: t0 + 100 }], t0, t0 + 60_000);
  assert.equal(s.drops, 0);
  assert.ok(s.uptimePct > 99);
  assert.match(s.verdict, /УСТОЙЧИВО/);
});

test('summarizeProbe: разрывы 1006 → вердикт СЕТЬ/ПРОКСИ', () => {
  const t0 = 0;
  const events = [
    { type: 'open', at: 0 },
    { type: 'close', at: 30_000, code: 1006 },
    { type: 'open', at: 32_000 },
    { type: 'close', at: 62_000, code: 1006 },
    { type: 'open', at: 64_000 },
  ];
  const s = summarizeProbe(events, t0, 90_000);
  assert.equal(s.drops, 2);
  assert.equal(s.codeCounts['1006'], 2);
  assert.match(s.verdict, /СЕТЬ\/ПРОКСИ/);
  assert.equal(s.longestStableMs, 30_000);
});

test('summarizeProbe: 4401 → вердикт AUTH', () => {
  const events = [
    { type: 'open', at: 0 },
    { type: 'close', at: 1_000, code: 4401 },
  ];
  const s = summarizeProbe(events, 0, 10_000);
  assert.match(s.verdict, /AUTH/);
});

test('summarizeProbe: сокет не открылся → НЕТ СОЕДИНЕНИЯ', () => {
  const s = summarizeProbe([{ type: 'error', at: 5 }], 0, 10_000);
  assert.match(s.verdict, /НЕТ СОЕДИНЕНИЯ/);
});
