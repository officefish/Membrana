import { resolveBufferQuota } from './quota-status.js';
import type { StorageQuota } from './types.js';

export interface BufferFill {
  readonly usedBytes: number;
  readonly limitBytes: number;
}

export type BufferPressurePolicy = 'auto-cleanup' | 'stop';

/** Доля буфера, после которой человека предупреждают. */
export const BUFFER_STOP_WARN_RATIO = 0.9;

/** Доля буфера, после которой выбранная автоочистка должна сработать асинхронно. */
export const BUFFER_AUTO_CLEANUP_RATIO = 0.95;

/** Доля буфера, после которой выбранная остановка гасит сценарий насовсем. */
export const BUFFER_STOP_RATIO = 0.95;

export type BufferStopAction = 'run' | 'warn' | 'stop';

export interface BufferStopVerdict {
  readonly policy: BufferPressurePolicy;
  readonly action: BufferStopAction;
  /** Занятая доля буфера, 0..1; null — предела нет, судить нечем. */
  readonly filled: number | null;
  /** Сколько байт ещё влезет. */
  readonly freeBytes: number;
  /** Сколько минут записи осталось при наблюдаемом темпе; null — темп неизвестен. */
  readonly minutesLeft: number | null;
  /** В режиме автоочистки это сигнал уборщику; в режиме stop он только показывает развилку. */
  readonly autoCleanupDue: boolean;
  /** После stop сценарий возвращает только человек, не освобождение места само по себе. */
  readonly restart: 'manual';
  /** Буфер — квота приложения, не диск; сторож диска #2118 не получает ложный сигнал. */
  readonly notifyDiskWatchdog: boolean;
  /** Готовая фраза человеку: что, почему, сколько осталось и что делать. */
  readonly say: string;
}

export function stopDecision(
  fill: BufferFill,
  p: {
    policy?: BufferPressurePolicy;
    what?: string;
    bytesPerMinute?: number;
  } = {},
): BufferStopVerdict {
  const usedBytes = Number(fill.usedBytes) || 0;
  const limitBytes = Number(fill.limitBytes) || 0;
  const policy = p.policy ?? 'stop';
  const what = (p.what ?? '').trim() || 'запись';

  if (!(limitBytes > 0)) {
    return {
      policy,
      action: 'run',
      filled: null,
      freeBytes: 0,
      minutesLeft: null,
      autoCleanupDue: false,
      restart: 'manual',
      notifyDiskWatchdog: false,
      say: `${what}: предел буфера не объявлен, судить о заполнении нечем`,
    };
  }

  const filled = usedBytes / limitBytes;
  const freeBytes = Math.max(0, limitBytes - usedBytes);
  const rate = Number(p.bytesPerMinute);
  const minutesLeft =
    Number.isFinite(rate) && rate > 0 ? Math.max(0, Math.floor(freeBytes / rate)) : null;
  const autoCleanupDue = filled >= BUFFER_AUTO_CLEANUP_RATIO;
  const action: BufferStopAction =
    policy === 'stop' && filled >= BUFFER_STOP_RATIO
      ? 'stop'
      : filled >= BUFFER_STOP_WARN_RATIO
        ? 'warn'
        : 'run';

  return {
    policy,
    action,
    filled,
    freeBytes,
    minutesLeft,
    autoCleanupDue,
    restart: 'manual',
    notifyDiskWatchdog: false,
    say: sayOf(action, policy, what, filled, freeBytes, minutesLeft, autoCleanupDue),
  };
}

export function stopDecisionOf(
  quota: StorageQuota,
  p: { policy?: BufferPressurePolicy; what?: string; bytesPerMinute?: number } = {},
): BufferStopVerdict {
  return stopDecision(resolveBufferQuota(quota), p);
}

function sayOf(
  action: BufferStopAction,
  policy: BufferPressurePolicy,
  what: string,
  filled: number,
  freeBytes: number,
  minutesLeft: number | null,
  autoCleanupDue: boolean,
): string {
  const percent = Math.round(filled * 100);
  const left =
    minutesLeft === null
      ? `свободно ${mb(freeBytes)}`
      : `свободно ${mb(freeBytes)} — это ещё около ${minutesLeft} мин записи`;

  if (action === 'stop') {
    return `Остановлено насовсем: ${what}. Буфер заполнен на ${percent}%, ${left}. Автоочистка в этом режиме не запускается; разберитесь с буфером в «Управлении буфером» и запустите сценарий рукой.`;
  }
  if (autoCleanupDue && policy === 'auto-cleanup') {
    return `Буфер заполнен на ${percent}%: ${left}. Выбрана автоочистка, сценарий записи не останавливается.`;
  }
  if (action === 'warn') {
    return `Буфер заполнен на ${percent}%: ${left}. ${what} пока идёт, но пора разобраться с буфером.`;
  }
  return `${what}: буфер заполнен на ${percent}%, ${left}`;
}

function mb(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}
