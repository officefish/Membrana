import { createHash } from 'node:crypto';

export const INVENTORY_SOURCE_SCHEMA = 'affine-inventory-source/1';
export const INVENTORY_MANIFEST_SCHEMA = 'affine-inventory-manifest/1';
export const INVENTORY_EXTRACTOR_VERSION = '1.0.0';
export const INVENTORY_KINDS = Object.freeze(['asset', 'page']);

const HEX_SHA256 = /^[a-f0-9]{64}$/u;
const GIT_SHA = /^[a-f0-9]{40}$/u;
const ISO_WITH_OFFSET = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/u;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SAFE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)*$/u;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

export function canonicalJson(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function assertExactKeys(value, allowed, where) {
  if (!isObject(value)) throw new Error(`${where}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  const extras = actual.filter((key) => !expected.includes(key));
  const missing = expected.filter((key) => !actual.includes(key));
  if (extras.length || missing.length) {
    throw new Error(`${where}: shape mismatch; missing=[${missing.join(',')}], extra=[${extras.join(',')}]`);
  }
}

export function assertIso(value, where) {
  const match = typeof value === 'string' ? ISO_WITH_OFFSET.exec(value) : null;
  if (!match || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${where}: expected ISO timestamp with offset`);
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offset] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const daysInMonth = month >= 1 && month <= 12 ? monthLengths[month - 1] : 0;
  const offsetHour = offset === 'Z' ? 0 : Number(offset.slice(1, 3));
  const offsetMinute = offset === 'Z' ? 0 : Number(offset.slice(4, 6));
  const validOffset = offsetHour < 14 || (offsetHour === 14 && offsetMinute === 0);
  if (
    day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59 ||
    offsetHour > 14 || offsetMinute > 59 || !validOffset
  ) {
    throw new Error(`${where}: invalid ISO calendar or offset`);
  }
}

export function assertSafeIdentifier(value, where) {
  if (typeof value !== 'string' || !SAFE_IDENTIFIER.test(value)) {
    throw new Error(`${where}: expected safe identifier without credentials or paths`);
  }
}

export function assertSafeReference(value, where) {
  if (typeof value !== 'string' || !SAFE_REFERENCE.test(value)) {
    throw new Error(`${where}: expected colon-delimited safe reference`);
  }
}

function assertStringList(value, where) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.trim() !== '')) {
    throw new Error(`${where}: expected non-empty string list`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${where}: duplicate value`);
}

export function objectKey(row) {
  return `${row.kind}:${row.id}`;
}

export function normalizeInventoryObject(row, where) {
  assertExactKeys(row, ['id', 'kind', 'hash', 'ts', 'rels', 'grants', 'byteSize'], where);
  assertSafeIdentifier(row.id, `${where}.id`);
  if (!INVENTORY_KINDS.includes(row.kind)) throw new Error(`${where}.kind: expected page or asset`);
  if (!HEX_SHA256.test(row.hash)) throw new Error(`${where}.hash: expected lowercase sha256`);
  assertExactKeys(row.ts, ['createdAt', 'updatedAt'], `${where}.ts`);
  assertIso(row.ts.createdAt, `${where}.ts.createdAt`);
  assertIso(row.ts.updatedAt, `${where}.ts.updatedAt`);
  assertStringList(row.rels, `${where}.rels`);
  assertStringList(row.grants, `${where}.grants`);
  row.rels.forEach((value, index) => assertSafeReference(value, `${where}.rels[${index}]`));
  row.grants.forEach((value, index) => assertSafeReference(value, `${where}.grants[${index}]`));
  if (row.grants.length === 0) throw new Error(`${where}.grants: at least one grant required`);
  if (!Number.isSafeInteger(row.byteSize) || row.byteSize < 0) throw new Error(`${where}.byteSize: invalid`);
  return {
    id: row.id,
    kind: row.kind,
    hash: row.hash,
    ts: { createdAt: row.ts.createdAt, updatedAt: row.ts.updatedAt },
    rels: [...row.rels].sort(),
    grants: [...row.grants].sort(),
    byteSize: row.byteSize,
  };
}

export function buildInventoryManifest(input) {
  assertExactKeys(input, ['snapshotId', 'capturedAt', 'source', 'fences', 'gitSha', 'objects', 'evidence'], 'manifest input');
  const { snapshotId, capturedAt, source, fences, gitSha, objects, evidence } = input;
  assertSafeIdentifier(snapshotId, 'snapshotId');
  assertIso(capturedAt, 'capturedAt');
  assertExactKeys(source, ['databaseId', 'workspaceIds'], 'source');
  assertSafeIdentifier(source.databaseId, 'source.databaseId');
  assertStringList(source.workspaceIds, 'source.workspaceIds');
  source.workspaceIds.forEach((value, index) => assertSafeIdentifier(value, `source.workspaceIds[${index}]`));
  if (source.workspaceIds.length === 0) throw new Error('source.workspaceIds: at least one workspace required');
  assertExactKeys(fences, ['database', 'export'], 'fences');
  for (const name of ['database', 'export']) {
    assertExactKeys(fences[name], ['snapshotId', 'marker'], `fences.${name}`);
    if (fences[name].snapshotId !== snapshotId) throw new Error(`fences.${name}: snapshot mismatch`);
    assertSafeIdentifier(fences[name].marker, `fences.${name}.marker`);
  }
  if (!GIT_SHA.test(gitSha)) throw new Error('gitSha: expected 40-char lowercase commit sha');
  if (!Array.isArray(objects) || objects.length === 0) throw new Error('objects: non-empty list required');
  if (!Array.isArray(evidence) || evidence.length !== 2) throw new Error('evidence: database and export required');

  const normalized = objects.map((row, index) => normalizeInventoryObject(row, `objects[${index}]`));
  normalized.sort((a, b) => compareText(objectKey(a), objectKey(b)));
  const keys = normalized.map(objectKey);
  if (new Set(keys).size !== keys.length) throw new Error('objects: duplicate kind/id key');
  const known = new Set(keys);
  for (const row of normalized) {
    for (const relation of row.rels) {
      if (!known.has(relation)) throw new Error(`objects.${objectKey(row)}: dangling relation ${relation}`);
    }
  }

  const normalizedEvidence = evidence.map((item, index) => {
    assertExactKeys(item, ['kind', 'sha256'], `evidence[${index}]`);
    if (!['database', 'export'].includes(item.kind)) throw new Error(`evidence[${index}].kind: invalid`);
    if (!HEX_SHA256.test(item.sha256)) throw new Error(`evidence[${index}].sha256: invalid`);
    return { kind: item.kind, sha256: item.sha256 };
  }).sort((a, b) => compareText(a.kind, b.kind));
  if (new Set(normalizedEvidence.map((item) => item.kind)).size !== 2) {
    throw new Error('evidence: database and export must both be present');
  }

  return {
    schema: INVENTORY_MANIFEST_SCHEMA,
    snapshotId,
    capturedAt,
    source: { databaseId: source.databaseId, workspaceIds: [...source.workspaceIds].sort() },
    fences: stableValue(fences),
    extractor: { version: INVENTORY_EXTRACTOR_VERSION, gitSha },
    counts: {
      pages: normalized.filter((row) => row.kind === 'page').length,
      assets: normalized.filter((row) => row.kind === 'asset').length,
    },
    objects: normalized,
    evidence: normalizedEvidence,
  };
}

export function sealInventoryManifest(manifest) {
  validateInventoryManifest(manifest);
  const manifestText = canonicalJson(manifest);
  const digest = sha256(manifestText);
  return { manifest, manifestText, digest, sealText: `${digest}  manifest.json\n` };
}

export function validateInventoryManifest(manifest) {
  assertExactKeys(
    manifest,
    ['schema', 'snapshotId', 'capturedAt', 'source', 'fences', 'extractor', 'counts', 'objects', 'evidence'],
    'manifest',
  );
  if (manifest.schema !== INVENTORY_MANIFEST_SCHEMA) {
    throw new Error(`manifest.schema: expected ${INVENTORY_MANIFEST_SCHEMA}`);
  }
  assertExactKeys(manifest.extractor, ['version', 'gitSha'], 'manifest.extractor');
  if (manifest.extractor.version !== INVENTORY_EXTRACTOR_VERSION) {
    throw new Error(`manifest.extractor.version: expected ${INVENTORY_EXTRACTOR_VERSION}`);
  }
  assertExactKeys(manifest.counts, ['pages', 'assets'], 'manifest.counts');
  const rebuilt = buildInventoryManifest({
    snapshotId: manifest.snapshotId,
    capturedAt: manifest.capturedAt,
    source: manifest.source,
    fences: manifest.fences,
    gitSha: manifest.extractor.gitSha,
    objects: manifest.objects,
    evidence: manifest.evidence,
  });
  if (manifest.counts.pages !== rebuilt.counts.pages || manifest.counts.assets !== rebuilt.counts.assets) {
    throw new Error('manifest.counts: does not match exact object set');
  }
  if (canonicalJson(manifest) !== canonicalJson(rebuilt)) {
    throw new Error('manifest: not in canonical normalized form');
  }
  return manifest;
}
