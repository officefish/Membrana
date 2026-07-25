/**
 * Ed25519 signed checkpoints over Merkle roots.
 */

import { sign, verify } from 'node:crypto';

/**
 * @typedef {{ size: number, root: string, signature: string, keyId: string }} Checkpoint
 */

/**
 * Sign checkpoint head.
 * @param {import('node:crypto').KeyObject} privateKey
 * @param {{ size: number, root: string, keyId: string }} head
 * @returns {Checkpoint}
 */
export function signCheckpoint(privateKey, head) {
  const payload = JSON.stringify({ size: head.size, root: head.root, keyId: head.keyId });
  const signature = sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('hex');
  return { size: head.size, root: head.root, signature, keyId: head.keyId };
}

/**
 * Verify checkpoint signature.
 * @param {import('node:crypto').KeyObject} publicKey
 * @param {Checkpoint} checkpoint
 * @returns {boolean}
 */
export function verifyCheckpointSignature(publicKey, checkpoint) {
  const payload = JSON.stringify({
    size: checkpoint.size,
    root: checkpoint.root,
    keyId: checkpoint.keyId,
  });
  try {
    return verify(
      null,
      Buffer.from(payload, 'utf8'),
      publicKey,
      Buffer.from(checkpoint.signature, 'hex'),
    );
  } catch {
    return false;
  }
}
