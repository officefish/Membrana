/**
 * Утилиты общего назначения.
 */

import type { Result } from '../types/index.js';

/** Создаёт успешный результат. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Создаёт результат-ошибку. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Type guard: успешен ли результат. */
export function isOk<T, E>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

/** Type guard: ошибочен ли результат. */
export function isErr<T, E>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } {
  return !result.ok;
}

/** Простейший логгер на консоль. Заменяется на pino/winston при необходимости. */
export const logger = {
  info: (msg: string, meta?: Record<string, unknown>): void => {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${msg}`, meta ?? '');
  },
  warn: (msg: string, meta?: Record<string, unknown>): void => {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${msg}`, meta ?? '');
  },
  error: (msg: string, meta?: Record<string, unknown>): void => {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${msg}`, meta ?? '');
  },
} as const;

/** Создаёт уникальный идентификатор (заглушка, в проде — uuid/ulid). */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
