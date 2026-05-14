import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyLinearWebhookSignature(
  secret: string,
  rawBody: Buffer,
  headerSignature: string | undefined,
): boolean {
  if (!headerSignature || typeof headerSignature !== 'string') {
    return false;
  }
  let headerBuf: Buffer;
  try {
    headerBuf = Buffer.from(headerSignature, 'hex');
  } catch {
    return false;
  }
  const computed = createHmac('sha256', secret).update(rawBody).digest();
  if (headerBuf.length !== computed.length) {
    return false;
  }
  try {
    return timingSafeEqual(headerBuf, computed);
  } catch {
    return false;
  }
}
