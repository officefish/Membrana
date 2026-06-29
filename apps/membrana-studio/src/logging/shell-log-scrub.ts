/**
 * Redact sensitive fragments before writing M1 shell logs.
 * @see docs/DESKTOP_APP_LOGGING_POLICY.md §8
 */

const BEARER_RE = /Bearer\s+\S+/gi;
const AUTH_HEADER_RE = /authorization['":\s]+[^\s'"]+/gi;
const PAIRING_TOKEN_RE = /pairingToken['":\s=]+(?:'[^']*'|"[^"]*"|\S+)/gi;

/** Scrub tokens and credentials from a log line. */
export function scrubLogMessage(message: string): string {
  return message
    .replace(BEARER_RE, 'Bearer [redacted]')
    .replace(AUTH_HEADER_RE, 'authorization [redacted]')
    .replace(PAIRING_TOKEN_RE, 'pairingToken [redacted]');
}
