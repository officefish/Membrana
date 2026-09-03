/** Род нарушения формы. Валидаторы называют нарушение, а не просто отвергают значение. */
export type ShapeViolationKind =
  /** Значение вообще не объект (null, массив, примитив). */
  | 'not-an-object'
  /** Внутреннее поле, которому наружу хода нет: `storageRef`, `notes`. */
  | 'forbidden-field'
  /** Поле полноты-флага (`hasMore` и родня) — его в контракте нет намеренно. */
  | 'completeness-flag'
  /** Ключ, которого нет в закрытом списке имён. */
  | 'unknown-field'
  /** Обязательное поле отсутствует. */
  | 'missing-field'
  /** Поле на месте, но значение не того рода. */
  | 'invalid-value';

export interface ShapeViolation {
  readonly kind: ShapeViolationKind;
  /** Имя поля; `'$'` — само значение. */
  readonly field: string;
  readonly detail?: string;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
