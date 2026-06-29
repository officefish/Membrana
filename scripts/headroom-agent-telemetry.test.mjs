import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createHeadroomTelemetryEvent,
  eventsFromHeadroomPerfReport,
  formatHeadroomTelemetryMarkdown,
  redactHeadroomTelemetry,
  summarizeHeadroomTelemetry,
} from './lib/headroom-agent-telemetry.mjs';

test('creates codex telemetry events with normalized fields', () => {
  const event = createHeadroomTelemetryEvent({
    client: 'Codex',
    workflow: 'task-closure-review',
    phase: 'NB1',
    transform: 'PromptTemplateApply',
    duration_ms: 12,
    cache_hit: true,
    tokens_before: 1000,
    tokens_after: 820,
  });

  assert.equal(event.client, 'codex');
  assert.equal(event.durationMs, 12);
  assert.equal(event.cacheHit, true);
  assert.equal(event.inputTokens, 1000);
  assert.equal(event.outputTokens, 820);
});

test('redacts secrets before telemetry is cached or summarized', () => {
  const redacted = redactHeadroomTelemetry({
    OPENAI_API_KEY: 'sk-secret-value',
    nested: {
      Authorization: 'Bearer abcdefghijklmnop',
      note: 'safe',
    },
  });

  assert.equal(redacted.OPENAI_API_KEY, '<redacted>');
  assert.equal(redacted.nested.Authorization, '<redacted>');
  assert.equal(redacted.nested.note, 'safe');
});

test('summarizes telemetry by client without attributing unknown events to codex', () => {
  const summary = summarizeHeadroomTelemetry([
    { client: 'codex', transform: 'TokenCounter', cacheHit: true, inputTokens: 100, outputTokens: 80, durationMs: 10 },
    { client: 'claude-code', transform: 'FileSystemSync', cacheHit: false, inputTokens: 200, outputTokens: 150, durationMs: 20 },
    { transform: 'legacy', inputTokens: 50, outputTokens: 50, durationMs: 5 },
  ]);

  assert.deepEqual(summary.clients.map((row) => row.client), ['claude-code', 'codex', 'unknown']);
  assert.equal(summary.clients.find((row) => row.client === 'codex')?.savingsPct, 20);
  assert.equal(summary.clients.find((row) => row.client === 'unknown')?.requests, 1);
});

test('legacy headroom perf report becomes unknown client telemetry unless labeled', () => {
  const events = eventsFromHeadroomPerfReport({
    meta: { phase: 'baseline-synthetic' },
    headroom_perf: {
      total_requests: 10,
      total_tokens_before: 1200,
      total_tokens_after: 1200,
      tokens_saved: 0,
      savings_pct: 0,
      cache_hit_pct: 0,
      overhead_ms: { average: 54 },
      by_transform: [{ transform: 'content_router', uses: 10, tokens_before: 1029, tokens_saved: 0, savings_pct: 0 }],
    },
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].client, 'unknown');
  assert.equal(events[0].transform, 'content_router');
});

test('markdown report separates unmeasured operational work', () => {
  const markdown = formatHeadroomTelemetryMarkdown(
    summarizeHeadroomTelemetry(
      [{ client: 'codex', transform: 'PromptTemplateApply', inputTokens: 10, outputTokens: 8 }],
      [{ client: 'codex', summary: 'PR merge performed outside Headroom telemetry' }],
    ),
  );

  assert.match(markdown, /\| codex \|/);
  assert.match(markdown, /Operational work not measured by Headroom/);
  assert.match(markdown, /PR merge performed outside Headroom telemetry/);
});
