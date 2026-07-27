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
