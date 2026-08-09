import { describe, expect, it } from 'vitest';

import {
  parseStaticRegistryJsonl,
  type StaticRegistrySnapshot,
} from './index.js';

const HASH = 'c'.repeat(64);

/** Executable stand-in for an injected runtime source; it performs no filesystem reads. */
function fixtureRegistryJsonl(records: readonly Record<string, unknown>[]): string {
  return records.map((record) => JSON.stringify(record)).join('\n');
}

/** Executable stand-in for a future snapshot consumer using only the offered projection. */
function consumeSnapshotStub(snapshot: StaticRegistrySnapshot): readonly string[] {
  return snapshot.lineages.map(
    ({ canonicalRef, tip }) => `${canonicalRef} -> ${tip}`,
  );
}

function fixture(id: string, supersedes?: string): Record<string, unknown> {
  return {
    id,
    sha256: HASH,
    bytes: 8,
    addedAt: '2026-08-09',
    source: 'test-local source stub',
    location: { kind: 'local', ref: `fixtures/${id}.bin` },
    measured: { channel: { name: 'stub' } },
    ...(supersedes === undefined ? {} : { supersedes }),
  };
}

describe('static registry test-local stubs', () => {
  it('passes an immutable real parser result through the consumer stub', () => {
    const input = [fixture('stub-root'), fixture('stub-tip', 'stub-root')];
    const result = parseStaticRegistryJsonl(fixtureRegistryJsonl(input));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(consumeSnapshotStub(result.value)).toEqual([
      'urn:mmbrn:static:stub-root -> stub-tip',
    ]);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.records)).toBe(true);
    expect(Object.isFrozen(result.value.lineages)).toBe(true);
    expect(Object.isFrozen(result.value.lineages[0]?.recordIds)).toBe(true);
  });

  it('does not retain mutable source objects', () => {
    const source = fixture('detached-source');
    const result = parseStaticRegistryJsonl(fixtureRegistryJsonl([source]));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    source.id = 'mutated-source';
    const measured = source.measured as { channel: { name: string } };
    measured.channel.name = 'mutated';

    expect(result.value.records[0]?.recordId).toBe('detached-source');
    expect(result.value.records[0]?.record.measured).toEqual({ channel: { name: 'stub' } });
  });

  it('is deterministic when source rows arrive in a different order', () => {
    const root = fixture('ordered-root');
    const tip = fixture('ordered-tip', 'ordered-root');
    const forward = parseStaticRegistryJsonl(fixtureRegistryJsonl([root, tip]));
    const reverse = parseStaticRegistryJsonl(fixtureRegistryJsonl([tip, root]));

    expect(forward.ok).toBe(true);
    expect(reverse.ok).toBe(true);
    if (!forward.ok || !reverse.ok) return;
    expect(reverse.value).toEqual(forward.value);
  });
});
