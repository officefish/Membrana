export const OFFICE_REGISTRATION_CONSUME_PATH = '/v1/internal/cabinet/registration-codes/consume';
export const OFFICE_REGISTRATION_TIMEOUT_MS = 5_000;

export type RegistrationCodeMode = 'check' | 'redeem';

export type RegistrationRefusalReason = 'not_found' | 'revoked' | 'expired' | 'grant_mismatch' | 'exhausted';

export type RegistrationOutcome =
  | { kind: 'ok'; payload: unknown }
  | { kind: 'refused'; reason: RegistrationRefusalReason }
  | { kind: 'office-unavailable'; detail: string }
  | { kind: 'config-invalid'; detail: string };

export type ConfigProbeOutcome =
  | { kind: 'ok' }
  | { kind: 'office-unavailable'; detail: string }
  | { kind: 'config-invalid'; detail: string };

export function isRegistrationRefusalReason(value: unknown): value is RegistrationRefusalReason {
  return (
    value === 'not_found' ||
    value === 'revoked' ||
    value === 'expired' ||
    value === 'grant_mismatch' ||
    value === 'exhausted'
  );
}
