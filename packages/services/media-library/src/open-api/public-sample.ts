import type { MediaSample } from '../types.js';

import {
  FORBIDDEN_SAMPLE_FIELDS,
  PUBLIC_SAMPLE_FIELDS,
  type ForbiddenSampleField,
  type PublicSampleField,
} from './fields.js';
import { isPlainObject, type ShapeViolation } from './shape-violation.js';
import {
  TRACK_KEY_EXPIRES_FIELD,
  TRACK_KEY_FIELD,
  TRACK_KEY_FIELDS,
  type TrackKeyGrant,
} from './temporary-key.js';

/**
 * Одиннадцать постоянных полей. `Pick` по `MediaSample` держит имена честными на этапе
 * компиляции: выдуманное имя в `PUBLIC_SAMPLE_FIELDS` сломает сборку здесь.
 */
export type PublicSampleConstantFields = Pick<MediaSample, PublicSampleField>;

/**
 * Одиннадцать постоянных полей плюс ДВА поля ключа, оба обязательные (решение консилиума и
 * владельца 02.09; см. `temporary-key.ts`).
 *
 * Необязательности здесь нет намеренно: отсутствующее поле неотличимо от «ключ не выдан»,
 * «квота исчерпана» и «сериализатор забыл». Отказ выдать ключ обязан быть отказом запроса.
 */
export type PublicSample = PublicSampleConstantFields & {
  readonly [TRACK_KEY_FIELD]: string;
  readonly [TRACK_KEY_EXPIRES_FIELD]: string | null;
};

const FORBIDDEN: ReadonlySet<string> = new Set<string>(FORBIDDEN_SAMPLE_FIELDS);
const ALLOWED_CONSTANT: ReadonlySet<string> = new Set<string>(PUBLIC_SAMPLE_FIELDS);
const KEY_FIELDS: ReadonlySet<string> = new Set<string>(TRACK_KEY_FIELDS);

/**
 * Сериализатор наружу — ALLOW-LIST.
 *
 * Выход собирается из `PUBLIC_SAMPLE_FIELDS`, а не вычёркиванием запрещённого из входа.
 * Deny-list протекает при каждом новом внутреннем поле пробы; allow-list не протекает
 * никогда — какое бы поле ни завели внутри, наружу оно не поедет само.
 */
export function toPublicSample(sample: MediaSample, grant: TrackKeyGrant): PublicSample {
  const out: Record<string, unknown> = {};
  for (const field of PUBLIC_SAMPLE_FIELDS) {
    out[field] = sample[field];
  }
  // Выдача обязательна: без неё пробу наружу не отдают вовсе. Аргумент не опционален — тем
  // самым «забыл ключ» ловится компилятором, а не читателем ответа.
  out[TRACK_KEY_FIELD] = grant.url;
  out[TRACK_KEY_EXPIRES_FIELD] = grant.expiresAt;
  return out as PublicSample;
}

/** Имена постоянных полей, фактически присутствующие в значении (без полей ключа). */
export function publicSampleConstantFieldNames(value: unknown): string[] {
  if (!isPlainObject(value)) return [];
  return Object.keys(value).filter((key) => !KEY_FIELDS.has(key));
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
    if (key === TRACK_KEY_FIELD) {
      if (typeof value[key] !== 'string') {
        violations.push({ kind: 'invalid-value', field: key, detail: 'адрес ключа — строка' });
      }
      continue;
    }
    if (key === TRACK_KEY_EXPIRES_FIELD) {
      const v = value[key];
      if (v !== null && typeof v !== 'string') {
        violations.push({
          kind: 'invalid-value',
          field: key,
          detail: 'срок — ISO-строка или null (срок снят человеком)',
        });
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

  // Поля ключа обязательные наравне с постоянными: пропуск — не «ключа нет», а дефект формы.
  for (const field of TRACK_KEY_FIELDS) {
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
