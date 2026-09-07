/**
 * Словарь причин отказа «места нет» — вердикт M2 заседания `buffer-full-stop` 06.09 (#2307).
 *
 * ЕДИНСТВЕННЫЙ носитель литералов в монорепо: сервер записей чеканит их при отказе, кабинет и
 * прибор — только импортируют и проверяют полноту. Второй объект с теми же строками где бы то
 * ни было — дефект (зуб `buffer-overflow-dictionary.test.ts` в media сканирует исходники).
 *
 * Закрытый набор M2 — два субъекта, которые ночь 05→06.09 не различала:
 *   `device_buffer_full`  — буфер прибора полон (ось `buffer` ответа `/quota`);
 *   `user_storage_full`   — хранилище коллекций пользователя полно (ось `userStorage`).
 *
 * Место для прочих причин (T15) — этот же объект; литералы там НЕ назначались комнатой и здесь
 * не выдумываются. Запрещены вердиктом: HTTP-код как причина, общий `quota_exceeded` без
 * субъекта, разбор английского `message`.
 *
 * Форма — как у `triggers.ts`: const-объект → union → предикат. Так один модуль даёт и рантайм
 * (ESM-потребителям), и тип (CJS-серверу через `import type`).
 */
export const BUFFER_OVERFLOW_REASONS = {
  DEVICE_BUFFER_FULL: 'device_buffer_full',
  USER_STORAGE_FULL: 'user_storage_full',
} as const;

export type BufferOverflowReason =
  (typeof BUFFER_OVERFLOW_REASONS)[keyof typeof BUFFER_OVERFLOW_REASONS];

const REASON_VALUES: ReadonlySet<string> = new Set(Object.values(BUFFER_OVERFLOW_REASONS));

export function isBufferOverflowReason(value: unknown): value is BufferOverflowReason {
  return typeof value === 'string' && REASON_VALUES.has(value);
}
