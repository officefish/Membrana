export type RegistryIndexErrorCode =
  | 'SOURCE_FAILED'
  | 'DECODE_FAILED'
  | 'MALFORMED_RECORD'
  | 'DUPLICATE_ID'
  | 'DANGLING_PREDECESSOR'
  | 'FORK'
  | 'MERGE'
  | 'CYCLE'
  | 'CANONICAL_REF_MISMATCH'
  | 'AMBIGUOUS_CANONICAL_REF'
  | 'MALFORMED_ID'
  | 'UNKNOWN_ID'
  | 'MALFORMED_CANONICAL_REF'
  | 'UNKNOWN_CANONICAL_REF';

export interface RegistryIndexErrorOptions {
  readonly ids?: readonly string[];
  readonly lineNumber?: number;
}

export class RegistryIndexError extends Error {
  readonly code: RegistryIndexErrorCode;
  readonly ids: readonly string[];
  readonly lineNumber: number | undefined;

  constructor(
    code: RegistryIndexErrorCode,
    message: string,
    options: RegistryIndexErrorOptions = {},
  ) {
    super(message);
    this.name = 'RegistryIndexError';
    this.code = code;
    this.ids = Object.freeze([...new Set(options.ids ?? [])].sort());
    this.lineNumber = options.lineNumber;
  }
}
