/**
 * Учёт квот памяти — резерв, фиксация, освобождение
 * (S4 плана интеграции; заседание `tariff-grid`, ратифицировано владельцем 29.07).
 *
 * **Три класса памяти, и они не взаимозаменяемы** (вердикт M4):
 *  - `hot`   — рабочая область: её задействуют детекторы для пользовательских задач;
 *  - `cold`  — хранилище треков;
 *  - `buffer` — живой буфер записи (существовал до сетки, в пару hot/cold не сливается).
 *
 * **Матрица задаёт только потолок; занятое — состояние сервера** и в матрице не
 * живёт. Отсюда разделение: `limit` приходит из сетки, `occupied` и `reserved`
 * ведёт этот учёт.
 *
 * **Каждая запись обязана объявить класс.** Запись без класса — не «положим
 * куда-нибудь», а дефект контракта: неизвестно, какой потолок её сторожит.
 *
 * **Исчерпание — отказ на создание, но не на жизнь:** читать и удалять можно
 * всегда. Автовытеснение и тихая деградация запрещены: система не решает за
 * пользователя, что стереть, и не делает вид, что записала.
 *
 * **Переливать между классами нельзя:** свободное в холодной не покрывает нехватку
 * в горячей — это разные кладовые, а не два кармана одного кошелька.
 *
 * Модуль ЧИСТЫЙ: без fs, сети, часов и Nest. Состояние передаёт вызывающий.
 */

import type { TariffGridDocument, TariffSku } from './tariff-grid';
import { quotaLimit, resolveEntitlement } from './tariff-resolve';

/** Класс памяти. Закрытый список: новый класс — правка контракта, не строка. */
export type MemoryClass = 'hot' | 'cold' | 'buffer';

/** Право в сетке, задающее потолок каждого класса. */
export const QUOTA_ENTITLEMENT_BY_CLASS: Readonly<Record<MemoryClass, string>> = Object.freeze({
  hot: 'storage.hot',
  cold: 'storage.cold',
  buffer: 'storage.buffer',
});

/** Занятое и зарезервированное по классу — состояние сервера, не матрицы. */
export interface ClassUsage {
  /** Байты, лежащие на месте (зафиксированные). */
  readonly occupied: number;
  /** Байты под незавершёнными резервами: место занято, запись ещё не пришла. */
  readonly reserved: number;
}

/** Заявка на запись: сколько и КУДА. Класс обязателен. */
export interface WriteRequest {
  readonly memoryClass: MemoryClass;
  readonly bytes: number;
}

/** Почему отказано — причина называется, а не проглатывается. */
export type QuotaDenyReason =
  | 'missing_memory_class'
  | 'invalid_bytes'
  | 'no_quota_cell'
  | 'quota_exceeded';

/** Решение по заявке. При отказе назван зуб — молчаливого отказа не бывает. */
export interface QuotaDecision {
  readonly allowed: boolean;
  readonly memoryClass?: MemoryClass;
  readonly reason?: QuotaDenyReason;
  readonly toothId?: 'quota_exceeded' | 'memory_class_required';
  /** Сколько ещё влезет после этой заявки — витрине есть что показать. */
  readonly remainingAfter?: number;
  readonly limit?: number;
}

const ZERO_USAGE: ClassUsage = { occupied: 0, reserved: 0 };

/** Свободно в классе: потолок минус занятое и зарезервированное. */
export function remaining(limit: number, usage: ClassUsage = ZERO_USAGE): number {
  return Math.max(0, limit - usage.occupied - usage.reserved);
}

/**
 * Решение о резерве места под запись.
 *
 * Порядок проверок неслучаен: сперва класс (без него неизвестно, чей потолок
 * спрашивать), потом размер, потом наличие потолка в сетке, и лишь затем сам
 * потолок. Каждый отказ несёт причину и, где положено, имя зуба.
 */
export function decideReserve(
  grid: TariffGridDocument,
  sku: TariffSku,
  request: WriteRequest,
  usage: ClassUsage = ZERO_USAGE,
): QuotaDecision {
  const memoryClass = request?.memoryClass;
  if (!memoryClass || !(memoryClass in QUOTA_ENTITLEMENT_BY_CLASS)) {
    return {
      allowed: false,
      reason: 'missing_memory_class',
      toothId: 'memory_class_required',
    };
  }

  if (!Number.isFinite(request.bytes) || request.bytes < 0) {
    return { allowed: false, memoryClass, reason: 'invalid_bytes' };
  }

  const entitlementId = QUOTA_ENTITLEMENT_BY_CLASS[memoryClass];
  const limit = quotaLimit(resolveEntitlement(grid, sku, entitlementId));
  if (limit === undefined) {
    // Потолка нет — это не «сколько угодно», а неизвестность: deny-by-default.
    return { allowed: false, memoryClass, reason: 'no_quota_cell' };
  }

  const free = remaining(limit, usage);
  if (request.bytes > free) {
    return {
      allowed: false,
      memoryClass,
      reason: 'quota_exceeded',
      toothId: 'quota_exceeded',
      remainingAfter: free,
      limit,
    };
  }

  return { allowed: true, memoryClass, remainingAfter: free - request.bytes, limit };
}

/** Резерв принят: место занято под будущую запись. */
export function applyReserve(usage: ClassUsage, bytes: number): ClassUsage {
  return { occupied: usage.occupied, reserved: usage.reserved + bytes };
}

/** Запись пришла: резерв превращается в занятое. Резерв не может уйти в минус. */
export function applyCommit(usage: ClassUsage, bytes: number): ClassUsage {
  return {
    occupied: usage.occupied + bytes,
    reserved: Math.max(0, usage.reserved - bytes),
  };
}

/** Запись не пришла: резерв снят, занятое не тронуто. */
export function applyRelease(usage: ClassUsage, bytes: number): ClassUsage {
  return { occupied: usage.occupied, reserved: Math.max(0, usage.reserved - bytes) };
}

/** Удаление: занятое уменьшается. Разрешено ВСЕГДА, даже при переполнении. */
export function applyDelete(usage: ClassUsage, bytes: number): ClassUsage {
  return { occupied: Math.max(0, usage.occupied - bytes), reserved: usage.reserved };
}

/**
 * Разрешено ли чтение/удаление при исчерпанной квоте — да, всегда.
 * Функция существует ради явности: «read/delete живут» это решение заседания,
 * а не забытая ветка.
 */
export function isReadDeleteAllowed(): boolean {
  return true;
}

/**
 * Переполнен ли класс: занятое превысило потолок. Такое законно после
 * понижения тарифа (данные не стираются, вердикт M6) — и означает лишь запрет
 * НОВОГО, а не аварию.
 */
export function isOverQuota(limit: number, usage: ClassUsage = ZERO_USAGE): boolean {
  return usage.occupied > limit;
}
