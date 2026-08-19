import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULTS, ENV_KEYS, POLL_OUTCOMES, buildResultMeta, classifyPoll, envCandidates, nextDelay, parseArgs, parseEnv, validateTask,
} from './firebat-poller.mjs';

const ENV_OK = 'VITE_MEDIA_SERVER_URL=https://media.example/\nFIELD_NODE_DEVICE_ID=dev-1\nFIELD_NODE_KEY=abc\n';

test('словарь исходов закрыт и совпадает с сервером: ok | stale_key | backoff', () => {
  assert.deepEqual([...POLL_OUTCOMES], ['ok', 'stale_key', 'backoff']);
});

test('parseEnv: три ключа узла обязательны, служебный токен — ЗАПРЕЩЁН (ADR-0027 Р3)', () => {
  const cfg = parseEnv(ENV_OK);
  assert.equal(cfg.base, 'https://media.example', 'хвостовой слэш снимается');
  assert.equal(cfg.pollMs, DEFAULTS.pollMs);
  assert.equal(cfg.rate, 48_000, 'узел пишет 48 кГц в заводском режиме карты');
  assert.throws(() => parseEnv('VITE_MEDIA_SERVER_URL=x\n'), /FIELD_NODE_DEVICE_ID, FIELD_NODE_KEY/u);
  assert.throws(() => parseEnv(`${ENV_OK}VITE_MEDIA_API_TOKEN=secret\n`), /служебный токен/u);
  assert.ok(!ENV_KEYS.includes('VITE_MEDIA_API_TOKEN'));
  assert.throws(() => parseEnv(`${ENV_OK}FIELD_NODE_POLL_MS=10\n`), /FIELD_NODE_POLL_MS/u);
});

test('classifyPoll: 401 → stale_key; backoff в теле → backoff с retryAfterMs; ok → задание или пусто; прочее — транспорт, не исход', () => {
  assert.deepEqual(classifyPoll(401, null), { outcome: 'stale_key' });
  assert.deepEqual(classifyPoll(200, { outcome: 'backoff', retryAfterMs: 2000 }), { outcome: 'backoff', retryAfterMs: 2000 });
  assert.deepEqual(classifyPoll(200, { outcome: 'backoff' }), { outcome: 'backoff', retryAfterMs: DEFAULTS.pollMs }, 'без числа — штатный период');
  assert.deepEqual(classifyPoll(200, { outcome: 'ok', task: null }), { outcome: 'ok', task: null });
  assert.equal(classifyPoll(200, { outcome: 'ok', task: { taskId: 't1' } }).task.taskId, 't1');
  assert.equal(classifyPoll(503, null).outcome, 'transport_error');
  assert.equal(classifyPoll(200, { outcome: 'retry' }).outcome, 'transport_error', 'синоним вне словаря — не исход');
});

test('nextDelay: backoff — сколько сказал сервер (с потолком); транспорт — удвоение; ok — штатный период', () => {
  assert.equal(nextDelay(5000, { outcome: 'backoff', retryAfterMs: 9000 }, 5000), 9000);
  assert.equal(nextDelay(5000, { outcome: 'backoff', retryAfterMs: 999_999 }, 5000), DEFAULTS.maxBackoffMs);
  assert.equal(nextDelay(5000, { outcome: 'transport_error', status: 0 }, 5000), 10_000);
  assert.equal(nextDelay(40_000, { outcome: 'transport_error', status: 0 }, 5000), DEFAULTS.maxBackoffMs);
  assert.equal(nextDelay(60_000, { outcome: 'ok', task: null }, 5000), 5000);
});

test('validateTask: capture без seconds/collectionId — словом; неизвестный вид — словом', () => {
  assert.equal(validateTask({ kind: 'capture', seconds: 5, collectionId: 'c' }), null);
  assert.match(validateTask({ kind: 'capture', collectionId: 'c' }), /seconds/u);
  assert.match(validateTask({ kind: 'capture', seconds: 5 }), /collectionId/u);
  assert.equal(validateTask({ kind: 'diagnostics' }), null);
  assert.match(validateTask({ kind: 'dance' }), /неизвестный вид/u);
  assert.match(validateTask(null), /пустое/u);
});

test('buildResultMeta: объявленное из задания уходит словом, измеряемых полей нет (#1950)', () => {
  const meta = buildResultMeta({ taskId: 't1', declared: { what: 'drone', distance: 50 } }, 'stamp');
  assert.equal(meta.class, 'drone');
  assert.match(meta.notes, /задание t1; what: drone; distance: 50/u);
  for (const f of ['durationSec', 'sampleRate', 'channels', 'audioFormat', 'sizeBytes']) assert.ok(!(f in meta), f);
  assert.equal(buildResultMeta({ taskId: 't2' }, 's').class, 'field');
});

test('parseArgs и envCandidates: --once/--dry-run; .env рядом со скриптом первым', () => {
  assert.deepEqual(parseArgs(['--once', '--dry-run']), { once: true, dryRun: true, help: false });
  assert.throws(() => parseArgs(['--нет']), /неизвестный флаг/u);
  const list = envCandidates('file:///C:/membrana-node/firebat-poller.mjs').map((u) => u.pathname);
  assert.match(list[0], /\/membrana-node\/\.env$/u);
});
