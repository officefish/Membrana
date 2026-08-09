import { describe, expect, it } from 'vitest';

import {
  LEGACY_EFFECTIVE_PREDECESSORS,
  parseStaticRegistryJsonl,
  type StaticRegistryErrorCode,
} from './index.js';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function record(
  id: string,
  options: { sha256?: string; supersedes?: unknown } = {},
): Record<string, unknown> {
  return {
    id,
    sha256: options.sha256 ?? HASH_A,
    bytes: 100,
    addedAt: '2026-08-09',
    source: `fixture ${id}`,
    location: { kind: 'local', ref: `fixtures/${id}.bin` },
    ...(Object.hasOwn(options, 'supersedes') ? { supersedes: options.supersedes } : {}),
  };
}

function jsonl(...records: readonly Record<string, unknown>[]): string {
  return records.map((item) => JSON.stringify(item)).join('\n');
}

function expectCode(source: string, code: StaticRegistryErrorCode): void {
  const result = parseStaticRegistryJsonl(source);
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.errors.map((item) => item.code)).toContain(code);
  expect('value' in result).toBe(false);
}

describe('static registry lineage snapshot', () => {
  it('uses exactly four named legacy fallbacks to derive three lines', () => {
    const result = parseStaticRegistryJsonl(jsonl(
      record('ozon-receipt-3765-field-kit'),
      record('ozon-receipt-3765-field-kit-r2'),
      record('day-memo-2026-07-28'),
      record('day-memo-2026-07-28-r2', { sha256: HASH_B }),
      record('bpla-guidance-methodology-partner'),
      record('bpla-guidance-methodology-partner-r2'),
      record('bpla-guidance-methodology-partner-r3'),
    ));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(LEGACY_EFFECTIVE_PREDECESSORS).toEqual({
      'ozon-receipt-3765-field-kit-r2': 'ozon-receipt-3765-field-kit',
      'day-memo-2026-07-28-r2': 'day-memo-2026-07-28',
      'bpla-guidance-methodology-partner-r2': 'bpla-guidance-methodology-partner',
      'bpla-guidance-methodology-partner-r3': 'bpla-guidance-methodology-partner-r2',
    });
    expect(result.value.lineages).toEqual([
      {
        rootId: 'bpla-guidance-methodology-partner',
        canonicalRef: 'urn:mmbrn:static:bpla-guidance-methodology-partner',
        recordIds: [
          'bpla-guidance-methodology-partner',
          'bpla-guidance-methodology-partner-r2',
          'bpla-guidance-methodology-partner-r3',
        ],
        tip: 'bpla-guidance-methodology-partner-r3',
      },
      {
        rootId: 'day-memo-2026-07-28',
        canonicalRef: 'urn:mmbrn:static:day-memo-2026-07-28',
        recordIds: ['day-memo-2026-07-28', 'day-memo-2026-07-28-r2'],
        tip: 'day-memo-2026-07-28-r2',
      },
      {
        rootId: 'ozon-receipt-3765-field-kit',
        canonicalRef: 'urn:mmbrn:static:ozon-receipt-3765-field-kit',
        recordIds: ['ozon-receipt-3765-field-kit', 'ozon-receipt-3765-field-kit-r2'],
        tip: 'ozon-receipt-3765-field-kit-r2',
      },
    ]);
  });

  it('gives explicit supersedes priority and does not infer arbitrary -rN links', () => {
    const result = parseStaticRegistryJsonl(jsonl(
      record('unrelated-root'),
      record('ozon-receipt-3765-field-kit-r2', { supersedes: 'unrelated-root' }),
      record('ordinary-record-r9'),
    ));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const legacy = result.value.records.find(
      (entry) => entry.recordId === 'ozon-receipt-3765-field-kit-r2',
    );
    const arbitrary = result.value.records.find((entry) => entry.recordId === 'ordinary-record-r9');
    expect(legacy?.effectivePredecessor).toBe('unrelated-root');
    expect(legacy?.rootId).toBe('unrelated-root');
    expect(arbitrary?.effectivePredecessor).toBeNull();
    expect(arbitrary?.canonicalRef).toBe('urn:mmbrn:static:ordinary-record-r9');
  });

  it('does not treat inherited object property names as legacy fallbacks', () => {
    const result = parseStaticRegistryJsonl(jsonl(record('constructor')));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.records[0]?.effectivePredecessor).toBeNull();
    expect(result.value.records[0]?.canonicalRef).toBe('urn:mmbrn:static:constructor');
  });

  it('keeps equal hashes as separate record and lineage identities', () => {
    const result = parseStaticRegistryJsonl(jsonl(
      record('same-bytes-one'),
      record('same-bytes-two'),
    ));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.records).toHaveLength(2);
    expect(result.value.lineages.map((lineage) => lineage.rootId)).toEqual([
      'same-bytes-one',
      'same-bytes-two',
    ]);
    expect(result.value.lineages.map((lineage) => lineage.canonicalRef)).toEqual([
      'urn:mmbrn:static:same-bytes-one',
      'urn:mmbrn:static:same-bytes-two',
    ]);
  });

  it('rejects duplicate ids', () => {
    expectCode(jsonl(record('duplicate-id'), record('duplicate-id')), 'duplicate-id');
  });

  it('rejects dangling predecessors', () => {
    expectCode(jsonl(record('dangling-child', { supersedes: 'missing-parent' })), 'dangling-predecessor');
  });

  it('rejects forks', () => {
    expectCode(jsonl(
      record('fork-parent'),
      record('fork-child-a', { supersedes: 'fork-parent' }),
      record('fork-child-b', { supersedes: 'fork-parent' }),
    ), 'fork');
  });

  it('rejects merge-shaped records', () => {
    expectCode(jsonl(
      record('merge-parent-a'),
      record('merge-parent-b'),
      record('merge-child', { supersedes: ['merge-parent-a', 'merge-parent-b'] }),
    ), 'merge');
  });

  it('rejects cycles including self-cycles', () => {
    expectCode(jsonl(
      record('cycle-one', { supersedes: 'cycle-two' }),
      record('cycle-two', { supersedes: 'cycle-one' }),
    ), 'cycle');
    expectCode(jsonl(record('cycle-self', { supersedes: 'cycle-self' })), 'cycle');
  });

  it('fails the whole source for malformed JSON or an empty registry', () => {
    expectCode(`${JSON.stringify(record('valid-row'))}\n{broken`, 'invalid-json');
    expectCode('\n  \n', 'invalid-record');
  });
});
