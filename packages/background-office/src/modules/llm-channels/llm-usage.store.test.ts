import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { LlmUsageStore, RETENTION_DAYS } from './llm-usage.store';
import type { UsageEventDto } from './llm-channels.dto';

function storeWithVol(vol: string) {
  return new LlmUsageStore({
    LLM_USAGE_VOLUME_PATH: vol,
  } as never);
}

function ev(partial: Partial<UsageEventDto> & { eventId: string; ts: string }): UsageEventDto {
  return {
    procedureId: 'code-review',
    provider: 'anthropic',
    model: 'm',
    source: 'default',
    tokensIn: null,
    tokensOut: null,
    latencyMs: 10,
    ok: true,
    ...partial,
  };
}

describe('LlmUsageStore', () => {
  it('ingest + dedupe by eventId', () => {
    const vol = mkdtempSync(join(tmpdir(), 'llm-usage-'));
    const store = storeWithVol(vol);
    const e = ev({ eventId: 'e1', ts: '2026-07-23T10:00:00.000Z' });
    expect(store.ingest(e)).toEqual({ ok: true, duplicate: false });
    expect(store.ingest(e)).toEqual({ ok: true, duplicate: true });
    const lines = readFileSync(join(vol, '2026-07-23.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
  });

  it('aggregateDay sums tokens nullable-aware', () => {
    const vol = mkdtempSync(join(tmpdir(), 'llm-usage-'));
    const store = storeWithVol(vol);
    store.ingest(
      ev({
        eventId: 'a',
        ts: '2026-07-23T10:00:00.000Z',
        tokensIn: 3,
        tokensOut: 7,
        ok: true,
      }),
    );
    store.ingest(
      ev({
        eventId: 'b',
        ts: '2026-07-23T11:00:00.000Z',
        provider: 'openrouter',
        tokensIn: null,
        tokensOut: 2,
        ok: false,
        errorClass: 'rate_limit',
      }),
    );
    const day = store.aggregateDay('2026-07-23');
    expect(day.count).toBe(2);
    expect(day.okCount).toBe(1);
    expect(day.failCount).toBe(1);
    expect(day.tokensIn).toBe(3);
    expect(day.tokensOut).toBe(9);
    expect(day.byProvider.openrouter.failCount).toBe(1);
  });

  it(`prune removes files older than ${RETENTION_DAYS}d`, () => {
    const vol = mkdtempSync(join(tmpdir(), 'llm-usage-'));
    mkdirSync(vol, { recursive: true });
    writeFileSync(join(vol, '2020-01-01.jsonl'), '{}\n');
    writeFileSync(join(vol, '2026-07-23.jsonl'), '{}\n');
    const store = storeWithVol(vol);
    const removed = store.prune(new Date('2026-07-23T12:00:00.000Z'));
    expect(removed).toBe(1);
  });
});
