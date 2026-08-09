import { RegistryIndexError, type RegistryIndexErrorCode } from './errors';
import type {
  DeepReadonly,
  IndexedRegistryRecord,
  RegistryIndexInput,
  RegistryLineDecoder,
  RegistryLineage,
  RegistryRecordPayload,
  RegistryValue,
} from './types';

export const STATIC_REGISTRY_CANONICAL_PREFIX = 'urn:mmbrn:static:';

const MAX_ID_LENGTH = 512;
const SAFE_ID = /^[^\s\x00-\x1f\x7f]+$/u;
const INDEX_CONSTRUCTION_TOKEN = Symbol('StaticRegistryIndex construction');

interface ErrorOptions {
  readonly ids?: readonly string[];
  readonly lineNumber?: number;
}

interface BuiltRegistryIndex<TRecord extends RegistryRecordPayload> {
  readonly byId: ReadonlyMap<string, IndexedRegistryRecord<TRecord>>;
  readonly byCanonicalRef: ReadonlyMap<string, RegistryLineage<TRecord>>;
}

function fail(
  code: RegistryIndexErrorCode,
  message: string,
  options: ErrorOptions = {},
): never {
  throw new RegistryIndexError(code, message, options);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecordId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH &&
    value === value.trim() &&
    SAFE_ID.test(value)
  );
}

function isCanonicalRef(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith(STATIC_REGISTRY_CANONICAL_PREFIX) &&
    isRecordId(value.slice(STATIC_REGISTRY_CANONICAL_PREFIX.length))
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function cloneRegistryValue(
  value: unknown,
  ancestors: WeakSet<object>,
): RegistryValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      fail('MALFORMED_RECORD', 'Registry record payload must be acyclic JSON data.');
    }

    ancestors.add(value);
    const clone = value.map((item) => cloneRegistryValue(item, ancestors));
    ancestors.delete(value);
    return Object.freeze(clone);
  }

  if (isPlainObject(value)) {
    if (ancestors.has(value)) {
      fail('MALFORMED_RECORD', 'Registry record payload must be acyclic JSON data.');
    }

    ancestors.add(value);
    const entries = Object.keys(value)
      .sort()
      .map(
        (key) =>
          [key, cloneRegistryValue(value[key], ancestors)] as const,
      );
    ancestors.delete(value);
    return Object.freeze(Object.fromEntries(entries));
  }

  fail('MALFORMED_RECORD', 'Registry record payload must contain only JSON data.');
}

function normalizeInput<TRecord extends RegistryRecordPayload>(
  value: unknown,
): IndexedRegistryRecord<TRecord> {
  if (!isPlainObject(value) || !isRecordId(value.id)) {
    fail('MALFORMED_RECORD', 'Registry source contains a malformed normalized record.');
  }

  const id = value.id;
  const predecessor = value.effectivePredecessor;

  if (Array.isArray(predecessor) && predecessor.length > 1) {
    fail('MERGE', `Registry record ${id} has multiple effective predecessors.`, {
      ids: [id],
    });
  }

  if (predecessor !== null && !isRecordId(predecessor)) {
    fail('MALFORMED_RECORD', 'Registry source contains a malformed normalized record.', {
      ids: [id],
    });
  }

  if (!isCanonicalRef(value.canonicalRef) || !isPlainObject(value.record)) {
    fail('MALFORMED_RECORD', 'Registry source contains a malformed normalized record.', {
      ids: [id],
    });
  }

  const record = cloneRegistryValue(
    value.record,
    new WeakSet<object>(),
  ) as DeepReadonly<TRecord>;

  return Object.freeze({
    id,
    canonicalRef: value.canonicalRef,
    effectivePredecessor: predecessor,
    record,
  });
}

function materialize(source: Iterable<unknown>): readonly unknown[] {
  try {
    return [...source];
  } catch {
    fail('SOURCE_FAILED', 'Injected registry source could not be materialized.');
  }
}

function detectCycles<TRecord extends RegistryRecordPayload>(
  records: readonly IndexedRegistryRecord<TRecord>[],
  byId: ReadonlyMap<string, IndexedRegistryRecord<TRecord>>,
): void {
  const done = new Set<string>();

  for (const start of records) {
    if (done.has(start.id)) {
      continue;
    }

    const path: string[] = [];
    const positions = new Map<string, number>();
    let current: IndexedRegistryRecord<TRecord> | undefined = start;

    while (current !== undefined && !done.has(current.id)) {
      const cycleStart = positions.get(current.id);
      if (cycleStart !== undefined) {
        const cycleIds = path.slice(cycleStart).sort();
        fail('CYCLE', `Registry lineage contains a cycle: ${cycleIds.join(', ')}.`, {
          ids: cycleIds,
        });
      }

      positions.set(current.id, path.length);
      path.push(current.id);
      current = current.effectivePredecessor === null
        ? undefined
        : byId.get(current.effectivePredecessor);
    }

    for (const id of path) {
      done.add(id);
    }
  }
}

function buildIndexData<TRecord extends RegistryRecordPayload>(
  source: Iterable<RegistryIndexInput<TRecord>>,
): BuiltRegistryIndex<TRecord> {
  const records = materialize(source)
    .map((value) => {
      try {
        return normalizeInput<TRecord>(value);
      } catch (error) {
        if (error instanceof RegistryIndexError) {
          throw error;
        }
        fail('MALFORMED_RECORD', 'Registry source contains a malformed normalized record.');
      }
    })
    .sort((left, right) => compareStrings(left.id, right.id));
  const byId = new Map<string, IndexedRegistryRecord<TRecord>>();

  for (const record of records) {
    if (byId.has(record.id)) {
      fail('DUPLICATE_ID', `Duplicate registry record id: ${record.id}.`, {
        ids: [record.id],
      });
    }
    byId.set(record.id, record);
  }

  const successors = new Map<string, string[]>();
  for (const record of records) {
    const predecessor = record.effectivePredecessor;
    if (predecessor === null) {
      continue;
    }

    if (!byId.has(predecessor)) {
      fail(
        'DANGLING_PREDECESSOR',
        `Registry record ${record.id} refers to unknown predecessor ${predecessor}.`,
        { ids: [record.id, predecessor] },
      );
    }

    const children = successors.get(predecessor) ?? [];
    children.push(record.id);
    successors.set(predecessor, children);
  }

  for (const [predecessor, children] of [...successors.entries()].sort(([left], [right]) =>
    compareStrings(left, right),
  )) {
    children.sort();
    if (children.length > 1) {
      fail(
        'FORK',
        `Registry record ${predecessor} has multiple successors: ${children.join(', ')}.`,
        { ids: [predecessor, ...children] },
      );
    }
  }

  detectCycles(records, byId);

  const roots = records.filter((record) => record.effectivePredecessor === null);
  const components = roots.map((root) => {
    const component: IndexedRegistryRecord<TRecord>[] = [];
    let current: IndexedRegistryRecord<TRecord> | undefined = root;

    while (current !== undefined) {
      component.push(current);
      const nextId: string | undefined = successors.get(current.id)?.[0];
      current = nextId === undefined ? undefined : byId.get(nextId);
    }

    return Object.freeze(component);
  });

  const canonicalOwners = new Map<string, Set<string>>();
  for (const component of components) {
    const root = component[0];
    if (root === undefined) {
      continue;
    }

    for (const canonicalRef of new Set(component.map((record) => record.canonicalRef))) {
      const owners = canonicalOwners.get(canonicalRef) ?? new Set<string>();
      owners.add(root.id);
      canonicalOwners.set(canonicalRef, owners);
    }
  }

  const ambiguous = [...canonicalOwners.entries()]
    .filter(([, owners]) => owners.size > 1)
    .sort(([left], [right]) => compareStrings(left, right))[0];
  if (ambiguous !== undefined) {
    const [canonicalRef, owners] = ambiguous;
    const ids = [...owners].sort();
    fail(
      'AMBIGUOUS_CANONICAL_REF',
      `Canonical reference ${canonicalRef} identifies multiple lineages: ${ids.join(', ')}.`,
      { ids },
    );
  }

  const byCanonicalRef = new Map<string, RegistryLineage<TRecord>>();
  for (const component of components) {
    const root = component[0];
    const tip = component.at(-1);
    if (root === undefined || tip === undefined) {
      continue;
    }

    const expectedCanonicalRef = `${STATIC_REGISTRY_CANONICAL_PREFIX}${root.id}`;
    const mismatchedIds = component
      .filter((record) => record.canonicalRef !== expectedCanonicalRef)
      .map((record) => record.id)
      .sort();
    if (mismatchedIds.length > 0) {
      fail(
        'CANONICAL_REF_MISMATCH',
        `Registry lineage rooted at ${root.id} does not use ${expectedCanonicalRef}.`,
        { ids: mismatchedIds },
      );
    }

    byCanonicalRef.set(
      expectedCanonicalRef,
      Object.freeze({
        canonicalRef: expectedCanonicalRef,
        records: component,
        tip,
      }),
    );
  }

  return { byId, byCanonicalRef };
}

export class StaticRegistryIndex<
  TRecord extends RegistryRecordPayload = RegistryRecordPayload,
> {
  readonly size: number;
  readonly lineageCount: number;
  readonly #byId: ReadonlyMap<string, IndexedRegistryRecord<TRecord>>;
  readonly #byCanonicalRef: ReadonlyMap<string, RegistryLineage<TRecord>>;

  private constructor(
    token: typeof INDEX_CONSTRUCTION_TOKEN,
    byId: ReadonlyMap<string, IndexedRegistryRecord<TRecord>>,
    byCanonicalRef: ReadonlyMap<string, RegistryLineage<TRecord>>,
  ) {
    if (token !== INDEX_CONSTRUCTION_TOKEN) {
      throw new TypeError('StaticRegistryIndex must be created from an injected source.');
    }

    this.#byId = byId;
    this.#byCanonicalRef = byCanonicalRef;
    this.size = byId.size;
    this.lineageCount = byCanonicalRef.size;
    Object.freeze(this);
  }

  static fromRecords<TRecord extends RegistryRecordPayload>(
    records: Iterable<RegistryIndexInput<TRecord>>,
  ): StaticRegistryIndex<TRecord> {
    const built = buildIndexData(records);
    return new StaticRegistryIndex(
      INDEX_CONSTRUCTION_TOKEN,
      built.byId,
      built.byCanonicalRef,
    );
  }

  lookupById(id: string): IndexedRegistryRecord<TRecord> {
    if (!isRecordId(id)) {
      fail('MALFORMED_ID', 'Malformed registry record id.');
    }

    const record = this.#byId.get(id);
    if (record === undefined) {
      fail('UNKNOWN_ID', `Unknown registry record id: ${id}.`, { ids: [id] });
    }

    return record;
  }

  resolveCanonicalRef(canonicalRef: string): RegistryLineage<TRecord> {
    if (!isCanonicalRef(canonicalRef)) {
      fail('MALFORMED_CANONICAL_REF', 'Malformed static registry canonical reference.');
    }

    const lineage = this.#byCanonicalRef.get(canonicalRef);
    if (lineage === undefined) {
      fail(
        'UNKNOWN_CANONICAL_REF',
        `Unknown static registry canonical reference: ${canonicalRef}.`,
      );
    }

    return lineage;
  }

  lineage(canonicalRef: string): readonly IndexedRegistryRecord<TRecord>[] {
    return this.resolveCanonicalRef(canonicalRef).records;
  }

  tip(canonicalRef: string): IndexedRegistryRecord<TRecord> {
    return this.resolveCanonicalRef(canonicalRef).tip;
  }
}

export function createStaticRegistryIndex<
  TRecord extends RegistryRecordPayload,
>(
  records: Iterable<RegistryIndexInput<TRecord>>,
): StaticRegistryIndex<TRecord> {
  return StaticRegistryIndex.fromRecords(records);
}

export function createStaticRegistryIndexFromLines<
  TRecord extends RegistryRecordPayload,
>(
  lines: Iterable<string>,
  decodeLine: RegistryLineDecoder<TRecord>,
): StaticRegistryIndex<TRecord> {
  const decoded = materialize(lines).map((line, index) => {
    const lineNumber = index + 1;
    if (typeof line !== 'string') {
      fail('DECODE_FAILED', `Registry line ${lineNumber} could not be decoded.`, {
        lineNumber,
      });
    }

    try {
      return decodeLine(line, lineNumber);
    } catch {
      fail('DECODE_FAILED', `Registry line ${lineNumber} could not be decoded.`, {
        lineNumber,
      });
    }
  });

  return StaticRegistryIndex.fromRecords(decoded);
}
