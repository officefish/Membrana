import type { MediaSample } from '../types.js';

import {
  FORBIDDEN_SAMPLE_FIELDS,
  PUBLIC_SAMPLE_FIELDS,
  type ForbiddenSampleField,
  type PublicSampleField,
} from './fields.js';
import { isPlainObject, type ShapeViolation } from './shape-violation.js';
import { TEMPORARY_KEY_FIELD, type TemporaryKeyField, type TemporaryKeyValue } from './temporary-key.js';

/**
 * Одиннадцать постоянных полей. `Pick` по `MediaSample` держит имена честными на этапе
 * компиляции: выдуманное имя в `PUBLIC_SAMPLE_FIELDS` сломает сборку здесь.
 */
export type PublicSampleConstantFields = Pick<MediaSample, PublicSampleField>;

/** Постоянные поля плюс временное поле ключа (необязательное). */
export type PublicSample = PublicSampleConstantFields & {
  readonly [K in TemporaryKeyField]?: TemporaryKeyValue;
};

const FORBIDDEN: ReadonlySet<string> = new Set<string>(FORBIDDEN_SAMPLE_FIELDS);
const ALLOWED_CONSTANT: ReadonlySet<string> = new Set<string>(PUBLIC_SAMPLE_FIELDS);

/**
 * Сериализатор наружу — ALLOW-LIST.
 *
 * Выход собирается из `PUBLIC_SAMPLE_FIELDS`, а не вычёркиванием запрещённого из входа.
 * Deny-list протекает при каждом новом внутреннем поле пробы; allow-list не протекает
 * никогда — какое бы поле ни завели внутри, наружу оно не поедет само.
 */
export function toPublicSample(sample: MediaSample, temporaryKey?: TemporaryKeyValue): PublicSample {
  const out: Record<string, unknown> = {};
  for (const field of PUBLIC_SAMPLE_FIELDS) {
    out[field] = sample[field];
  }
  if (temporaryKey !== undefined) {
    out[TEMPORARY_KEY_FIELD] = temporaryKey;
  }
  return out as PublicSample;
}

/** Имена постоянных полей, фактически присутствующие в значении (без поля ключа). */
export function publicSampleConstantFieldNames(value: unknown): string[] {
  if (!isPlainObject(value)) return [];
  return Object.keys(value).filter((key) => key !== TEMPORARY_KEY_FIELD);
}

/**
 * Валидатор формы пробы. Пустой массив — форма верна.
 *
 * Существует затем, чтобы ОТСУТСТВИЕ `storageRef`/`notes` было проверяемым свойством, а не
 * строчкой документации: порча сериализатора обязана краснеть здесь.
 */
export function validatePublicSampleShape(value: unknown): ShapeViolation[] {
  if (!isPlainObject(value)) {
    return [{ kind: 'not-an-object', field: '$', detail: 'проба наружу должна быть объектом' }];
  }

  const violations: ShapeViolation[] = [];

  for (const key of Object.keys(value)) {
    if (FORBIDDEN.has(key)) {
      violations.push({
        kind: 'forbidden-field',
        field: key,
        detail: 'внутреннее поле пробы наружу не едет (вердикт M2)',
      });
      continue;
    }
    if (key === TEMPORARY_KEY_FIELD) {
      if (typeof value[key] !== 'string') {
        violations.push({ kind: 'invalid-value', field: key, detail: 'ключ — строка' });
      }
      continue;
    }
    if (!ALLOWED_CONSTANT.has(key)) {
      violations.push({ kind: 'unknown-field', field: key });
    }
  }

  for (const field of PUBLIC_SAMPLE_FIELDS) {
    if (!(field in value)) {
      violations.push({ kind: 'missing-field', field });
    }
  }

  return violations;
}

/** Присутствует ли в значении запрещённое поле — короткая форма для порча-зубов. */
export function forbiddenFieldsIn(value: unknown): ForbiddenSampleField[] {
  if (!isPlainObject(value)) return [];
  return FORBIDDEN_SAMPLE_FIELDS.filter((field) => field in value);
}
