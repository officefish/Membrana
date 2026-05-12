/**
 * Иерархия доменных ошибок Membrana.
 *
 * Любая ошибка бизнес-логики наследуется от `DomainError`.
 * Технические ошибки (сеть, IO) остаются обычными `Error`.
 */

/** Корневая ошибка домена. */
export class DomainError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.cause = cause;
  }
}

/** Ошибка валидации входных данных. */
export class ValidationError extends DomainError {
  public readonly field?: string;

  constructor(message: string, field?: string, cause?: unknown) {
    super(message, 'VALIDATION_ERROR', cause);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/** Сущность не найдена. */
export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/** Конфликт состояния (например, дубликат). */
export class ConflictError extends DomainError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CONFLICT', cause);
    this.name = 'ConflictError';
  }
}
