import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { extractAffineInventory } from './lib/affine-inventory-extractor.mjs';

const FIXTURE = resolve('scripts/fixtures/affine-inventory/source.json');
const GIT = 'c'.repeat(40);

test('extractor reconciles exact sets and produces byte-identical sealed output', () => {
  const first = extractAffineInventory({ inputPath: FIXTURE, gitSha: GIT });
  const second = extractAffineInventory({ inputPath: FIXTURE, gitSha: GIT });
  assert.equal(first.manifestText, second.manifestText);
  assert.equal(first.digest, second.digest);
  assert.deepEqual(first.manifest.counts, { pages: 1, assets: 1 });
  assert.equal(first.manifestText.includes('contentPath'), false);
});

test('logical exact sets produce the same evidence regardless of row order', () => {
  const reordered = mutatedFixture((input) => {
    input.databaseObjects.reverse();
    input.exportObjects.reverse();
    for (const row of [...input.databaseObjects, ...input.exportObjects]) {
      row.rels.reverse();
      row.grants.reverse();
    }
  });
  const first = extractAffineInventory({ inputPath: FIXTURE, gitSha: GIT });
  const second = extractAffineInventory({ inputPath: reordered, gitSha: GIT });
  assert.equal(first.manifestText, second.manifestText);
  assert.equal(first.digest, second.digest);
});

function mutatedFixture(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'affine-inventory-'));
  const fixtureDir = resolve('scripts/fixtures/affine-inventory');
  const input = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  for (const row of input.exportObjects) {
    const name = row.contentPath.split('/').at(-1);
    writeFileSync(join(dir, name), readFileSync(join(fixtureDir, name)));
    row.contentPath = name;
  }
  mutate(input, dir);
  const path = join(dir, 'source.json');
  writeFileSync(path, JSON.stringify(input));
  return path;
}

test('extractor rejects counts-only emptiness and missing export rows', () => {
  const path = mutatedFixture((input) => { input.exportObjects = []; });
  assert.throws(() => extractAffineInventory({ inputPath: path, gitSha: GIT }), /exact set mismatch/u);
});

test('extractor rejects hash mismatch and metadata drift', () => {
  const hashPath = mutatedFixture((_input, dir) => writeFileSync(join(dir, 'page-a.md'), 'changed'));
  assert.throws(() => extractAffineInventory({ inputPath: hashPath, gitSha: GIT }), /content hash mismatch/u);
  const metadataPath = mutatedFixture((input) => { input.exportObjects[0].grants = ['workspace:other:reader']; });
  assert.throws(() => extractAffineInventory({ inputPath: metadataPath, gitSha: GIT }), /metadata mismatch/u);
});

test('extractor rejects duplicate rows, unknown secret fields and path traversal', () => {
  const duplicate = mutatedFixture((input) => input.databaseObjects.push(input.databaseObjects[0]));
  assert.throws(() => extractAffineInventory({ inputPath: duplicate, gitSha: GIT }), /duplicate page:page-a/u);
  const secret = mutatedFixture((input) => { input.token = 'must-not-pass'; });
  assert.throws(() => extractAffineInventory({ inputPath: secret, gitSha: GIT }), /extra=\[token\]/u);
  const traversal = mutatedFixture((input) => { input.exportObjects[0].contentPath = '../outside'; });
  assert.throws(() => extractAffineInventory({ inputPath: traversal, gitSha: GIT }), /escapes input directory/u);
});

test('extractor rejects junction escapes and credentials in allowed fields', () => {
  const junction = mutatedFixture((input, dir) => {
    const outside = mkdtempSync(join(tmpdir(), 'affine-inventory-outside-'));
    mkdirSync(join(outside, 'content'));
    writeFileSync(join(outside, 'content', 'page-a.md'), readFileSync(resolve('scripts/fixtures/affine-inventory/page-a.md')));
    symlinkSync(join(outside, 'content'), join(dir, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    input.exportObjects.find((row) => row.id === 'page-a').contentPath = 'linked/page-a.md';
  });
  assert.throws(() => extractAffineInventory({ inputPath: junction, gitSha: GIT }), /escapes input directory/u);

  const credentials = mutatedFixture((input) => { input.source.databaseId = 'postgres://user:secret@host/db'; });
  assert.throws(() => extractAffineInventory({ inputPath: credentials, gitSha: GIT }), /without credentials or paths/u);
});
