/**
 * Run ledger — append-only signed Merkle log of procedure runs.
 */

import { leafHash } from './canonical.mjs';
import { EMPTY_ROOT, consistencyProof, inclusionProof, merkleRoot, verifyConsistency, verifyInclusion } from './merkle.mjs';
import { signCheckpoint, verifyCheckpointSignature } from './checkpoint.mjs';

export { canonicalBytes, canonicalizeValue, leafHash, normalizeString } from './canonical.mjs';
export {
  EMPTY_ROOT,
  buildLevels,
  combineHashes,
  consistencyProof,
  inclusionProof,
  merkleRoot,
  verifyConsistency,
  verifyInclusion,
} from './merkle.mjs';
export { signCheckpoint, verifyCheckpointSignature } from './checkpoint.mjs';

/**
 * @typedef {'inclusion' | 'consistency'} ProofKind
 */

/**
 * @typedef {import('./checkpoint.mjs').Checkpoint} Checkpoint
 */

/**
 * In-memory append-only run ledger.
 */
export class RunLedger {
  constructor() {
    /** @type {Record<string, unknown>[]} */
    this.runs = [];
    /** @type {string[]} */
    this.leaves = [];
  }

  get size() {
    return this.leaves.length;
  }

  /** @returns {string[]} */
  get leafHashes() {
    return this.leaves.slice();
  }

  /** @returns {string} */
  get root() {
    return this.leaves.length === 0 ? EMPTY_ROOT : merkleRoot(this.leaves);
  }

  /**
   * Append a run; returns leaf index.
   * @param {Record<string, unknown>} run
   * @returns {number}
   */
  appendRun(run) {
    const hash = leafHash(run);
    this.runs.push(run);
    this.leaves.push(hash);
    return this.leaves.length - 1;
  }

  /**
   * @param {number} index
   */
  inclusionProofAt(index) {
    return inclusionProof(this.leaves, index);
  }

  /**
   * @param {number} oldSize
   */
  consistencyProofFrom(oldSize) {
    const oldLeaves = this.leaves.slice(0, oldSize);
    return consistencyProof(oldLeaves, this.leaves);
  }

  /**
   * @param {import('node:crypto').KeyObject} privateKey
   * @param {string} keyId
   * @returns {Checkpoint}
   */
  checkpointOf(privateKey, keyId) {
    return signCheckpoint(privateKey, { size: this.size, root: this.root, keyId });
  }
}

/**
 * Offline verify: checkpoint signature + inclusion or consistency proof.
 * @param {Checkpoint} checkpoint
 * @param {import('node:crypto').KeyObject} publicKey
 * @param {{
 *   kind: 'inclusion',
 *   proof: ReturnType<typeof inclusionProof>,
 * } | {
 *   kind: 'consistency',
 *   proof: ReturnType<typeof consistencyProof>,
 *   newLeaves: string[],
 * }} evidence
 * @returns {boolean}
 */
export function verify(checkpoint, publicKey, evidence) {
  if (!verifyCheckpointSignature(publicKey, checkpoint)) return false;
  if (evidence.kind === 'inclusion') {
    if (checkpoint.size === 0 || checkpoint.root !== evidence.proof.root) return false;
    return verifyInclusion(evidence.proof);
  }
  if (checkpoint.root !== evidence.proof.newRoot || checkpoint.size !== evidence.proof.newSize) {
    return false;
  }
  return verifyConsistency(evidence.proof, evidence.newLeaves);
}
