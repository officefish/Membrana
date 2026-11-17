/**
 * Срок хранения архива понижения — закрытый список дней и его умолчание
 * (#2588 блок 2, b1; ADR-0031 п.4, консилиум 05.10; ратификация владельца 05.10).
 *
 * Истина срока — кабинет, на мембране (`MembraneArchiveRetention`). Office показывает и меняет
 * значение, media получает его снимком в приказе заморозки: `expiresAt = frozenAt + days`.
 * Смена срока на мембране старые партии НЕ пересчитывает (вердикт 4 — снимок).
 *
 * ДВА ПРАВИЛА БЕЗОПАСНОЙ СТОРОНЫ. (1) Отсутствие строки = умолчание 14 дней: строки не
 * заводятся при чтении и не backfill'ятся миграцией — по её отсутствию дверь office честно
 * говорит «по умолчанию». (2) Значение вне списка на чтении → 14, а не «как есть»: ошибка
 * в сторону ХРАНЕНИЯ, не удаления. Первый пояс закрытого списка — CHECK в миграции;
 * этот модуль — второй пояс.
 *
 * Модуль ЧИСТЫЙ: без fs, сети, Prisma и Nest.
 */

/** Допустимые сроки хранения, дней. 1 — для тестов, 14 — умолчание (слово владельца 05.10). */
export const RETENTION_DAYS = [1, 7, 14, 30, 90] as const;

export type RetentionDays = (typeof RETENTION_DAYS)[number];

/** Умолчание для каждой мембраны, у которой строки срока нет. */
export const DEFAULT_RETENTION_DAYS: RetentionDays = 14;

/** Ускоренный срок для живой приёмки и тестов. */
export const TEST_RETENTION_DAYS: RetentionDays = 1;

/**
 * Годится ли значение как срок: целое число из закрытого списка. Строка `'14'`, дробь,
 * ноль и отрицательные — не годятся; ослабление до `> 0` открыло бы запись «2 дня».
 */
export function isValidRetentionDays(value: unknown): value is RetentionDays {
  return typeof value === 'number' && (RETENTION_DAYS as readonly number[]).includes(value);
}

/**
 * Эффективный срок по хранимому значению. `null`/`undefined` (строки нет) и всё, что не
 * проходит `isValidRetentionDays`, дают умолчание — безопасная сторона хранения.
 */
export function resolveRetentionDays(stored: unknown): RetentionDays {
  return isValidRetentionDays(stored) ? stored : DEFAULT_RETENTION_DAYS;
}

/** Отказ записи срока вне закрытого списка; дверь b2 отвечает на него 400. */
export class InvalidRetentionDaysError extends Error {
  readonly code = 'invalid_retention_days' as const;

  constructor(readonly received: unknown) {
    super(`retention days must be one of ${RETENTION_DAYS.join(', ')}; received ${String(received)}`);
    this.name = 'InvalidRetentionDaysError';
  }
}
