import { describe, expect, it } from 'vitest';
import {
  createStaticRegistryIndex,
  createStaticRegistryIndexFromLines,
  RegistryIndexError,
  type RegistryIndexErrorCode,
  type RegistryIndexInput,
} from '../src';
import {
  contractLineStub,
  contractRecordStub,
  type StubRegistryRecord,
} from './stubs/registry-contract.stub';
import { consumeIndexStub } from './stubs/index-consumer.stub';
import { encodeLineStub, lineDecoderStub } from './stubs/line-decoder.stub';

function expectRegistryError(
  run: () => unknown,
  code: RegistryIndexErrorCode,
  ids: readonly string[] = [],
): RegistryIndexError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(RegistryIndexError);
    const registryError = error as RegistryIndexError;
    expect(registryError.code).toBe(code);
    expect(registryError.ids).toEqual([...ids].sort());
    return registryError;
  }

  throw new Error(`Expected RegistryIndexError ${code}.`);
}

function snapshot(
  records: readonly RegistryIndexInput<StubRegistryRecord>[],
): unknown {
  const index = createStaticRegistryIndex(records);
  return {
    size: index.size,
    lineageCount: index.lineageCount,
    alpha: consumeIndexStub(index, {
      kind: 'resolve',
      canonicalRef: 'urn:mmbrn:static:alpha-1',
    }),
    beta: consumeIndexStub(index, {
      kind: 'resolve',
      canonicalRef: 'urn:mmbrn:static:beta-1',
    }),
  };
}

describe('StaticRegistryIndex', () => {
  it('rebuilds deterministically from records and injected lines', () => {
    const records = [
      ...contractLineStub('alpha-1', ['alpha-1', 'alpha-2', 'alpha-3']),
      ...contractLineStub('beta-1', ['beta-1', 'beta-2']),
    ];
    const reversed = [...records].reverse();

    expect(snapshot(records)).toEqual(snapshot(reversed));
    expect(snapshot(records)).toEqual(snapshot(records));

    const lines = [
      encodeLineStub({ id: 'alpha-3', rootId: 'alpha-1', predecessor: 'alpha-2' }),
      encodeLineStub({ id: 'beta-2', rootId: 'beta-1', predecessor: 'beta-1' }),
      encodeLineStub({ id: 'alpha-1', rootId: 'alpha-1' }),
      encodeLineStub({ id: 'beta-1', rootId: 'beta-1' }),
      encodeLineStub({ id: 'alpha-2', rootId: 'alpha-1', predecessor: 'alpha-1' }),
    ];
    const lineIndex = createStaticRegistryIndexFromLines(lines, lineDecoderStub);

    expect(consumeIndexStub(lineIndex, {
      kind: 'resolve',
      canonicalRef: 'urn:mmbrn:static:alpha-1',
    })).toEqual(consumeIndexStub(createStaticRegistryIndex(records), {
      kind: 'resolve',
      canonicalRef: 'urn:mmbrn:static:alpha-1',
    }));
  });

  it('supports exact id lookup, canonical resolution, lineage and tip reads', () => {
    const index = createStaticRegistryIndex(
      contractLineStub('root', ['root', 'middle', 'tip']),
    );

    expect(index.lookupById('middle').id).toBe('middle');
    expect(index.resolveCanonicalRef('urn:mmbrn:static:root').canonicalRef)
      .toBe('urn:mmbrn:static:root');
    expect(index.lineage('urn:mmbrn:static:root').map((record) => record.id))
      .toEqual(['root', 'middle', 'tip']);
    expect(index.tip('urn:mmbrn:static:root').id).toBe('tip');
  });

  it('fails closed for malformed and unknown query keys', () => {
    const index = createStaticRegistryIndex([contractRecordStub({ id: 'root' })]);

    expectRegistryError(() => index.lookupById(' '), 'MALFORMED_ID');
    expectRegistryError(() => index.lookupById('missing'), 'UNKNOWN_ID', ['missing']);
    expectRegistryError(
      () => index.resolveCanonicalRef('https://example.test/root'),
      'MALFORMED_CANONICAL_REF',
    );
    expectRegistryError(
      () => index.resolveCanonicalRef('urn:mmbrn:static:missing'),
      'UNKNOWN_CANONICAL_REF',
    );
  });

  it('does not merge records or lineages with equal hashes', () => {
    const sharedHash = 'sha256:equal-content';
    const index = createStaticRegistryIndex([
      contractRecordStub({ id: 'left', sha256: sharedHash }),
      contractRecordStub({ id: 'right', sha256: sharedHash }),
    ]);

    expect(index.size).toBe(2);
    expect(index.lineageCount).toBe(2);
    expect(index.lookupById('left').record.sha256).toBe(sharedHash);
    expect(index.lookupById('right').record.sha256).toBe(sharedHash);
    expect(index.resolveCanonicalRef('urn:mmbrn:static:left').tip.id).toBe('left');
    expect(index.resolveCanonicalRef('urn:mmbrn:static:right').tip.id).toBe('right');
  });

  it('rejects malformed normalized records and decoder failures', () => {
    expectRegistryError(
      () => createStaticRegistryIndex([
        { id: ' ', canonicalRef: 'urn:mmbrn:static:x', effectivePredecessor: null, record: {} },
      ] as unknown as RegistryIndexInput<StubRegistryRecord>[]),
      'MALFORMED_RECORD',
    );

    const cyclicPayload: Record<string, unknown> = {};
    cyclicPayload.self = cyclicPayload;
    expectRegistryError(
      () => createStaticRegistryIndex([
        {
          id: 'cyclic-payload',
          canonicalRef: 'urn:mmbrn:static:cyclic-payload',
          effectivePredecessor: null,
          record: cyclicPayload,
        },
      ] as unknown as RegistryIndexInput<StubRegistryRecord>[]),
      'MALFORMED_RECORD',
    );

    const decodeError = expectRegistryError(
      () => createStaticRegistryIndexFromLines(['not-json'], lineDecoderStub),
      'DECODE_FAILED',
    );
    expect(decodeError.lineNumber).toBe(1);
  });

  it('rejects a source that cannot be completely materialized', () => {
    const brokenSource: Iterable<RegistryIndexInput<StubRegistryRecord>> = {
      *[Symbol.iterator]() {
        yield contractRecordStub({ id: 'partial' });
        throw new Error('source stopped');
      },
    };

    expectRegistryError(
      () => createStaticRegistryIndex(brokenSource),
      'SOURCE_FAILED',
    );
  });

  it('rejects duplicate ids with stable evidence across input orders', () => {
    const first = contractRecordStub({ id: 'duplicate', title: 'first' });
    const second = contractRecordStub({ id: 'duplicate', title: 'second' });
    const left = expectRegistryError(
      () => createStaticRegistryIndex([first, second]),
      'DUPLICATE_ID',
      ['duplicate'],
    );
    const right = expectRegistryError(
      () => createStaticRegistryIndex([second, first]),
      'DUPLICATE_ID',
      ['duplicate'],
    );

    expect(left.message).toBe(right.message);
  });

  it('rejects dangling predecessors', () => {
    expectRegistryError(
      () => createStaticRegistryIndex([
        contractRecordStub({ id: 'child', rootId: 'missing', predecessor: 'missing' }),
      ]),
      'DANGLING_PREDECESSOR',
      ['child', 'missing'],
    );
  });

  it('rejects forks with sorted stable evidence', () => {
    expectRegistryError(
      () => createStaticRegistryIndex([
        contractRecordStub({ id: 'child-z', rootId: 'root', predecessor: 'root' }),
        contractRecordStub({ id: 'root' }),
        contractRecordStub({ id: 'child-a', rootId: 'root', predecessor: 'root' }),
      ]),
      'FORK',
      ['root', 'child-a', 'child-z'],
    );
  });

  it('rejects merge-shaped normalized input', () => {
    const merge = {
      ...contractRecordStub({ id: 'merged', rootId: 'left' }),
      effectivePredecessor: ['left', 'right'],
    };

    expectRegistryError(
      () => createStaticRegistryIndex([
        merge,
      ] as unknown as RegistryIndexInput<StubRegistryRecord>[]),
      'MERGE',
      ['merged'],
    );
  });

  it('rejects cycles with deterministically sorted ids', () => {
    expectRegistryError(
      () => createStaticRegistryIndex([
        contractRecordStub({ id: 'cycle-b', rootId: 'cycle-a', predecessor: 'cycle-a' }),
        contractRecordStub({ id: 'cycle-a', rootId: 'cycle-a', predecessor: 'cycle-b' }),
      ]),
      'CYCLE',
      ['cycle-a', 'cycle-b'],
    );
  });

  it('rejects canonical reference mismatches', () => {
    expectRegistryError(
      () => createStaticRegistryIndex([
        contractRecordStub({ id: 'root', rootId: 'wrong-root' }),
      ]),
      'CANONICAL_REF_MISMATCH',
      ['root'],
    );
  });

  it('rejects ambiguous canonical references before selecting a lineage', () => {
    expectRegistryError(
      () => createStaticRegistryIndex([
        contractRecordStub({ id: 'root-a', rootId: 'root-a' }),
        contractRecordStub({ id: 'root-b', rootId: 'root-a' }),
      ]),
      'AMBIGUOUS_CANONICAL_REF',
      ['root-a', 'root-b'],
    );
  });

  it('defensively snapshots and freezes inputs and query results', () => {
    const input = contractRecordStub({ id: 'root' });
    const mutableInput = input as unknown as {
      canonicalRef: string;
      record: {
        title: string;
        metadata: { labels: string[] };
      };
    };
    const index = createStaticRegistryIndex([input]);
    mutableInput.canonicalRef = 'urn:mmbrn:static:changed';
    mutableInput.record.title = 'changed';
    mutableInput.record.metadata.labels.push('changed');

    const record = index.lookupById('root');
    const lineage = index.lineage('urn:mmbrn:static:root');
    expect(record.canonicalRef).toBe('urn:mmbrn:static:root');
    expect(record.record.title).toBe('root');
    expect(record.record.metadata.labels).toEqual(['lineage:root']);
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.record)).toBe(true);
    expect(Object.isFrozen(record.record.metadata.labels)).toBe(true);
    expect(Object.isFrozen(lineage)).toBe(true);
    expect(Reflect.get(index, 'byId')).toBeUndefined();
    expect(Reflect.get(index, 'byCanonicalRef')).toBeUndefined();
    expect(() => {
      (record.record as unknown as { title: string }).title = 'mutation';
    }).toThrow();
    expect(() => (lineage as unknown as unknown[]).push('mutation')).toThrow();
    expect(index.lookupById('root').record.title).toBe('root');
  });
});
