import type { RuntimeOverflowHoldPayload } from '@membrana/core';
import {
  BUFFER_OVERFLOW_REASONS,
  isBufferOverflowReason,
  type BufferOverflowReason,
  type OverflowPolicy,
  type QuotaSubject,
} from '@membrana/plugin-contracts';

import type { OverflowHoldAxis } from '@/lib/device-overflow-hold';

/**
 * ЕДИНСТВЕННАЯ таблица код→текст причин переполнения (M5 (а), #2310).
 *
 * Ключ — импортированный union словаря A (`@membrana/plugin-contracts`): третий литерал в
 * словаре без строки здесь — красный `tsc` (`Record<BufferOverflowReason, string>` требует
 * полноты). Окно, плашка панели записи, строка статуса и бейдж доски читают ТОЛЬКО отсюда —
 * вторая таблица в монорепо ловится структурным зубом `structural.test.ts`.
 */
export const OVERFLOW_REASON_TEXT: Record<BufferOverflowReason, string> = {
  [BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL]: 'Буфер прибора полон',
  [BUFFER_OVERFLOW_REASONS.USER_STORAGE_FULL]: 'Хранилище наборов полно',
};

/** Ось квоты, по которой пришёл отказ: буфер прибора либо хранилище наборов (T4 — показываем обе). */
export const OVERFLOW_REASON_AXIS: Record<BufferOverflowReason, QuotaSubject> = {
  [BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL]: 'buffer',
  [BUFFER_OVERFLOW_REASONS.USER_STORAGE_FULL]: 'userStorage',
};

/** Заголовок окна стабилен (Верстальщик, M5): не «Ошибка 453», а факт словами. */
export const OVERFLOW_WINDOW_TITLE = 'Буфер полон';

/** Неизвестный код: заголовок остаётся, сырой код едет приглушённой строкой — не молчание. */
export interface OverflowReasonDescription {
  readonly code: string;
  readonly text: string;
  /** `null` — код известен; иначе сырой код для приглушённой строки. */
  readonly rawCode: string | null;
  readonly axis: QuotaSubject | null;
}

export function describeOverflowReason(code: string): OverflowReasonDescription {
  if (isBufferOverflowReason(code)) {
    return { code, text: OVERFLOW_REASON_TEXT[code], rawCode: null, axis: OVERFLOW_REASON_AXIS[code] };
  }
  return { code, text: OVERFLOW_WINDOW_TITLE, rawCode: code, axis: null };
}

/**
 * Фаза удержания (M4): без серверного id / с id. Лексика согласована с кабинетом.
 *
 * `held_local` — ПОСТОЯННОЕ состояние любой остановки при политике `stop`, а не переходное
 * (#2533): страж прибора входит при 95 % (`BUFFER_STOP_RATIO`), сервер отказал бы при 100 %,
 * а после стража шлюз не выпускает ни одной пробы — сервер эпизода не чеканит никогда.
 * Слово «ещё не подтверждено» обещало подтверждение, которого не бывает; сказано, как есть.
 */
export const OVERFLOW_PHASE_TEXT: Record<RuntimeOverflowHoldPayload['phase'], string> = {
  held_local: 'удержание · по стражу прибора (до отказа сервера не дошло)',
  held: 'удержание · подтверждено сервером',
};

/** Режим прибора — снимок политики из ответа отказа (главенство сервера, контракт §1). */
export const OVERFLOW_POLICY_TEXT: Record<OverflowPolicy, string> = {
  stop: 'остановка',
  smart_cleanup: 'умная очистка',
};

export const OVERFLOW_AXIS_TITLE: Record<QuotaSubject, string> = {
  buffer: 'Буфер прибора',
  userStorage: 'Коллекции (хранилище наборов)',
};

/** Согласованная с кабинетом лексика M4: прибор на связи, детекция живёт, проб не пишет. */
export const OVERFLOW_ALIVE_TEXT = 'жив, не пишет';

/**
 * Состояние МЕСТА по живой оси причины (#2533) — отдельно от факта удержания:
 *  - `full` — место всё ещё занято не ниже порога стража (`BUFFER_STOP_RATIO`);
 *  - `freed` — место освобождено (вывоз в набор / чистка снаружи), а удержание не снято:
 *    снимает только человек (M3 DoD 7) — окно обязано сказать это словами, а не «полон» при 0 B;
 *  - `unknown` — живой оси нет (снимка библиотеки нет либо код причины неизвестен) — говорим о
 *    факте остановки, как и раньше.
 */
export type OverflowStanding = 'full' | 'freed' | 'unknown';

/** Заголовок при освобождённом месте — развилка 1 плана #2533, умолчание владельца. */
export const OVERFLOW_FREED_TITLE = 'Место освобождено — снимите удержание';

export const OVERFLOW_TITLE_BY_STANDING: Record<OverflowStanding, string> = {
  full: OVERFLOW_WINDOW_TITLE,
  unknown: OVERFLOW_WINDOW_TITLE,
  freed: OVERFLOW_FREED_TITLE,
};

/** Плашка окна при удержании — по состоянию места; вне окна тот же текст читают бейдж и панель. */
export const OVERFLOW_HELD_TEXT_BY_STANDING: Record<OverflowStanding, string> = {
  full: `Прибор ${OVERFLOW_ALIVE_TEXT}: новые пробы не отправляются, связь и наблюдение живут. Само не возобновится.`,
  unknown: `Прибор ${OVERFLOW_ALIVE_TEXT}: новые пробы не отправляются, связь и наблюдение живут. Само не возобновится.`,
  freed: `Прибор ${OVERFLOW_ALIVE_TEXT}: место освобождено, удержание держится до вашего слова.`,
};

/** Честная витрина тарифа при факте #2297 (M5 (б)). */
export const TARIFF_NO_TRANSITIONS_TEXT = 'доступных тарифов для перехода нет';

/** Явная строка, когда состояние узла не несёт счётчика (M5 (а)). */
export const NOT_AVAILABLE_TEXT = 'н/д';

/**
 * Момент чтения предела (#2538): величина без момента чтения не живая. Окно обязано сказать,
 * КОГДА предел прочитан, а при отказе чтения — что показан снимок (развилка 4: числа не
 * скрываются, помечается источник). Тексты — только здесь (структурный зуб).
 */
export interface QuotaReadState {
  /** Последнее чтение удалось (не серверный бэкенд считается прочитанным: локальный предел). */
  readonly fresh: boolean;
  /** ISO момента последнего успешного чтения; `null` — успешного чтения ещё не было. */
  readonly readAt: string | null;
}

export const QUOTA_READ_FRESH_PREFIX = 'предел сервера прочитан';
export const QUOTA_READ_STALE_PREFIX = 'предел не прочитан — показан снимок от';
export const QUOTA_READ_NONE_TEXT = 'предел не прочитан — снимка ещё нет';

export function describeQuotaRead(state: QuotaReadState): string {
  if (state.readAt === null) {
    return state.fresh ? `${QUOTA_READ_FRESH_PREFIX}: момент чтения ${NOT_AVAILABLE_TEXT}` : QUOTA_READ_NONE_TEXT;
  }
  const at = formatReadAt(state.readAt);
  return state.fresh ? `${QUOTA_READ_FRESH_PREFIX} ${at}` : `${QUOTA_READ_STALE_PREFIX} ${at}`;
}

/** Время чтения в локали оператора (только часы:минуты:секунды — дата у окна своя). */
export function formatReadAt(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleTimeString();
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return NOT_AVAILABLE_TEXT;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Остаток по оси словами: «свободно X из Y»; оси нет — «н/д». */
export function formatAxisRemaining(axis: OverflowHoldAxis | null): string {
  if (axis === null) return `свободно: ${NOT_AVAILABLE_TEXT}`;
  const free = Math.max(0, axis.limitBytes - axis.usedBytes);
  return `свободно ${formatBytes(free)} из ${formatBytes(axis.limitBytes)}`;
}

/** Время факта в локали оператора; непарсимое ISO показываем как есть, не прячем. */
export function formatOverflowAt(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString();
}
