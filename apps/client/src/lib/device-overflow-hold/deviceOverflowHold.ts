import type { RuntimeOverflowHoldPayload } from '@membrana/core';
import { isOverflowPolicy } from '@membrana/plugin-contracts';

import type {
  DeviceOverflowHold,
  HoldActivation,
  HoldChange,
  HoldListener,
  HoldReleaseBy,
  LocalGuardSnapshot,
  OverflowHoldEpisode,
  OverflowHoldOwner,
  OverflowHoldStore,
  OverflowRefusalSnapshot,
  OwnerReconcileOutcome,
  StartAttempt,
  WindowSignalListener,
} from './types';

export const OVERFLOW_HOLD_STORE_KEY = 'membrana.device-overflow-hold.v1';

/**
 * Владелец — в ПОЛЕ эпизода, а не в ключе хранилища (#2463, выбор обоснован здесь).
 *
 * Ключ с идентификатором внутри («…v1:<membraneId>:<deviceId>») выглядит строже — чужое
 * физически не прочитать, — но у прибора владелец известен НЕ в момент чтения: в Студии
 * привязка лежит в шифртексте safeStorage и поднимается обещанием (ADR-0028 Р4), а эпизод
 * читается синхронно в конструкторе носителя. Ключ пришлось бы собирать из «ещё неизвестно»,
 * то есть читать анонимную ячейку и потом перечитывать по второму ключу — и хранилище
 * заросло бы ячейками каждой прошлой привязки, ни одна из которых никогда не чистится.
 *
 * Поле + сверка на чтении даёт то же свойство и одно место хранения: чужой эпизод не
 * возвращается наружу и УДАЛЯЕТСЯ, а сверка происходит тогда, когда владелец действительно
 * известен (`reconcileOwner`), а не тогда, когда понадобился ключ.
 */
function parseOverflowHoldOwner(value: unknown): OverflowHoldOwner | null {
  if (value === null || typeof value !== 'object') return null;
  const raw = value as { kind?: unknown; membraneId?: unknown; deviceId?: unknown };
  if (raw.kind === 'autonomous') return { kind: 'autonomous' };
  if (raw.kind !== 'membrane') return null;
  if (typeof raw.membraneId !== 'string' || raw.membraneId.length === 0) return null;
  if (typeof raw.deviceId !== 'string' || raw.deviceId.length === 0) return null;
  return { kind: 'membrane', membraneId: raw.membraneId, deviceId: raw.deviceId };
}

/** Один владелец или разные: мембрана И прибор, иначе автономный с автономным. */
export function sameOverflowHoldOwner(a: OverflowHoldOwner, b: OverflowHoldOwner): boolean {
  if (a.kind === 'autonomous' || b.kind === 'autonomous') return a.kind === b.kind;
  return a.membraneId === b.membraneId && a.deviceId === b.deviceId;
}

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
        if (!isOverflowPolicy(parsed.policy)) return null;
        return {
          overflowId: typeof parsed.overflowId === 'string' ? parsed.overflowId : null,
          overflowAt: parsed.overflowAt,
          reason: parsed.reason,
          policy: parsed.policy,
          source: parsed.source === 'server' ? 'server' : 'local',
          buffer: parsed.buffer ?? null,
          userStorage: parsed.userStorage ?? null,
          enteredAtMs: typeof parsed.enteredAtMs === 'number' ? parsed.enteredAtMs : Date.now(),
          // Битая или незнакомая подпись — это ОТСУТСТВИЕ подписи, а не «подходит любому»:
          // неподписанный эпизод из хранилища сверка отбрасывает.
          owner: parseOverflowHoldOwner(parsed.owner),
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
  /** Владелец, известный уже при создании носителя; `null`/пропуск — ещё неизвестен (#2463). */
  readonly owner?: OverflowHoldOwner | null;
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

  /** Владелец прибора сейчас; `null` — привязка ещё не прочитана (#2463). */
  private owner: OverflowHoldOwner | null;

  /**
   * Эпизод поднят из хранилища БЕЗ подписи. Это единственное, чем «чужой, записанный прошлой
   * версией» отличается от «своего, открытого до чтения привязки»: второй наблюдён в этом
   * процессе на этом приборе и потому подписывается, первый — доказать своим нельзя.
   */
  private unsignedFromStore: boolean;

  constructor(options: DeviceOverflowHoldOptions = {}) {
    this.store = options.store ?? createLocalStorageOverflowHoldStore();
    this.now = options.now ?? (() => Date.now());
    this.owner = options.owner ?? null;
    // Восстановленный эпизод — тот же факт: окно по нему само не поднимается (сигнал только
    // на вход и на отбитый старт), но `isHeld()` уже истинен — застучать после reload нельзя.
    this.episode = this.store.load();
    this.unsignedFromStore = this.episode !== null && this.episode.owner === null;
    // Владелец известен уже сейчас — судим поднятый эпизод до того, как его кто-то увидит.
    this.reconcileOwner(this.owner);
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
      owner: this.owner ?? current?.owner ?? null,
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
      owner: this.owner,
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

  /**
   * Сверка эпизода с владельцем прибора (#2463). Асимметрия намеренная и односторонняя:
   *
   *  - владелец НЕИЗВЕСТЕН (`null`: привязка ещё не поднята, режим не выбран) → не судим
   *    вовсе. Своё удержание не снимается ни само, ни по неуверенности (норма 25.09);
   *  - владелец известен и совпал → эпизод наш, держим до человека;
   *  - владелец известен, эпизод подписан ДРУГИМ → эпизод не наш: убираем целиком, вместе
   *    с записью в хранилище. Оператору нельзя показывать чужие числа как свои, и чужой
   *    эпизод не имеет права держать запись на новом приборе;
   *  - владелец известен, эпизод без подписи и поднят из хранилища → доказать своим нечем,
   *    убираем так же. Это и разовый переход на подпись, и ровно случай 25.09. Цена мала:
   *    если буфер правда полон, эпизод откроется заново в ту же минуту — страж читает квоту
   *    по каждому её обновлению, а сервер чеканит отказ на первой же пробе;
   *  - владелец известен, эпизод без подписи, но открыт в ЭТОМ процессе → факт наблюдён
   *    здесь и сейчас: подписываем, не выбрасываем.
   */
  reconcileOwner(owner: OverflowHoldOwner | null): OwnerReconcileOutcome {
    if (owner === null) return 'deferred';
    this.owner = owner;
    const episode = this.episode;
    if (episode === null) return 'kept';
    if (episode.owner === null) {
      if (this.unsignedFromStore) {
        this.commit(null, 'discarded');
        return 'discarded';
      }
      this.sign(episode, owner);
      return 'adopted';
    }
    if (sameOverflowHoldOwner(episode.owner, owner)) return 'kept';
    this.commit(null, 'discarded');
    return 'discarded';
  }

  /**
   * Подпись эпизода владельцем — не событие: для подписчиков ничего не изменилось (тот же
   * факт, то же `isHeld()`, те же числа), поэтому `commit` здесь не зовётся. Меняется только
   * то, кому эпизод принадлежит, — и это надо сохранить, чтобы следующая привязка его увидела.
   */
  private sign(episode: OverflowHoldEpisode, owner: OverflowHoldOwner): void {
    this.episode = { ...episode, owner };
    this.unsignedFromStore = false;
    this.store.save(this.episode);
  }

  toRuntimePayload(): RuntimeOverflowHoldPayload | null {
    return overflowHoldToRuntimePayload(this.episode);
  }

  private commit(next: OverflowHoldEpisode | null, change: HoldChange): void {
    this.episode = next;
    // Всё, что положено здесь, положено в этом процессе: «неподписанный из хранилища» снят.
    this.unsignedFromStore = false;
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
    ...(options.owner !== undefined ? { owner: options.owner } : {}),
  });
  return singleton;
}
