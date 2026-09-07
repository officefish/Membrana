import type { RuntimeOverflowHoldPayload } from '@membrana/core';

/** Политика переполнения в снимке эпизода (M1/M2): `stop` | `smart_cleanup`. */
export type OverflowHoldPolicy = 'stop' | 'smart_cleanup';

/** Кто открыл эпизод: главный источник — сервер; вторичный — локальный страж квоты. */
export type OverflowHoldSource = 'server' | 'local';

export interface OverflowHoldAxis {
  readonly usedBytes: number;
  readonly limitBytes: number;
}

/**
 * Эпизод переполнения на приборе (M3 (в), #2309) — единственная память «уже остановлен».
 * `overflowId` чеканит сервер; `null` — эпизод открыт локальным стражем и ещё не повышен.
 */
export interface OverflowHoldEpisode {
  readonly overflowId: string | null;
  /** ISO 8601: серверное время факта либо момент локального стража. */
  readonly overflowAt: string;
  /** Литерал словаря отказа (блок A); на стороне стража — стаб-литерал. */
  readonly reason: string;
  readonly policy: OverflowHoldPolicy;
  readonly source: OverflowHoldSource;
  readonly buffer: OverflowHoldAxis | null;
  readonly userStorage: OverflowHoldAxis | null;
  /** Момент входа в удержание на приборе (мс, Date.now). */
  readonly enteredAtMs: number;
}

/** Снимок серверного отказа, прошедший проверку словаря (см. `stubs/refusal-contract.stub.ts`). */
export interface OverflowRefusalSnapshot {
  readonly reason: string;
  readonly overflowId: string;
  readonly overflowAt: string;
  readonly overflowPolicy: OverflowHoldPolicy;
  readonly buffer: OverflowHoldAxis | null;
  readonly userStorage: OverflowHoldAxis | null;
}

/** Снимок локального стража: чтение квоты до отправки. */
export interface LocalGuardSnapshot {
  readonly reason: string;
  readonly buffer: OverflowHoldAxis;
  /** Эффективная политика прибора (читатель блока B; до интеграции — стаб). */
  readonly policy: OverflowHoldPolicy;
}

/**
 * Что случилось с эпизодом по вызову активации:
 * `entered` — открыт новый эпизод (сигнал окна);
 * `promoted` — локальный эпизод получил серверный id (сигнала окна НЕТ);
 * `unchanged` — тот же эпизод, ничего не изменилось (100 отказов одного id → 100 × unchanged);
 * `ignored` — политика не `stop`, страж молчит.
 */
export type HoldActivation = 'entered' | 'promoted' | 'unchanged' | 'ignored';

export type HoldChange = 'entered' | 'promoted' | 'released';

export type HoldReleaseBy = 'human' | 'cleanup';

export interface StartAttempt {
  readonly source: 'mic' | 'board';
  /** Что пыталось стартовать — для слова человеку и лога. */
  readonly what: string;
}

/**
 * Сигнал окна оператора (4/4, #2310): `entered` — один раз на эпизод; `start-refused` —
 * на каждый отбитый старт при удержании (T5: окно закрываемо, не обходимо).
 */
export interface OverflowWindowSignal {
  readonly overflowId: string | null;
  readonly episode: OverflowHoldEpisode;
  readonly cause: 'entered' | 'start-refused';
  readonly attempt: StartAttempt | null;
}

export type HoldListener = (episode: OverflowHoldEpisode | null, change: HoldChange) => void;

export type WindowSignalListener = (signal: OverflowWindowSignal) => void;

/** Порт памяти эпизода сверх процесса (localStorage по умолчанию, память в тестах). */
export interface OverflowHoldStore {
  load(): OverflowHoldEpisode | null;
  save(episode: OverflowHoldEpisode | null): void;
}

export interface DeviceOverflowHold {
  activateFromServer(refusal: OverflowRefusalSnapshot): HoldActivation;
  activateFromLocalGuard(guard: LocalGuardSnapshot): HoldActivation;
  /** Эпизод активен ∧ политика эпизода — `stop`. */
  isHeld(): boolean;
  getEpisode(): OverflowHoldEpisode | null;
  subscribe(listener: HoldListener): () => void;
  subscribeWindowSignal(listener: WindowSignalListener): () => void;
  /** Отбить старт записи при удержании; `true` — отбит, сигнал окна дан. */
  refuseStart(attempt: StartAttempt): boolean;
  /** Единственные два выхода из удержания: слово человека или очистка буфера. */
  release(by: HoldReleaseBy): void;
  /** Значение для `runtime.state.overflowHold` (M4). */
  toRuntimePayload(): RuntimeOverflowHoldPayload | null;
}
