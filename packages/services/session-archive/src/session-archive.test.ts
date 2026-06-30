import { describe, it, expect } from 'vitest';
import { parseClaudeCodeJSONL } from './parse-claude-code-jsonl.js';
import { scrubSecrets } from './scrub-secrets.js';
import { computeTurnHash } from './compute-turn-hash.js';
import { deduplicateTurns } from './deduplicate-turns.js';
import { SECRET_REDACTION_PLACEHOLDER } from '@membrana/core';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_JSONL = [
  JSON.stringify({
    uuid: 'turn-1',
    sessionId: 'sess-abc',
    message: { role: 'user', content: 'Hello, please use key sk-ant-api03-XXXX1234567890abcdef' },
    timestamp: '2026-06-30T10:00:00.000Z',
  }),
  JSON.stringify({
    uuid: 'turn-2',
    sessionId: 'sess-abc',
    message: { role: 'assistant', content: 'Sure, I will help.' },
    timestamp: '2026-06-30T10:00:01.000Z',
  }),
  // Дубликат turn-2 (другой uuid, тот же контент)
  JSON.stringify({
    uuid: 'turn-2b',
    sessionId: 'sess-abc',
    message: { role: 'assistant', content: 'Sure, I will help.' },
    timestamp: '2026-06-30T10:00:01.000Z',
  }),
  'not-valid-json',
  '',
].join('\n');

// ---------------------------------------------------------------------------
// parseClaudeCodeJSONL
// ---------------------------------------------------------------------------

describe('parseClaudeCodeJSONL', () => {
  it('parses valid lines, skips invalid and empty', () => {
    const turns = parseClaudeCodeJSONL(Buffer.from(SAMPLE_JSONL));
    // 3 valid lines (дубликат тоже парсится, дедуп — отдельный шаг)
    expect(turns).toHaveLength(3);
  });

  it('preserves role, timestamp and content', () => {
    const turns = parseClaudeCodeJSONL(Buffer.from(SAMPLE_JSONL));
    expect(turns[0]!.role).toBe('user');
    expect(turns[0]!.timestamp).toBe('2026-06-30T10:00:00.000Z');
    expect(turns[0]!.content).toContain('sk-ant-api03');
  });
});

// ---------------------------------------------------------------------------
// scrubSecrets
// ---------------------------------------------------------------------------

describe('scrubSecrets', () => {
  it('redacts sk-ant- key', () => {
    const turn = parseClaudeCodeJSONL(Buffer.from(SAMPLE_JSONL))[0]!;
    const scrubbed = scrubSecrets(turn);
    expect(scrubbed.content).not.toContain('sk-ant-api03');
    expect(scrubbed.content).toContain(SECRET_REDACTION_PLACEHOLDER);
    expect(scrubbed.wasRedacted).toBe(true);
  });

  it('does not mark clean turn as redacted', () => {
    const turn = parseClaudeCodeJSONL(Buffer.from(SAMPLE_JSONL))[1]!;
    const scrubbed = scrubSecrets(turn);
    expect(scrubbed.wasRedacted).toBeUndefined();
    expect(scrubbed.content).toBe('Sure, I will help.');
  });

  it('redacts ghp_ token', () => {
    const turn = {
      uuid: 't',
      sessionId: 's',
      role: 'user',
      timestamp: '2026-01-01T00:00:00.000Z',
      content: 'token: ghp_abcdefghijklmnopqrstuvwxyz1234567890',
    };
    const scrubbed = scrubSecrets(turn);
    expect(scrubbed.content).not.toContain('ghp_');
    expect(scrubbed.wasRedacted).toBe(true);
  });

  it('redacts lin_api_ token', () => {
    const turn = {
      uuid: 't',
      sessionId: 's',
      role: 'user',
      timestamp: '2026-01-01T00:00:00.000Z',
      content: 'export LINEAR_KEY=lin_api_abcdefghijklmnopqrstuvwxyzABCDEFGHIJ',
    };
    const scrubbed = scrubSecrets(turn);
    expect(scrubbed.content).not.toContain('lin_api_');
    expect(scrubbed.wasRedacted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeTurnHash
// ---------------------------------------------------------------------------

describe('computeTurnHash', () => {
  it('is deterministic for same input', () => {
    const turn = {
      uuid: 'x',
      sessionId: 'y',
      role: 'assistant',
      timestamp: '2026-01-01T00:00:00.000Z',
      content: 'hello',
    };
    expect(computeTurnHash(turn)).toBe(computeTurnHash(turn));
  });

  it('differs when content differs', () => {
    const base = {
      uuid: 'x',
      sessionId: 'y',
      role: 'user',
      timestamp: '2026-01-01T00:00:00.000Z',
      content: 'hello',
    };
    const other = { ...base, content: 'world' };
    expect(computeTurnHash(base)).not.toBe(computeTurnHash(other));
  });

  it('does not depend on uuid or sessionId', () => {
    const base = {
      uuid: 'uuid-1',
      sessionId: 'sess-1',
      role: 'user',
      timestamp: '2026-01-01T00:00:00.000Z',
      content: 'hello',
    };
    const other = { ...base, uuid: 'uuid-99', sessionId: 'sess-99' };
    expect(computeTurnHash(base)).toBe(computeTurnHash(other));
  });
});

// ---------------------------------------------------------------------------
// deduplicateTurns
// ---------------------------------------------------------------------------

describe('deduplicateTurns', () => {
  it('removes exact duplicates', () => {
    const turns = parseClaudeCodeJSONL(Buffer.from(SAMPLE_JSONL));
    const scrubbed = turns.map((t) => scrubSecrets(t));
    const deduped = deduplicateTurns(scrubbed);
    // turn-2 и turn-2b — дубликаты → должна остаться одна запись
    expect(deduped).toHaveLength(2);
  });

  it('keeps unique turns untouched', () => {
    const t1 = { uuid: 'a', sessionId: 's', role: 'user', timestamp: '2026-01-01T00:00:01.000Z', content: 'foo' };
    const t2 = { uuid: 'b', sessionId: 's', role: 'user', timestamp: '2026-01-01T00:00:02.000Z', content: 'bar' };
    expect(deduplicateTurns([t1, t2])).toHaveLength(2);
  });

  it('handles empty array', () => {
    expect(deduplicateTurns([])).toEqual([]);
  });
});
