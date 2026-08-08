import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import {
  INVENTORY_SOURCE_SCHEMA,
  assertExactKeys,
  buildInventoryManifest,
  canonicalJson,
  objectKey,
  sealInventoryManifest,
  sha256,
} from './affine-inventory.mjs';

const DB_KEYS = ['id', 'kind', 'hash', 'ts', 'rels', 'grants'];
const EXPORT_KEYS = [...DB_KEYS, 'byteSize', 'contentPath'];

function safeContentPath(root, candidate, where) {
  if (typeof candidate !== 'string' || candidate.trim() === '' || isAbsolute(candidate)) {
    throw new Error(`${where}: contentPath must be relative`);
  }
  const lexicalTarget = resolve(root, candidate);
  const lexicalRel = relative(root, lexicalTarget);
  if (lexicalRel === '..' || lexicalRel.startsWith(`..\\`) || lexicalRel.startsWith('../')) {
    throw new Error(`${where}: contentPath escapes input directory`);
  }
  const realRoot = realpathSync(root);
  const target = realpathSync(lexicalTarget);
  const realRel = relative(realRoot, target);
  if (realRel === '..' || realRel.startsWith(`..\\`) || realRel.startsWith('../')) {
    throw new Error(`${where}: contentPath escapes input directory through link`);
  }
  return target;
}

function indexRows(rows, allowedKeys, where) {
  if (!Array.isArray(rows)) throw new Error(`${where}: expected list`);
  const map = new Map();
  rows.forEach((row, index) => {
    assertExactKeys(row, allowedKeys, `${where}[${index}]`);
    const key = objectKey(row);
    if (map.has(key)) throw new Error(`${where}: duplicate ${key}`);
    map.set(key, row);
  });
  return map;
}

function comparable(row) {
  return { id: row.id, kind: row.kind, hash: row.hash, ts: row.ts, rels: [...row.rels].sort(), grants: [...row.grants].sort() };
}

function sortedRows(rows) {
  return [...rows].sort((left, right) => {
    const a = objectKey(left);
    const b = objectKey(right);
    return a < b ? -1 : a > b ? 1 : 0;
  }).map((row) => ({ ...row, rels: [...row.rels].sort(), grants: [...row.grants].sort() }));
}

export function extractAffineInventory({ inputPath, gitSha }) {
  const raw = readFileSync(inputPath, 'utf8');
  const sourceBundle = JSON.parse(raw);
  assertExactKeys(
    sourceBundle,
    ['schema', 'snapshotId', 'capturedAt', 'source', 'fences', 'databaseObjects', 'exportObjects'],
    'input',
  );
  if (sourceBundle.schema !== INVENTORY_SOURCE_SCHEMA) {
    throw new Error(`input.schema: expected ${INVENTORY_SOURCE_SCHEMA}`);
  }
  const db = indexRows(sourceBundle.databaseObjects, DB_KEYS, 'databaseObjects');
  const exported = indexRows(sourceBundle.exportObjects, EXPORT_KEYS, 'exportObjects');
  const dbKeys = [...db.keys()].sort();
  const exportKeys = [...exported.keys()].sort();
  if (canonicalJson(dbKeys) !== canonicalJson(exportKeys)) {
    const missingFromExport = dbKeys.filter((key) => !exported.has(key));
    const missingFromDatabase = exportKeys.filter((key) => !db.has(key));
    throw new Error(
      `exact set mismatch; missingFromExport=[${missingFromExport.join(',')}], ` +
      `missingFromDatabase=[${missingFromDatabase.join(',')}]`,
    );
  }

  const inputRoot = dirname(resolve(inputPath));
  const objects = dbKeys.map((key) => {
    const dbRow = db.get(key);
    const exportRow = exported.get(key);
    if (canonicalJson(comparable(dbRow)) !== canonicalJson(comparable(exportRow))) {
      throw new Error(`${key}: database/export metadata mismatch`);
    }
    const bytes = readFileSync(safeContentPath(inputRoot, exportRow.contentPath, `${key}.contentPath`));
    const actualHash = sha256(bytes);
    if (actualHash !== exportRow.hash) throw new Error(`${key}: content hash mismatch`);
    if (bytes.byteLength !== exportRow.byteSize) throw new Error(`${key}: byteSize mismatch`);
    return { ...comparable(exportRow), byteSize: bytes.byteLength };
  });

  const evidence = [
    { kind: 'database', sha256: sha256(canonicalJson(sortedRows(sourceBundle.databaseObjects))) },
    { kind: 'export', sha256: sha256(canonicalJson(sortedRows(sourceBundle.exportObjects))) },
  ];
  const manifest = buildInventoryManifest({
    snapshotId: sourceBundle.snapshotId,
    capturedAt: sourceBundle.capturedAt,
    source: sourceBundle.source,
    fences: sourceBundle.fences,
    gitSha,
    objects,
    evidence,
  });
  return sealInventoryManifest(manifest);
}
