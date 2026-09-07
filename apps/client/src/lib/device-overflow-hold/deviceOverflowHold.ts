import type { RuntimeOverflowHoldPayload } from '@membrana/core';

import type {
  DeviceOverflowHold,
  HoldActivation,
  HoldChange,
  HoldListener,
  HoldReleaseBy,
  LocalGuardSnapshot,
  OverflowHoldEpisode,
  OverflowHoldStore,
  OverflowRefusalSnapshot,
  StartAttempt,
  WindowSignalListener,
} from './types';

export const OVERFLOW_HOLD_STORE_KEY = 'membrana.device-overflow-hold.v1';

/** Память эпизода сверх процесса: перезагрузка страницы прибора не должна «забыть» стоп. */
export function createLocalStorageOverflowHoldStore(): OverflowHoldStore {
  return {
    load(): OverflowHoldEpisode | null {
      try {
        const raw = globalThis.localStorage?.getItem(OVERFLOW_HOLD_STORE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<OverflowHoldEpisode> | null;
        if (!parsed || typeof parsed.reason !== 'string' || typeof parsed.overflowAt !== 'string') {
          return null;
        }
        if (parsed.policy !== 'stop' && parsed.policy !== 'smart_cleanup') return null;
        return {
          overflowId: typeof parsed.overflowId === 'string' ? parsed.overflowId : null,
          overflowAt: parsed.overflowAt,
          reason: parsed.reason,
          policy: parsed.policy,
          source: parsed.source === 'server' ? 'server' : 'local',
          buffer: parsed.buffer ?? null,
          userStorage: parsed.userStorage ?? null,
          enteredAtMs: typeof parsed.enteredAtMs === 'number' ? parsed.enteredAtMs : Date.now(),
        };
      } catch {
        return null;
      }
    },
    save(episode: OverflowHoldEpisode | null): void {
      try {
        if (episode === null) {
          globalThis.localStorage?.removeItem(OVERFLOW_HOLD_STORE_KEY);
        } else {
          globalThis.localStorage?.setItem(OVERFLOW_HOLD_STORE_KEY, JSON.stringify(episode));
        }
      } catch {
        /* нет хранилища — живём памятью процесса */
      }
    },
  };
}

export function createMemoryOverflowHoldStore(initial: OverflowHoldEpisode | null = null): OverflowHoldStore {
  let value = initial;
  return {
    load: () => value,
    save: (episode) => {
      value = episode;
    },
  };
}

export interface DeviceOverflowHoldOptions {
  readonly store?: OverflowHoldStore;
  readonly now?: () => number;
}

/**
 * Один носитель удержания на прибор (M3 (в)/(г), #2309).
 *
 * Два входа — сервер (главный) и локальный страж — пишут в ОДИН эпизод; плагин микрофона и
 * доска устройства — тонкие адаптеры, у них нет своих флагов. Один `overflowId` → один сигнал
 * окна (T9); повторный старт при удержании отбивается тем же фактом и снова даёт сигнал (T5);
 * эпизод переживает рестарт сценария (синглтон уровня приложения + снимок в store); выход —
 * только `release('human' | 'cleanup')`: авто-возобновления по освобождению места нет.
 */
export class DeviceOverflowHoldImpl implements DeviceOverflowHold {
  private episode: OverflowHoldEpisode | null;

  private readonly store: OverflowHoldStore;

  private readonly now: () => number;

  private readonly listeners = new Set<HoldListener>();

  private readonly windowListeners = new Set<WindowSignalListener>();

  constructor(options: DeviceOverflowHoldOptions = {}) {
    this.store = options.store ?? createLocalStorageOverflowHoldStore();
    this.now = options.now ?? (() => Date.now());
    // Восстановленный эпизод — тот же факт: окно по нему само не поднимается (сигнал только
    // на вход и на отбитый старт), но `isHeld()` уже истинен — застучать после reload нельзя.
    this.episode = this.store.load();
  }

  activateFromServer(refusal: OverflowRefusalSnapshot): HoldActivation {
    const current = this.episode;
    if (current !== null && current.overflowId === refusal.overflowId) {
      return 'unchanged';
    }
    const next: OverflowHoldEpisode = {
      overflowId: refusal.overflowId,
      overflowAt: refusal.overflowAt,
      reason: refusal.reason,
      policy: refusal.overflowPolicy,
      source: 'server',
      buffer: refusal.buffer,
      userStorage: refusal.userStorage,
      enteredAtMs: current?.enteredAtMs ?? this.now(),
    };
    if (current !== null && current.overflowId === null) {
      // Локальный эпизод повышается до серверного: тот же факт, окно уже поднято — без сигнала.
      this.commit(next, 'promoted');
      return 'promoted';
    }
    // Пусто — или сервер чеканил НОВЫЙ эпизод (место освобождали и заполнили снова): сервер главнее.
    this.commit(next, 'entered');
    this.emitWindow({ overflowId: next.overflowId, episode: next, cause: 'entered', attempt: null });
    return 'entered';
  }

  activateFromLocalGuard(guard: LocalGuardSnapshot): HoldActivation {
    if (guard.policy !== 'stop') {
      return 'ignored';
    }
    if (this.episode !== null) {
      // Страж не понижает и не переписывает ни серверный, ни свой прежний эпизод.
      return 'unchanged';
    }
    const enteredAtMs = this.now();
    const next: OverflowHoldEpisode = {
      overflowId: null,
      overflowAt: new Date(enteredAtMs).toISOString(),
      reason: guard.reason,
      policy: 'stop',
      source: 'local',
      buffer: guard.buffer,
      userStorage: null,
      enteredAtMs,
    };
    this.commit(next, 'entered');
    this.emitWindow({ overflowId: null, episode: next, cause: 'entered', attempt: null });
    return 'entered';
  }

  isHeld(): boolean {
    return this.episode !== null && this.episode.policy === 'stop';
  }

  getEpisode(): OverflowHoldEpisode | null {
    return this.episode;
  }

  subscribe(listener: HoldListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeWindowSignal(listener: WindowSignalListener): () => void {
    this.windowListeners.add(listener);
    return () => {
      this.windowListeners.delete(listener);
    };
  }

  refuseStart(attempt: StartAttempt): boolean {
    const episode = this.episode;
    if (episode === null || !this.isHeld()) {
      return false;
    }
    this.emitWindow({ overflowId: episode.overflowId, episode, cause: 'start-refused', attempt });
    return true;
  }

  release(by: HoldReleaseBy): void {
    if (this.episode === null) return;
    void by;
    this.commit(null, 'released');
  }

  toRuntimePayload(): RuntimeOverflowHoldPayload | null {
    return overflowHoldToRuntimePayload(this.episode);
  }

  private commit(next: OverflowHoldEpisode | null, change: HoldChange): void {
    this.episode = next;
    this.store.save(next);
    for (const listener of this.listeners) {
      listener(next, change);
    }
  }

  private emitWindow(signal: Parameters<WindowSignalListener>[0]): void {
    for (const listener of this.windowListeners) {
      listener(signal);
    }
  }
}

/** Проекция эпизода в значение состояния узла (M4 (б)); `null` — удержания нет. */
export function overflowHoldToRuntimePayload(
  episode: OverflowHoldEpisode | null,
): RuntimeOverflowHoldPayload | null {
  if (episode === null) return null;
  return {
    phase: episode.overflowId === null ? 'held_local' : 'held',
    reason: episode.reason,
    overflowId: episode.overflowId,
    overflowAt: episode.overflowAt,
    policy: episode.policy,
  };
}

/** Слово человеку о факте удержания — без таблицы код→текст (она у 4/4, M5). */
export function describeOverflowHold(episode: OverflowHoldEpisode): string {
  const id = episode.overflowId === null ? 'эпизод ещё не подтверждён сервером' : `эпизод ${episode.overflowId}`;
  return (
    `Остановлено: буфер полон (${episode.reason}; ${id}). ` +
    'Новые пробы не отправляются, запись не ведётся; связь с сервером и наблюдение живут. ' +
    'Разберитесь с буфером: вывоз в набор или очистка — само не возобновится.'
  );
}

let singleton: DeviceOverflowHoldImpl | null = null;

/** Один носитель на прибор — уровень приложения, не плагина и не сценария. */
export function getDeviceOverflowHold(): DeviceOverflowHold {
  if (singleton === null) {
    singleton = new DeviceOverflowHoldImpl();
  }
  return singleton;
}

/** Тесты: пересоздать носитель с памятью в процессе (или заданным store). */
export function resetDeviceOverflowHoldForTests(options: DeviceOverflowHoldOptions = {}): DeviceOverflowHold {
  singleton = new DeviceOverflowHoldImpl({
    store: options.store ?? createMemoryOverflowHoldStore(),
    ...(options.now ? { now: options.now } : {}),
  });
  return singleton;
}
