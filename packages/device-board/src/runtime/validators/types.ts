/** Severity for validation findings (warnings do not block Run). */
export type UserCaseValidationSeverity = 'error' | 'warning';

/** Single validation finding with optional canvas pin/block binding (Phase 3 A2). */
export interface UserCaseValidationError {
  readonly code: string;
  readonly message: string;
  readonly blockId?: string;
  readonly pinId?: string;
  readonly path?: string;
  readonly severity?: UserCaseValidationSeverity;
}

/** Aggregated result of pure UserCase / subgraph validators. */
export interface UserCaseValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly UserCaseValidationError[];
}

export function isUserCaseValidationValid(errors: readonly UserCaseValidationError[]): boolean {
  return errors.every((error) => error.severity === 'warning');
}

export function toUserCaseValidationResult(
  errors: readonly UserCaseValidationError[],
): UserCaseValidationResult {
  return {
    isValid: isUserCaseValidationValid(errors),
    errors,
  };
}
