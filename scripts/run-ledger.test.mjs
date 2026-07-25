/**
 * run-ledger — tests (offline, no network).
 */
import assert from 'node:assert/strict';
import { generateKeyPairSync, createPublicKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  RunLedger,
  canonicalBytes,
  leafHash,
  merkleRoot,
  verify,
  verifyInclusion,
  verifyConsistency,
  inclusionProof,
  EMPTY_ROOT,
} from './lib/run-ledger/index.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('canonical: CRLF and LF yield same leaf hash', () => {
  const a = { note: 'line1\r\nline2', procedureId: 'p', sequence: 1 };
  const b = { procedureId: 'p', sequence: 1, note: 'line1\nline2' };
  assert.equal(leafHash(a), leafHash(b));
  assert.equal(canonicalBytes(a).toString('utf8'), canonicalBytes(b).toString('utf8'));
});

test('canonical: key order does not affect hash', () => {
  const a = { b: 2, a: 1 };
  const b = { a: 1, b: 2 };
  assert.equal(leafHash(a), leafHash(b));
});

test('merkle: roots for 0/1/2/3/8 leaves', () => {
  const h = (n) => leafHash({ i: n });
  assert.equal(merkleRoot([]), EMPTY_ROOT);
  assert.match(merkleRoot([h(0)]), /^[a-f0-9]{64}$/);
  assert.notEqual(merkleRoot([h(0)]), merkleRoot([h(0), h(1)]));
  assert.notEqual(merkleRoot([h(0), h(1)]), merkleRoot([h(0), h(1), h(2)]));
  const eight = Array.from({ length: 8 }, (_, i) => h(i));
  assert.match(merkleRoot(eight), /^[a-f0-9]{64}$/);
});

test('merkle: inclusion proof for each index and negative tamper', () => {
  const leaves = [leafHash({ i: 0 }), leafHash({ i: 1 }), leafHash({ i: 2 })];
  for (let i = 0; i < leaves.length; i += 1) {
    const proof = inclusionProof(leaves, i);
    assert.ok(verifyInclusion(proof));
  }
  const bad = inclusionProof(leaves, 0);
  bad.leafHash = leafHash({ i: 99 });
  assert.equal(verifyInclusion(bad), false);
});

test('merkle: consistency N and N+K; tampered middle fails', () => {
  const ledger = new RunLedger();
  for (let i = 0; i < 5; i += 1) {
    ledger.appendRun({ procedureId: 'p', sequence: i, outcome: 'success' });
  }
  const proof = ledger.consistencyProofFrom(2);
  assert.ok(verifyConsistency(proof, ledger.leafHashes));
  const tampered = ledger.leafHashes.slice();
  tampered[1] = leafHash({ procedureId: 'p', sequence: 99, outcome: 'reject' });
  assert.equal(verifyConsistency(proof, tampered), false);
});

test('checkpoint: wrong key and tampered root fail', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const other = generateKeyPairSync('ed25519');
  const ledger = new RunLedger();
  ledger.appendRun({ procedureId: 'p', sequence: 1, outcome: 'success' });
  const cp = ledger.checkpointOf(privateKey, 'test');
  const proof = ledger.inclusionProofAt(0);
  assert.ok(verify(cp, publicKey, { kind: 'inclusion', proof }));
  assert.equal(verify(cp, other.publicKey, { kind: 'inclusion', proof }), false);
  const badRoot = { ...cp, root: '0'.repeat(64) };
  assert.equal(verify(badRoot, publicKey, { kind: 'inclusion', proof }), false);
});

test('reject outcome proves equally', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const ledger = new RunLedger();
  ledger.appendRun({ procedureId: 'one-shot', sequence: 1, outcome: 'reject', reason: 'stamp' });
  const cp = ledger.checkpointOf(privateKey, 'test');
  const proof = ledger.inclusionProofAt(0);
  assert.ok(verify(cp, publicKey, { kind: 'inclusion', proof }));
});

test('consistency verify offline via verify()', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const ledger = new RunLedger();
  ledger.appendRun({ procedureId: 'p', sequence: 1, outcome: 'success' });
  ledger.appendRun({ procedureId: 'p', sequence: 2, outcome: 'success' });
  ledger.appendRun({ procedureId: 'p', sequence: 3, outcome: 'success' });
  const cp = ledger.checkpointOf(privateKey, 'test');
  const proof = ledger.consistencyProofFrom(2);
  assert.equal(proof.oldSize, 2);
  assert.equal(proof.newSize, 3);
  assert.ok(
    verify(cp, publicKey, {
      kind: 'consistency',
      proof,
      newLeaves: ledger.leafHashes,
    }),
  );
});

test('committed dev public key parses', () => {
  const pem = readFileSync(join(repoRoot, 'scripts/lib/run-ledger/keys/dev.pub.pem'), 'utf8');
  const key = createPublicKey(pem);
  assert.equal(key.asymmetricKeyType, 'ed25519');
});
