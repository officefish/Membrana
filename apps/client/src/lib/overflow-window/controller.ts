import {
  getDeviceOverflowHold,
  type DeviceOverflowHold,
  type OverflowHoldEpisode,
  type OverflowWindowSignal,
  type StartAttempt,
} from '@/lib/device-overflow-hold';

import type { CleanOutcome } from './ledger';
import { episodeWindowKey } from './viewModel';

export type OverflowWindowCause = 'entered' | 'start-refused' | 'reopen';

export interface OverflowWindowState {
  readonly open: boolean;
  /** Ключ факта, на который открыто окно; `null` — окна нет. */
  readonly windowKey: string | null;
  /** Эпизод, из которого строится окно (после сброса — замороженный, для сводки). */
  readonly episode: OverflowHoldEpisode | null;
  readonly held: boolean;
  readonly cause: OverflowWindowCause | null;
  /** Последний отбитый старт при удержании (T5) — окну сказать, что именно отбито. */
  readonly refusedAttempt: StartAttempt | null;
  /** Факт чистки из окна — показывается до закрытия окна человеком. */
  readonly outcome: CleanOutcome | null;
  /** Сколько раз окно открывалось по этому ключу (диагностика однократности). */
  readonly opensForKey: number;
}

export type OverflowWindowListener = () => void;

const EMPTY: OverflowWindowState = {
  open: false,
  windowKey: null,
  episode: null,
  held: false,
  cause: null,
  refusedAttempt: null,
  outcome: null,
  opensForKey: 0,
};

/**
 * Контроллер окна оператора (4/4, #2310) — ОДИН на прибор, поверх носителя удержания.
 *
 * Правила (посылка M3/T5/T9, не переоткрываются):
 *  - `entered` → окно на этот `overflowId`; повторный `entered` того же ключа окна не плодит;
 *  - `start-refused` при удержании → то же окно того же ключа поднимается снова;
 *  - `close()` — только прячет окно; удержание НЕ трогает (носитель не зовётся);
 *  - `releaseByHuman()` — единственный путь снять удержание из окна, явным действием;
 *  - сброс удержания (`released`) при открытом окне НЕ закрывает его — сводка ушедшего
 *    должна быть прочитана человеком; при закрытом — состояние очищается.
 * Второго запроса квоты здесь нет: контроллер не знает ни сервиса библиотеки, ни сети.
 */
export class OverflowWindowController {
  private state: OverflowWindowState = EMPTY;

  private readonly listeners = new Set<OverflowWindowListener>();

  private readonly offSignal: () => void;

  private readonly offHold: () => void;

  constructor(private readonly hold: DeviceOverflowHold) {
    this.offSignal = hold.subscribeWindowSignal((signal) => this.onSignal(signal));
    this.offHold = hold.subscribe((episode, change) => {
      if (change === 'released') {
        this.onReleased();
      } else if (change === 'promoted' && episode !== null) {
        // Локальный эпизод получил серверный id — тот же факт, окно то же; ключ следует за ним.
        this.patch({ windowKey: episodeWindowKey(episode), episode, held: hold.isHeld() });
      }
    });
  }

  getSnapshot = (): OverflowWindowState => this.state;

  subscribe = (listener: OverflowWindowListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Плашка / бейдж: то же окно того же `overflowId`, что и по сигналу. */
  openForCurrentEpisode(): boolean {
    const episode = this.hold.getEpisode();
    if (episode === null) return false;
    this.openFor(episode, 'reopen', null);
    return true;
  }

  /** Закрыть окно: Esc / крестик. Удержание остаётся — носитель не зовётся. */
  close(): void {
    if (!this.state.open) return;
    if (this.hold.getEpisode() === null) {
      // Удержания уже нет (сводка прочитана / очистка снаружи) — окно ни к чему не привязано.
      this.patch({ ...EMPTY });
      return;
    }
    this.patch({ open: false, outcome: null });
  }

  /** Единственный ручной выход из удержания — явное действие из окна, не закрытие. */
  releaseByHuman(): void {
    this.hold.release('human');
  }

  /** Факт чистки из окна — показать до закрытия. */
  setOutcome(outcome: CleanOutcome | null): void {
    this.patch({ outcome });
  }

  dispose(): void {
    this.offSignal();
    this.offHold();
    this.listeners.clear();
  }

  private onSignal(signal: OverflowWindowSignal): void {
    this.openFor(signal.episode, signal.cause, signal.attempt);
  }

  private openFor(episode: OverflowHoldEpisode, cause: OverflowWindowCause, attempt: StartAttempt | null): void {
    const key = episodeWindowKey(episode);
    const sameFact = this.state.windowKey === key;
    if (sameFact && this.state.open && cause === 'entered') {
      // Повторный вход того же факта (например, восстановление) — второго окна нет.
      return;
    }
    this.patch({
      open: true,
      windowKey: key,
      episode,
      held: this.hold.isHeld(),
      cause,
      refusedAttempt: attempt ?? (sameFact ? this.state.refusedAttempt : null),
      outcome: sameFact ? this.state.outcome : null,
      opensForKey: sameFact ? this.state.opensForKey + 1 : 1,
    });
  }

  private onReleased(): void {
    if (this.state.open) {
      // Окно открыто — человек читает сводку; закроет сам.
      this.patch({ held: false });
      return;
    }
    this.patch({ ...EMPTY });
  }

  private patch(next: Partial<OverflowWindowState>): void {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }
}

let singleton: OverflowWindowController | null = null;

export function getOverflowWindowController(): OverflowWindowController {
  if (singleton === null) {
    singleton = new OverflowWindowController(getDeviceOverflowHold());
  }
  return singleton;
}

/** Тесты: пересоздать контроллер поверх заданного носителя. */
export function resetOverflowWindowControllerForTests(hold: DeviceOverflowHold): OverflowWindowController {
  singleton?.dispose();
  singleton = new OverflowWindowController(hold);
  return singleton;
}
