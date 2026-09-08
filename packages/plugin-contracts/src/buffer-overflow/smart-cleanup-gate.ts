/**
 * ПЕРЕКЛЮЧАТЕЛЬ ВОЗМОЖНОСТИ УМНОЙ ОЧИСТКИ — один на монорепо (#2318; долг D-1 коворка
 * `cowork-buffer-full-stop`, решение владельца 07.09: серверный гейт).
 *
 * Данность T12 шторма `storm-buffer-full-stop-2026-09-06`: алгоритма умной очистки и её
 * параметров НЕ СУЩЕСТВУЕТ. Три слота S (`thresholdPercent`, `selection`, `protectLabeled`) —
 * закладки под T12, по ним ничего не отбирается и не удаляется. Пока это так, выбор режима
 * `smart_cleanup` ведёт в дыру: прибор при явно включённой умной очистке после отказа сервера
 * продолжает слать пробы (шлюз открыт по вердикту M3 «гасится при `stop`»).
 *
 * Отсюда гейт: пока переключатель выключен —
 *   - ЗАПИСЬ режима умной очистки отвергается на обоих серверах (кабинет `PUT …/buffer-policy`,
 *     media `PATCH :id/membrane`) причиной `SMART_CLEANUP_UNAVAILABLE_REASON` — конвенция 12.08,
 *     `200 { ok:false, reason }`, без 4xx; проверка идёт РАНЬШЕ проверки полноты параметров,
 *     иначе текст «не хватает параметров» лжёт о причине;
 *   - ЧТЕНИЕ (`effectiveBufferPolicy` на media, кабинете и клиенте) — fail-closed: умная очистка
 *     из базы/ответа (не должна там быть после backfill #2308) читается как `stop`;
 *   - кабинет показывает пункт выключенным с прямым текстом «недоступно до появления алгоритма».
 *
 * СНЯТИЕ ГЕЙТА, когда T12 появится: перевернуть `SMART_CLEANUP_AVAILABLE` здесь. Литеральный
 * тип `false as const` — не украшение: CJS-серверы (media, кабинет) рантайм-объект ESM-пакета
 * статически не импортируют и держат зеркало `false satisfies SmartCleanupAvailability`
 * (конвенция B-1 контракта интеграции); после переворота здесь их `tsc` краснеет ровно на
 * зеркалах — компилятор ведёт к двум оставшимся строкам, догадываться не нужно. ESM-потребители
 * (`apps/cabinet`, `apps/client`) читают константу напрямую.
 */
export const SMART_CLEANUP_AVAILABLE = false as const;
export type SmartCleanupAvailability = typeof SMART_CLEANUP_AVAILABLE;

/**
 * Причина отказа записи «умная очистка недоступна» — входит в закрытые списки причин отказа
 * записи обоих серверов (`BUFFER_POLICY_DENY_REASONS`), в словарь отказа ЗАГРУЗКИ (`reasons.ts`)
 * не входит: другая дверь, другой субъект (шов B→A контракта).
 */
export const SMART_CLEANUP_UNAVAILABLE_REASON = 'smart_cleanup_unavailable' as const;
export type SmartCleanupUnavailableReason = typeof SMART_CLEANUP_UNAVAILABLE_REASON;
