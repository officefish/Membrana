import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildInventoryManifest, canonicalJson, sealInventoryManifest } from './lib/affine-inventory.mjs';

const SHA = 'a'.repeat(64);
const GIT = 'b'.repeat(40);
const row = (overrides = {}) => ({
  id: 'p-1', kind: 'page', hash: SHA,
  ts: { createdAt: '2026-08-08T10:00:00Z', updatedAt: '2026-08-08T11:00:00Z' },
  rels: [], grants: ['workspace:strategy:reader'], byteSize: 4, ...overrides,
});

const input = (objects = [row()]) => ({
  snapshotId: 'snap-1', capturedAt: '2026-08-08T12:00:00Z',
  source: { databaseId: 'affine-postgres', workspaceIds: ['strategy'] },
  fences: {
    database: { snapshotId: 'snap-1', marker: 'tx-10' },
    export: { snapshotId: 'snap-1', marker: 'export-10' },
  },
  gitSha: GIT, objects,
  evidence: [{ kind: 'export', sha256: SHA }, { kind: 'database', sha256: SHA }],
});

test('canonical manifest is stable across object and grant order', () => {
  const a = buildInventoryManifest(input([
    row({ id: 'p-2', grants: ['z', 'a'] }), row({ id: 'p-1' }),
  ]));
  const b = buildInventoryManifest(input([
    row({ id: 'p-1' }), row({ id: 'p-2', grants: ['a', 'z'] }),
  ]));
  assert.equal(canonicalJson(a), canonicalJson(b));
  assert.equal(sealInventoryManifest(a).digest, sealInventoryManifest(b).digest);
});

test('manifest counts kinds but does not treat a baseline as proof', () => {
  const manifest = buildInventoryManifest(input([
    row(), row({ id: 'a-1', kind: 'asset' }),
  ]));
  assert.deepEqual(manifest.counts, { pages: 1, assets: 1 });
  assert.equal('expectedCounts' in manifest, false);
});

test('contract rejects duplicate keys, missing grants and dangling relations', () => {
  assert.throws(() => buildInventoryManifest(input([row(), row()])), /duplicate kind\/id/u);
  assert.throws(() => buildInventoryManifest(input([row({ grants: [] })])), /at least one grant/u);
  assert.throws(() => buildInventoryManifest(input([row({ rels: ['asset:missing'] })])), /dangling relation/u);
});

test('contract rejects unknown fields, bad hashes and mismatched fences', () => {
  assert.throws(() => buildInventoryManifest({ ...input(), token: 'secret' }), /shape mismatch|token/u);
  assert.throws(() => buildInventoryManifest(input([row({ hash: 'bad' })])), /lowercase sha256/u);
  const badFence = input();
  badFence.fences.export.snapshotId = 'other';
  assert.throws(() => buildInventoryManifest(badFence), /snapshot mismatch/u);
});

test('seal rejects schema bypasses and non-offset timestamps', () => {
  const manifest = buildInventoryManifest(input());
  assert.throws(() => sealInventoryManifest({ ...manifest, disposition: 'copy' }), /extra=\[disposition\]/u);
  assert.throws(() => buildInventoryManifest({ ...input(), capturedAt: '2026-08-08' }), /with offset/u);
  assert.throws(() => buildInventoryManifest({ ...input(), capturedAt: 'August 8, 2026' }), /with offset/u);
});

test('object order uses deterministic code-unit ordering, not host locale', () => {
  const manifest = buildInventoryManifest(input([
    row({ id: 'z' }), row({ id: 'A' }),
  ]));
  assert.deepEqual(manifest.objects.map((item) => item.id), ['A', 'z']);
});
