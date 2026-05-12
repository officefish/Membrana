/**
 * Базовые типы домена.
 */

/** Уникальный идентификатор сущности. */
export type Id = string;

/** Метка времени в миллисекундах (Unix epoch). */
export type Timestamp = number;

/** ISO-8601 строка даты-времени. */
export type IsoDateTime = string;

/**
 * Результат операции — либо успех со значением, либо ошибка.
 * Альтернатива throw/try-catch для предсказуемой обработки ошибок.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Произвольная сущность с идентификатором и временными метками. */
export interface Entity {
  readonly id: Id;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/** DeepReadonly: рекурсивно делает все поля readonly. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
