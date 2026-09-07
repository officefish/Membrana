import { getDefaultMediaLibraryService } from '@membrana/media-library-service';

import { getDeviceOverflowHold } from './deviceOverflowHold';
import type { DeviceOverflowHold } from './types';

/** M4 (а): чтение квоты после стопа — не реже раза в минуту. */
export const OVERFLOW_HOLD_QUOTA_READ_INTERVAL_MS = 60_000;

export interface OverflowHoldVitalsOptions {
  readonly hold?: DeviceOverflowHold;
  /** Чтение квоты; по умолчанию — `refresh()` библиотеки (GET /quota у серверного бэкенда). */
  readonly readQuota?: () => Promise<void> | void;
  readonly intervalMs?: number;
}

function defaultReadQuota(): Promise<void> {
  return getDefaultMediaLibraryService()
    .refresh()
    .catch(() => {
      /* сеть — не повод останавливать жизнь узла; следующий тик прочитает снова */
    });
}

/**
 * Жизнь после остановки (M4 (а)): пока прибор удержан, квота читается ≥ 1/мин — сервер и
 * оператор видят, что узел жив и следит за местом. Heartbeat узла (120 с) здесь не трогается:
 * он живёт в `nodeRealtimeClient` и об удержании не знает — это и есть гарантия T16.
 *
 * Чтение квоты НИКОГДА не снимает удержание — оно только читает (DoD «нет авто-возобновления»).
 */
export function startOverflowHoldVitals(options: OverflowHoldVitalsOptions = {}): () => void {
  const hold = options.hold ?? getDeviceOverflowHold();
  const readQuota = options.readQuota ?? defaultReadQuota;
  const intervalMs = options.intervalMs ?? OVERFLOW_HOLD_QUOTA_READ_INTERVAL_MS;

  let timer: ReturnType<typeof setInterval> | null = null;

  const stopTicking = (): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const tick = (): void => {
    void readQuota();
  };

  const startTicking = (): void => {
    if (timer !== null) return;
    tick();
    timer = setInterval(tick, intervalMs);
  };

  const sync = (): void => {
    if (hold.getEpisode() !== null) {
      startTicking();
    } else {
      stopTicking();
    }
  };

  const unsubscribe = hold.subscribe(() => sync());
  sync();

  return () => {
    unsubscribe();
    stopTicking();
  };
}
