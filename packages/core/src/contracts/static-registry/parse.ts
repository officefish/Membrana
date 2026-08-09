import {
  EVIDENCE_LOCATION_KINDS,
  type EvidenceLocation,
  type EvidenceLocationKind,
  type EvidenceRecord,
  type EvidenceSensitive,
  type JsonValue,
  type ParseResult,
  type StaticRegistryEntry,
  type StaticRegistryError,
  type StaticRegistryErrorCode,
  type StaticRegistryLineage,
  type StaticRegistrySnapshot,
} from './types.js';

const RECORD_ID_RE = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const SHA256_RE = /^[0-9a-f]{64}$/u;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const TIMESTAMP_RE = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](\d{2}):(\d{2}))$/u;
const LOCATION_KINDS: ReadonlySet<string> = new Set(EVIDENCE_LOCATION_KINDS);
const RECORD_KEYS = new Set([
  'id',
  'sha256',
  'bytes',
  'addedAt',
  'source',
  'location',
  'about',
  'measured',
  'sensitive',
  'supersedes',
]);
const LOCATION_KEYS = new Set(['kind', 'ref']);
const SENSITIVE_KEYS = new Set(['reason', 'decidedAt']);

export const LEGACY_EFFECTIVE_PREDECESSORS: Readonly<Record<string, string>> = Object.freeze({
  'ozon-receipt-3765-field-kit-r2': 'ozon-receipt-3765-field-kit',
  'day-memo-2026-07-28-r2': 'day-memo-2026-07-28',
  'bpla-guidance-methodology-partner-r2': 'bpla-guidance-methodology-partner',
  'bpla-guidance-methodology-partner-r3': 'bpla-guidance-methodology-partner-r2',
});

interface ParsedRow {
  readonly line: number;
  readonly record: EvidenceRecord;
}

interface JsonCloneSuccess {
  readonly ok: true;
  readonly value: JsonValue;
}

interface JsonCloneFailure {
  readonly ok: false;
}

type JsonCloneResult = JsonCloneSuccess | JsonCloneFailure;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function unknownKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): string[] {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

function isRecordId(value: unknown): value is string {
  return typeof value === 'string' && RECORD_ID_RE.test(value);
}

function isCalendarDateParts(year: string, month: string, day: string): boolean {
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime())
    && date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() + 1 === Number(month)
    && date.getUTCDate() === Number(day);
}

function isRegistryDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const dateMatch = DATE_RE.exec(value);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return year !== undefined && month !== undefined && day !== undefined
      && isCalendarDateParts(year, month, day);
  }

  const timestampMatch = TIMESTAMP_RE.exec(value);
  if (!timestampMatch) return false;
  const [, year, month, day, offsetHour, offsetMinute] = timestampMatch;
  if (year === undefined || month === undefined || day === undefined) return false;
  if (!isCalendarDateParts(year, month, day)) return false;
  if (offsetHour === undefined || offsetMinute === undefined) return true;
  const hour = Number(offsetHour);
  const minute = Number(offsetMinute);
  return hour < 14 || (hour === 14 && minute === 0);
}

function cloneJsonValue(value: unknown, ancestors: WeakSet<object>): JsonCloneResult {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return { ok: true, value };
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { ok: true, value } : { ok: false };
  }
  if (typeof value !== 'object' || value === null) return { ok: false };
  if (ancestors.has(value)) return { ok: false };

  ancestors.add(value);
  if (Array.isArray(value)) {
    const cloned: JsonValue[] = [];
    for (const item of value) {
      const result = cloneJsonValue(item, ancestors);
      if (!result.ok) {
        ancestors.delete(value);
        return result;
      }
      cloned.push(result.value);
    }
    ancestors.delete(value);
    return { ok: true, value: cloned };
  }

  if (!isPlainRecord(value)) {
    ancestors.delete(value);
    return { ok: false };
  }
  const cloned: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    const result = cloneJsonValue(item, ancestors);
    if (!result.ok) {
      ancestors.delete(value);
      return result;
    }
    cloned[key] = result.value;
  }
  ancestors.delete(value);
  return { ok: true, value: cloned };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function error(
  code: StaticRegistryErrorCode,
  message: string,
  context: Omit<StaticRegistryError, 'code' | 'message'> = {},
): StaticRegistryError {
  return deepFreeze({ code, message, ...context });
}

function failure<T>(errors: readonly StaticRegistryError[]): ParseResult<T> {
  return Object.freeze({ ok: false, errors: Object.freeze([...errors]) });
}

function success<T>(value: T): ParseResult<T> {
  return Object.freeze({ ok: true, value });
}

function addUnknownKeyError(
  errors: StaticRegistryError[],
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  field: string,
  recordId?: string,
): void {
  const extras = unknownKeys(value, allowed);
  if (extras.length === 0) return;
  errors.push(error(
    'invalid-record',
    `Unknown ${field} field(s): ${extras.join(', ')}`,
    { field, ...(recordId === undefined ? {} : { recordId }) },
  ));
}

/** Strictly validates and defensively copies one EvidenceRecord. */
export function parseEvidenceRecord(raw: unknown): ParseResult<EvidenceRecord> {
  if (!isPlainRecord(raw)) {
    return failure([error('invalid-record', 'Evidence record must be a plain object')]);
  }

  const errors: StaticRegistryError[] = [];
  const recordId = typeof raw.id === 'string' ? raw.id : undefined;
  addUnknownKeyError(errors, raw, RECORD_KEYS, 'record', recordId);

  if (!isRecordId(raw.id)) {
    errors.push(error('invalid-record', 'id must be a 3-64 character lowercase slug', {
      field: 'id',
      ...(recordId === undefined ? {} : { recordId }),
    }));
  }
  if (typeof raw.sha256 !== 'string' || !SHA256_RE.test(raw.sha256)) {
    errors.push(error('invalid-record', 'sha256 must be 64 lowercase hexadecimal characters', {
      field: 'sha256',
      ...(recordId === undefined ? {} : { recordId }),
    }));
  }
  if (!Number.isSafeInteger(raw.bytes) || typeof raw.bytes !== 'number' || raw.bytes <= 0) {
    errors.push(error('invalid-record', 'bytes must be a positive safe integer', {
      field: 'bytes',
      ...(recordId === undefined ? {} : { recordId }),
    }));
  }
  if (!isRegistryDate(raw.addedAt)) {
    errors.push(error('invalid-record', 'addedAt must be a valid YYYY-MM-DD or ISO 8601 timestamp', {
      field: 'addedAt',
      ...(recordId === undefined ? {} : { recordId }),
    }));
  }
  if (typeof raw.source !== 'string' || raw.source.trim().length === 0) {
    errors.push(error('invalid-record', 'source must be a non-empty string', {
      field: 'source',
      ...(recordId === undefined ? {} : { recordId }),
    }));
  }

  let location: EvidenceLocation | undefined;
  if (!isPlainRecord(raw.location)) {
    errors.push(error('invalid-record', 'location must be an object', {
      field: 'location',
      ...(recordId === undefined ? {} : { recordId }),
    }));
  } else {
    addUnknownKeyError(errors, raw.location, LOCATION_KEYS, 'location', recordId);
    const kind = raw.location.kind;
    const ref = raw.location.ref;
    if (typeof kind !== 'string' || !LOCATION_KINDS.has(kind)) {
      errors.push(error('invalid-record', 'location.kind is not supported', {
        field: 'location.kind',
        ...(recordId === undefined ? {} : { recordId }),
      }));
    }
    if (typeof ref !== 'string' || ref.trim().length === 0) {
      errors.push(error('invalid-record', 'location.ref must be a non-empty string', {
        field: 'location.ref',
        ...(recordId === undefined ? {} : { recordId }),
      }));
    }
    if (typeof kind === 'string' && LOCATION_KINDS.has(kind)
      && typeof ref === 'string' && ref.trim().length > 0) {
      location = { kind: kind as EvidenceLocationKind, ref };
    }
  }

  if (Object.hasOwn(raw, 'about') && typeof raw.about !== 'string') {
    errors.push(error('invalid-record', 'about must be a string when present', {
      field: 'about',
      ...(recordId === undefined ? {} : { recordId }),
    }));
  }

  let measured: Readonly<Record<string, JsonValue>> | undefined;
  if (Object.hasOwn(raw, 'measured')) {
    if (!isPlainRecord(raw.measured)) {
      errors.push(error('invalid-record', 'measured must be a JSON object when present', {
        field: 'measured',
        ...(recordId === undefined ? {} : { recordId }),
      }));
    } else {
      const cloned = cloneJsonValue(raw.measured, new WeakSet());
      if (!cloned.ok || !isPlainRecord(cloned.value)) {
        errors.push(error('invalid-record', 'measured must contain only finite JSON values', {
          field: 'measured',
          ...(recordId === undefined ? {} : { recordId }),
        }));
      } else {
        measured = cloned.value as Readonly<Record<string, JsonValue>>;
      }
    }
  }

  let sensitive: EvidenceSensitive | undefined;
  if (Object.hasOwn(raw, 'sensitive')) {
    if (!isPlainRecord(raw.sensitive)) {
      errors.push(error('invalid-record', 'sensitive must be an object when present', {
        field: 'sensitive',
        ...(recordId === undefined ? {} : { recordId }),
      }));
    } else {
      addUnknownKeyError(errors, raw.sensitive, SENSITIVE_KEYS, 'sensitive', recordId);
      const reason = raw.sensitive.reason;
      const decidedAt = raw.sensitive.decidedAt;
      if (typeof reason !== 'string' || reason.trim().length === 0) {
        errors.push(error('invalid-record', 'sensitive.reason must be a non-empty string', {
          field: 'sensitive.reason',
          ...(recordId === undefined ? {} : { recordId }),
        }));
      }
      if (!isRegistryDate(decidedAt)) {
        errors.push(error('invalid-record', 'sensitive.decidedAt must be a valid date', {
          field: 'sensitive.decidedAt',
          ...(recordId === undefined ? {} : { recordId }),
        }));
      }
      if (typeof reason === 'string' && reason.trim().length > 0 && isRegistryDate(decidedAt)) {
        sensitive = { reason, decidedAt };
      }
    }
  }

  if (Object.hasOwn(raw, 'supersedes')) {
    if (Array.isArray(raw.supersedes)) {
      errors.push(error('merge', 'supersedes must name exactly one predecessor', {
        field: 'supersedes',
        ...(recordId === undefined ? {} : { recordId }),
      }));
    } else if (!isRecordId(raw.supersedes)) {
      errors.push(error('invalid-record', 'supersedes must be one valid record id', {
        field: 'supersedes',
        ...(recordId === undefined ? {} : { recordId }),
      }));
    }
  }

  if (errors.length > 0 || location === undefined) return failure(errors);

  const record: EvidenceRecord = {
    id: raw.id as string,
    sha256: raw.sha256 as string,
    bytes: raw.bytes as number,
    addedAt: raw.addedAt as string,
    source: raw.source as string,
    location,
    ...(Object.hasOwn(raw, 'about') ? { about: raw.about as string } : {}),
    ...(measured === undefined ? {} : { measured }),
    ...(sensitive === undefined ? {} : { sensitive }),
    ...(Object.hasOwn(raw, 'supersedes') && typeof raw.supersedes === 'string'
      ? { supersedes: raw.supersedes }
      : {}),
  };
  return success(deepFreeze(record));
}

function effectivePredecessor(record: EvidenceRecord): string | null {
  return record.supersedes ?? LEGACY_EFFECTIVE_PREDECESSORS[record.id] ?? null;
}

function withLine(errors: readonly StaticRegistryError[], line: number): StaticRegistryError[] {
  return errors.map((item) => error(item.code, item.message, { ...item, line }));
}

function canonicalRef(rootId: string): string {
  return `urn:mmbrn:static:${rootId}`;
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function buildSnapshot(rows: readonly ParsedRow[]): ParseResult<StaticRegistrySnapshot> {
  const byId = new Map<string, ParsedRow>();
  const duplicateErrors: StaticRegistryError[] = [];
  for (const row of rows) {
    const first = byId.get(row.record.id);
    if (first) {
      duplicateErrors.push(error('duplicate-id', `Duplicate record id: ${row.record.id}`, {
        line: row.line,
        recordId: row.record.id,
        relatedIds: Object.freeze([row.record.id]),
      }));
    } else {
      byId.set(row.record.id, row);
    }
  }
  if (duplicateErrors.length > 0) return failure(duplicateErrors);

  const predecessors = new Map<string, string | null>();
  const danglingErrors: StaticRegistryError[] = [];
  for (const row of rows) {
    const predecessor = effectivePredecessor(row.record);
    predecessors.set(row.record.id, predecessor);
    if (predecessor !== null && !byId.has(predecessor)) {
      danglingErrors.push(error('dangling-predecessor', `Unknown predecessor: ${predecessor}`, {
        line: row.line,
        recordId: row.record.id,
        relatedIds: Object.freeze([predecessor]),
      }));
    }
  }
  if (danglingErrors.length > 0) return failure(danglingErrors);

  const successors = new Map<string, string[]>();
  for (const [recordId, predecessor] of predecessors) {
    if (predecessor === null) continue;
    const current = successors.get(predecessor) ?? [];
    current.push(recordId);
    successors.set(predecessor, current);
  }
  const forkErrors: StaticRegistryError[] = [];
  for (const [predecessor, children] of successors) {
    if (children.length > 1) {
      forkErrors.push(error('fork', `Record ${predecessor} has multiple successors`, {
        recordId: predecessor,
        relatedIds: Object.freeze([...children].sort(compareIds)),
      }));
    }
  }
  if (forkErrors.length > 0) return failure(forkErrors);

  const rootById = new Map<string, string>();
  for (const row of rows) {
    const path: string[] = [];
    const pathIndex = new Map<string, number>();
    let current = row.record.id;
    let root: string | undefined;

    while (root === undefined) {
      const knownRoot = rootById.get(current);
      if (knownRoot !== undefined) {
        root = knownRoot;
        break;
      }
      const repeatedAt = pathIndex.get(current);
      if (repeatedAt !== undefined) {
        const cycleIds = path.slice(repeatedAt);
        return failure([error('cycle', `Lineage cycle detected at ${current}`, {
          recordId: current,
          relatedIds: Object.freeze(cycleIds),
        })]);
      }

      pathIndex.set(current, path.length);
      path.push(current);
      const predecessor = predecessors.get(current);
      if (predecessor === null) {
        root = current;
      } else if (predecessor !== undefined) {
        current = predecessor;
      }
    }

    for (const recordId of path) rootById.set(recordId, root);
  }

  const entries: StaticRegistryEntry[] = rows.map(({ record }) => {
    const rootId = rootById.get(record.id) as string;
    return deepFreeze({
      record,
      recordId: record.id,
      effectivePredecessor: predecessors.get(record.id) ?? null,
      rootId,
      canonicalRef: canonicalRef(rootId),
    });
  }).sort((left, right) => compareIds(left.recordId, right.recordId));

  const lineages: StaticRegistryLineage[] = [];
  const roots = entries
    .filter((entry) => entry.effectivePredecessor === null)
    .map((entry) => entry.recordId)
    .sort(compareIds);
  for (const rootId of roots) {
    const recordIds: string[] = [];
    let current: string | undefined = rootId;
    while (current !== undefined) {
      recordIds.push(current);
      current = successors.get(current)?.[0];
    }
    lineages.push(deepFreeze({
      rootId,
      canonicalRef: canonicalRef(rootId),
      recordIds: Object.freeze(recordIds),
      tip: recordIds[recordIds.length - 1] as string,
    }));
  }

  return success(deepFreeze({
    records: Object.freeze(entries),
    lineages: Object.freeze(lineages),
  }));
}

/** Parses complete JSONL registry text and rejects the whole source on any defect. */
export function parseStaticRegistryJsonl(text: string): ParseResult<StaticRegistrySnapshot> {
  if (typeof text !== 'string') {
    return failure([error('invalid-record', 'Registry source must be a string')]);
  }

  const rows: ParsedRow[] = [];
  const errors: StaticRegistryError[] = [];
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    if (line.trim().length === 0) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : String(caught);
      errors.push(error('invalid-json', `Invalid JSON: ${detail}`, { line: index + 1 }));
      continue;
    }
    const parsed = parseEvidenceRecord(raw);
    if (!parsed.ok) {
      errors.push(...withLine(parsed.errors, index + 1));
      continue;
    }
    rows.push({ line: index + 1, record: parsed.value });
  }

  if (errors.length > 0) return failure(errors);
  if (rows.length === 0) {
    return failure([error('invalid-record', 'Registry must contain at least one record')]);
  }
  return buildSnapshot(rows);
}
