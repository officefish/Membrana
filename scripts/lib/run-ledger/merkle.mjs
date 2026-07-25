/**
 * Merkle tree over sha256 leaf digests (hex). Duplicate-last for odd levels.
 */

import { createHash } from 'node:crypto';

/** Empty-tree root (deterministic sentinel). */
export const EMPTY_ROOT = createHash('sha256').update('run-ledger:empty').digest('hex');

/**
 * @param {string} left hex
 * @param {string} right hex
 * @returns {string}
 */
export function combineHashes(left, right) {
  const buf = Buffer.concat([Buffer.from(left, 'hex'), Buffer.from(right, 'hex')]);
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Build all tree levels from leaf hashes (bottom-up).
 * @param {string[]} leaves hex digests
 * @returns {string[][]}
 */
export function buildLevels(leaves) {
  if (leaves.length === 0) return [[EMPTY_ROOT]];
  /** @type {string[][]} */
  const levels = [leaves.slice()];
  while (levels[levels.length - 1].length > 1) {
    const prev = levels[levels.length - 1];
    /** @type {string[]} */
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      const left = prev[i];
      const right = i + 1 < prev.length ? prev[i + 1] : left;
      next.push(combineHashes(left, right));
    }
    levels.push(next);
  }
  return levels;
}

/**
 * @param {string[]} leaves
 * @returns {string}
 */
export function merkleRoot(leaves) {
  const levels = buildLevels(leaves);
  return levels[levels.length - 1][0];
}

/**
 * @typedef {{ hash: string, sibling: string, position: 'left' | 'right' }} AuditStep
 */

/**
 * Inclusion proof for leaf at index.
 * @param {string[]} leaves
 * @param {number} index
 * @returns {{ index: number, leafHash: string, root: string, path: AuditStep[] }}
 */
export function inclusionProof(leaves, index) {
  if (index < 0 || index >= leaves.length) {
    throw new RangeError(`inclusionProof: index ${index} out of range (size ${leaves.length})`);
  }
  const levels = buildLevels(leaves);
  /** @type {AuditStep[]} */
  const path = [];
  let idx = index;
  for (let level = 0; level < levels.length - 1; level += 1) {
    const row = levels[level];
    const isRight = idx % 2 === 1;
    const sibIdx = isRight ? idx - 1 : idx + 1;
    const sibling = sibIdx < row.length ? row[sibIdx] : row[idx];
    path.push({
      hash: row[idx],
      sibling,
      position: isRight ? 'left' : 'right',
    });
    idx = Math.floor(idx / 2);
  }
  return {
    index,
    leafHash: leaves[index],
    root: levels[levels.length - 1][0],
    path,
  };
}

/**
 * Verify inclusion proof against expected root.
 * @param {{ leafHash: string, root: string, path: AuditStep[] }} proof
 * @returns {boolean}
 */
export function verifyInclusion(proof) {
  let h = proof.leafHash;
  for (const step of proof.path) {
    h =
      step.position === 'left'
        ? combineHashes(step.sibling, h)
        : combineHashes(h, step.sibling);
  }
  return h === proof.root;
}

/**
 * Consistency proof: first `oldSize` leaves of `newLeaves` extend `oldLeaves`.
 * Verifier recomputes prefix root from `newLeaves` (offline, e.g. from git).
 * @param {string[]} oldLeaves
 * @param {string[]} newLeaves
 * @returns {{ oldRoot: string, newRoot: string, oldSize: number, newSize: number }}
 */
export function consistencyProof(oldLeaves, newLeaves) {
  const oldSize = oldLeaves.length;
  const newSize = newLeaves.length;
  if (newSize < oldSize) {
    throw new RangeError('consistencyProof: newSize must be >= oldSize');
  }
  const prefix = newLeaves.slice(0, oldSize);
  for (let i = 0; i < oldSize; i += 1) {
    if (prefix[i] !== oldLeaves[i]) {
      throw new Error('consistencyProof: newLeaves prefix mismatch');
    }
  }
  return {
    oldRoot: oldSize === 0 ? EMPTY_ROOT : merkleRoot(oldLeaves),
    newRoot: merkleRoot(newLeaves),
    oldSize,
    newSize,
  };
}

/**
 * Verify old root is a prefix of new tree at newSize.
 * @param {{ oldRoot: string, newRoot: string, oldSize: number, newSize: number }} proof
 * @param {string[]} newLeaves full leaf list at newSize
 * @returns {boolean}
 */
export function verifyConsistency(proof, newLeaves) {
  if (newLeaves.length !== proof.newSize) return false;
  if (merkleRoot(newLeaves) !== proof.newRoot) return false;
  if (proof.oldSize === 0) return proof.oldRoot === EMPTY_ROOT;
  const prefix = newLeaves.slice(0, proof.oldSize);
  return merkleRoot(prefix) === proof.oldRoot;
}
