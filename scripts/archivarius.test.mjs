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
