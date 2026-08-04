import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditSpans,
  decomposeSpans,
  ingestJsonlText,
  inspectSession,
  searchSpans,
  sessionIdFromRolloutName,
  sha256Utf8,
  spanAddress,
} from './lib/archivarius.mjs';

test('archivarius ingest yields addressable spans and masks secret lines', () => {
  const token = `sk-${'a'.repeat(48)}`;
  const input = [
    JSON.stringify({ sessionId: 's1', uuid: 'u1', timestamp: '2026-07-27T10:00:00.000Z', role: 'user', type: 'message', text: 'hello' }),
    JSON.stringify({ sessionId: 's1', uuid: 'u2', timestamp: '2026-07-27T10:01:00.000Z', role: 'assistant', type: 'message', token }),
  ].join('\n');

  const { spans, summary } = ingestJsonlText(input, { sourcePath: 'sample.jsonl', ingestTs: '2026-07-27T10:02:00.000Z' });

  assert.equal(spans.length, 2);
  assert.equal(summary.maskedLines, 1);
  assert.equal(spanAddress(spans[0]), 'span://s1/u1');
  assert.equal(spans[0].sha256, sha256Utf8(spans[0].bytes));
  assert.equal(spans[1].masked, true);
  assert.match(spans[1].bytes, /секрет вырезан|""/u);
  assert.doesNotMatch(spans[1].bytes, new RegExp(token));
});

test('archivarius audit/decompose/inspect/search keep the honest shape', () => {
  const { spans } = ingestJsonlText([
    JSON.stringify({ sessionId: 's1', uuid: 'u1', ts: '2026-07-27T10:00:00.000Z', actor: 'owner', type: 'input', text: 'alpha' }),
    JSON.stringify({ sessionId: 's2', uuid: 'u2', ts: '2026-07-28T10:00:00.000Z', actor: 'codex', type: 'reply', text: 'beta' }),
  ].join('\n'));

  assert.equal(auditSpans(spans).ok, true);
  assert.deepEqual(decomposeSpans(spans, 'actors').map((row) => row.key), ['codex', 'owner']);
  assert.equal(inspectSession(spans, 's1').spans, 1);
  assert.equal(searchSpans(spans, { text: 'beta', actor: 'codex' }).length, 1);
  assert.equal(searchSpans(spans, { from: '2026-07-28T00:00:00.000Z' }).length, 1);
});

test('archivarius ingest читает Codex-конверты: session_meta даёт тред, payload — роль', () => {
  const input = [
    JSON.stringify({ timestamp: '2026-07-27T04:34:55.693Z', type: 'session_meta', payload: { session_id: 'codex-parent', id: 'codex-thread', cwd: 'C:\\practice\\Membrana' } }),
    JSON.stringify({ timestamp: '2026-07-27T04:35:18.314Z', type: 'response_item', payload: { type: 'message', id: 'msg_1', role: 'user', content: [{ type: 'input_text', text: 'На каком ты делеве?' }] } }),
    JSON.stringify({ timestamp: '2026-07-27T04:35:22.334Z', type: 'event_msg', payload: { type: 'user_message', message: 'На каком ты делеве?\n' } }),
    JSON.stringify({ timestamp: '2026-07-27T04:35:27.674Z', type: 'event_msg', payload: { type: 'agent_message', message: 'смотрю ветку по факту' } }),
    JSON.stringify({ timestamp: '2026-07-27T04:36:00.000Z', type: 'response_item', payload: { type: 'message', id: 'msg_2', role: 'assistant', content: [{ type: 'output_text', text: 'я на ветке main' }] } }),
    // resume-повтор session_meta не должен дать duplicate-address
    JSON.stringify({ timestamp: '2026-07-27T06:03:31.438Z', type: 'session_meta', payload: { session_id: 'codex-parent', id: 'codex-thread' } }),
  ].join('\n');

  const { spans } = ingestJsonlText(input, { sourcePath: 'rollout.jsonl', ingestTs: '2026-07-27T10:00:00.000Z' });

  assert.deepEqual([...new Set(spans.map((span) => span.sessionId))], ['codex-thread']);
  assert.equal(spans[1].uuid, 'msg_1');
  assert.equal(spans[1].actor, 'user');
  assert.equal(spans[1].replyType, 'message');
  assert.equal(spans[1].ts, '2026-07-27T04:35:18.314Z');
  assert.equal(spans[2].actor, 'user'); // event_msg/user_message — голос владельца
  assert.equal(spans[2].replyType, 'user_message');
  assert.equal(spans[3].actor, 'assistant'); // agent_message без поля role
  assert.equal(spans[4].actor, 'assistant');
  assert.equal(auditSpans(spans).ok, true, JSON.stringify(auditSpans(spans).findings));
  assert.equal(searchSpans(spans, { text: 'делеве', actor: 'user' }).length, 2);
});

test('archivarius ingest читает Cursor-записи: ts из тега <timestamp>, actor из role', () => {
  const line = JSON.stringify({
    role: 'user',
    message: { content: [{ type: 'text', text: '<timestamp>Wednesday, Jul 22, 2026, 7:30 PM (UTC+3)</timestamp>\n<user_query>\nпривет из Cursor\n</user_query>' }] },
  });

  const { spans } = ingestJsonlText(line, { defaultSessionId: 'ec290f46-5bd6-4f70-860a-4e069c64c474', ingestTs: '2026-07-27T10:00:00.000Z' });

  assert.equal(spans[0].sessionId, 'ec290f46-5bd6-4f70-860a-4e069c64c474');
  assert.equal(spans[0].actor, 'user');
  assert.equal(spans[0].replyType, 'user');
  assert.equal(spans[0].ts, '2026-07-22T16:30:00.000Z');
});

test('sessionIdFromRolloutName вынимает uuid треда из имени rollout-файла', () => {
  assert.equal(
    sessionIdFromRolloutName('rollout-2026-07-27T07-34-38-019fa1da-7c93-7033-b24b-535965a63570'),
    '019fa1da-7c93-7033-b24b-535965a63570',
  );
  assert.equal(sessionIdFromRolloutName('s1'), null);
});

test('archivarius CLI ingest writes span JSONL', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'archivarius-'));
  try {
    const input = join(dir, 'session.jsonl');
    const out = join(dir, 'spans.jsonl');
    writeFileSync(input, `${JSON.stringify({ sessionId: 's-cli', uuid: 'u-cli', ts: '2026-07-27T11:00:00.000Z', role: 'user', text: 'cli' })}\n`, 'utf8');
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync(process.execPath, ['scripts/archivarius.mjs', 'ingest', '--file', input, '--out', out], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const rows = readFileSync(out, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(rows[0].sessionId, 's-cli');
    assert.equal(rows[0].uuid, 'u-cli');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Тракт scan → extract → ingest (блок cli-office-client-and-tract, 04.08) ─────
import { batchSpans, buildPushReport, withRetry } from './lib/archivarius.mjs';
import { extractStep, ingestStep, runTract, scanStep } from './archivarius-push.mjs';

test('batchSpans режет под потолок API и отвергает кривой размер', () => {
  const spans = Array.from({ length: 5 }, (_, i) => ({ i }));
  assert.deepEqual(batchSpans(spans, 2).map((b) => b.length), [2, 2, 1]);
  assert.deepEqual(batchSpans([], 10), []);
  assert.throws(() => batchSpans(spans, 0), /вне 1\.\.10000/u);
  assert.throws(() => batchSpans(spans, 10_001), /вне 1\.\.10000/u);
});

test('withRetry повторяет с бэкофом и отдаёт последнюю ошибку честно', async () => {
  const delays = [];
  let calls = 0;
  const ok = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error('transient');
      return 'ok';
    },
    { attempts: 3, backoffMs: 10, sleep: async (ms) => void delays.push(ms) },
  );
  assert.equal(ok, 'ok');
  assert.deepEqual(delays, [10, 20], 'бэкоф растёт по номеру попытки');
  await assert.rejects(
    withRetry(async () => { throw new Error('dead'); }, { attempts: 2, sleep: async () => {} }),
    /dead/u,
  );
});

test('тракт: scan читает источники, extract читает выход scan, ingest шлёт батчами выход extract', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'archivarius-tract-'));
  const line = (uuid, text) => JSON.stringify({ uuid, timestamp: '2026-08-04T10:00:00.000Z', type: 'user', message: { content: text } });
  writeFileSync(join(dir, 'aaa-session.jsonl'), `${line('u1', 'hello')}\n${line('u2', 'world')}\n`, 'utf8');
  writeFileSync(join(dir, 'bbb-session.jsonl'), `${line('u3', 'third')}\n`, 'utf8');
  writeFileSync(join(dir, 'note.txt'), 'не jsonl — в scan не попадает', 'utf8');

  const files = await scanStep([dir]);
  assert.equal(files.length, 2, 'scan берёт только .jsonl');

  const { spans } = extractStep(files);
  assert.equal(spans.length, 3, 'extract читает ровно список scan');

  const posted = [];
  const fakeFetch = async (url, init) => {
    posted.push({ url, spans: JSON.parse(init.body).spans.length, token: init.headers['x-membrana-token'] });
    return { ok: true, json: async () => ({ accepted: JSON.parse(init.body).spans.length, maskedLines: 0 }) };
  };
  const report = await runTract({
    sources: [dir],
    batchSize: 2,
    dryRun: false,
    baseUrl: 'https://office.test/',
    token: 'tkn',
    fetchImpl: fakeFetch,
    sleep: async () => {},
  });
  assert.deepEqual(posted.map((p) => p.spans), [2, 1], 'батчи по потолку --batch');
  assert.ok(posted.every((p) => p.url === 'https://office.test/v1/archivarius/ingest' && p.token === 'tkn'));
  assert.deepEqual(report, { files: 2, spans: 3, maskedLines: 0, batches: 2, accepted: 3, dryRun: false });
  rmSync(dir, { recursive: true, force: true });
});

test('тракт --dry-run не касается сети; отчёт не несёт bytes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'archivarius-dry-'));
  writeFileSync(join(dir, 's.jsonl'), `${JSON.stringify({ uuid: 'u1', timestamp: '2026-08-04T10:00:00.000Z', type: 'user', message: { content: 'secret text' } })}\n`, 'utf8');
  const report = await runTract({
    sources: [dir],
    batchSize: 100,
    dryRun: true,
    baseUrl: 'https://office.test',
    token: null,
    fetchImpl: async () => { throw new Error('сеть в dry-run запрещена'); },
  });
  assert.deepEqual(report, { files: 1, spans: 1, maskedLines: 0, batches: 0, accepted: 0, dryRun: true });
  assert.ok(!JSON.stringify(report).includes('secret text'), 'отчёт — счётчики, не содержимое');
  rmSync(dir, { recursive: true, force: true });
});

test('ingestStep: отказ office после повторов — честная ошибка с номером батча', async () => {
  await assert.rejects(
    ingestStep([{ a: 1 }], {
      baseUrl: 'https://office.test',
      token: 't',
      batchSize: 1,
      fetchImpl: async () => ({ ok: false, status: 503 }),
      sleep: async () => {},
    }),
    /HTTP 503 на батче 1\/1/u,
  );
});

test('buildPushReport нормализует счётчики и не выдумывает полей', () => {
  assert.deepEqual(
    buildPushReport({ files: '2', spans: 3, maskedLines: null, batches: 1, accepted: 3, dryRun: 0 }),
    { files: 2, spans: 3, maskedLines: 0, batches: 1, accepted: 3, dryRun: false },
  );
});
