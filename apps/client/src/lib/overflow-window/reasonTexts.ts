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

/** Фаза удержания (M4): без серверного id / с id. Лексика согласована с кабинетом. */
export const OVERFLOW_PHASE_TEXT: Record<RuntimeOverflowHoldPayload['phase'], string> = {
  held_local: 'удержание · ещё не подтверждено сервером',
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

/** Честная витрина тарифа при факте #2297 (M5 (б)). */
export const TARIFF_NO_TRANSITIONS_TEXT = 'доступных тарифов для перехода нет';

/** Явная строка, когда состояние узла не несёт счётчика (M5 (а)). */
export const NOT_AVAILABLE_TEXT = 'н/д';

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
