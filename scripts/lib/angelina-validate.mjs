/**
 * Валидатор возврата обезличенного субагента — isValid.
 *
 * Вердикт M1: возврат — структура с проверяемыми полями, не свободный текст.
 *   аналитик (analyst): {фактура, источник, пробелы}
 *   писарь   (scribe):  {дифф, что_открыто}
 * isValid гоняется ведущей ДО сборки результата в диалог: молчаливый провал
 * становится наблюдаемым предикатом. Ключи полей — дословно из вердикта.
 *
 * Правила:
 *   - содержательные поля (фактура, источник, дифф) — присутствуют И непусты;
 *   - поля пробелов (пробелы, что_открыто) — обязаны присутствовать,
 *     пустой список/строка легальны («пробелов не вижу» — тоже вердикт);
 *   - возврат не-объектом (свободный текст) — отвергается целиком.
 *
 * Чистая функция: без сети, без состояния, без побочных эффектов.
 */

import { SUBAGENT_KINDS } from './angelina-delegate.mjs';

/** Схема полей по родам: content — присутствует и непусто; presence — присутствует. */
const RETURN_SCHEMAS = Object.freeze({
  [SUBAGENT_KINDS.ANALYST]: Object.freeze({
    content: Object.freeze(['фактура', 'источник']),
    presence: Object.freeze(['пробелы']),
  }),
  [SUBAGENT_KINDS.SCRIBE]: Object.freeze({
    content: Object.freeze(['дифф']),
    presence: Object.freeze(['что_открыто']),
  }),
});

function isPresent(value) {
  return value !== undefined && value !== null;
}

function hasContent(value) {
  if (!isPresent(value)) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true; // числа, булевы — содержательны сами по себе
}

/**
 * @param {unknown} ret возврат субагента.
 * @param {string} kind род: 'analyst' | 'scribe' (SUBAGENT_KINDS).
 * @returns {{valid: boolean, missing: string[]}} missing — какие поля отсутствуют/пусты.
 * @throws {TypeError} неизвестный род — ошибка вызывающего, наблюдаемая.
 */
export function isValid(ret, kind) {
  const schema = RETURN_SCHEMAS[kind];
  if (!schema) {
    throw new TypeError(
      `isValid: неизвестный род субагента "${kind}" (ожидается analyst | scribe)`,
    );
  }

  const required = [...schema.content, ...schema.presence];
  if (ret === null || typeof ret !== 'object' || Array.isArray(ret)) {
    // Свободный текст (или иной не-объект) возвратом не является.
    return { valid: false, missing: required };
  }

  const missing = [];
  for (const field of schema.content) {
    if (!hasContent(ret[field])) missing.push(field);
  }
  for (const field of schema.presence) {
    if (!(field in ret) || !isPresent(ret[field])) missing.push(field);
  }

  return { valid: missing.length === 0, missing };
}
