import type { RuntimeOverflowHoldPayload } from '@membrana/core';
import { stopDecision, type StorageQuota } from '@membrana/media-library-service';
import type { OverflowPolicy, QuotaSubject } from '@membrana/plugin-contracts';

import type { OverflowHoldAxis, OverflowHoldEpisode } from '@/lib/device-overflow-hold';

import {
  OVERFLOW_HELD_TEXT_BY_STANDING,
  OVERFLOW_PHASE_TEXT,
  OVERFLOW_POLICY_TEXT,
  OVERFLOW_TITLE_BY_STANDING,
  TARIFF_NO_TRANSITIONS_TEXT,
  describeOverflowReason,
  describeQuotaRead,
  type OverflowReasonDescription,
  type OverflowStanding,
  type QuotaReadState,
} from './reasonTexts';

export interface OverflowAxisView {
  readonly usedBytes: number;
  readonly limitBytes: number;
  readonly freeBytes: number;
  /** 0..100, целое; лимит 0 → 100 (полон по определению). */
  readonly percent: number;
}

/** Переход тарифа, если приборy есть откуда его знать; сегодня клиенту неоткуда (см. host). */
export interface TariffTransitionOption {
  readonly id: string;
  readonly name: string;
}

/**
 * Что клиент знает о переходах: `'unknown'` — источника нет (каталог `/v1/tariffs` требует
 * пользовательский токен кабинета, у прибора его нет) → кнопка ведёт в кабинет; список —
 * известен; пустой список — честная витрина «переходить некуда» (#2297).
 */
export type TariffTransitionsKnowledge = 'unknown' | readonly TariffTransitionOption[];

export interface OverflowWindowViewModel {
  /** Ключ однократности окна: `overflowId` сервера либо локальный ключ до повышения. */
  readonly windowKey: string;
  readonly overflowId: string | null;
  /** Заголовок — по состоянию места (#2533): «Буфер полон» либо «Место освобождено — снимите удержание». */
  readonly title: string;
  /** Место по живой оси причины; удержание (`held`) от него НЕ зависит — снимает только человек. */
  readonly standing: OverflowStanding;
  /** Текст плашки удержания — по состоянию места; читается, когда `held === true`. */
  readonly heldText: string;
  readonly reason: OverflowReasonDescription;
  /** Живые величины из последнего снимка библиотеки — основание решения оператора. */
  readonly axes: Readonly<Record<QuotaSubject, OverflowAxisView | null>>;
  /** Момент и исход последнего чтения предела (#2538): несвежий предел — не основание для «полон». */
  readonly quotaRead: QuotaReadState;
  readonly quotaReadText: string;
  /** Неизменяемый вещдок момента остановки. */
  readonly axesAtStop: Readonly<Record<QuotaSubject, OverflowAxisView | null>>;
  readonly overflowAt: string;
  readonly phase: RuntimeOverflowHoldPayload['phase'];
  readonly phaseText: string;
  readonly policy: OverflowPolicy;
  readonly policyText: string;
  readonly source: OverflowHoldEpisode['source'];
  readonly held: boolean;
  readonly tariff: {
    readonly enabled: boolean;
    /** Пояснение под кнопкой: почему выключена / куда ведёт. */
    readonly note: string;
    readonly transitions: TariffTransitionsKnowledge;
  };
}

export interface OverflowWindowViewModelInput {
  readonly episode: OverflowHoldEpisode;
  readonly liveAxes: Readonly<Record<QuotaSubject, OverflowHoldAxis | null>>;
  /** Откуда живые оси: `quotaReadStateFromQuota(snapshot.quota)` в хосте. */
  readonly quotaRead: QuotaReadState;
  /** `hold.isHeld()` — эпизод ∧ политика `stop`. */
  readonly held: boolean;
  readonly tariffTransitions: TariffTransitionsKnowledge;
}

export function episodeWindowKey(episode: Pick<OverflowHoldEpisode, 'overflowId' | 'overflowAt'>): string {
  return episode.overflowId ?? `local:${episode.overflowAt}`;
}

export function toAxisView(axis: OverflowHoldAxis | null): OverflowAxisView | null {
  if (axis === null) return null;
  const freeBytes = Math.max(0, axis.limitBytes - axis.usedBytes);
  const percent =
    axis.limitBytes > 0 ? Math.min(100, Math.max(0, Math.round((axis.usedBytes / axis.limitBytes) * 100))) : 100;
  return { usedBytes: axis.usedBytes, limitBytes: axis.limitBytes, freeBytes, percent };
}

export function liveAxesFromQuota(quota: StorageQuota): Readonly<Record<QuotaSubject, OverflowHoldAxis | null>> {
  const buffer =
    typeof quota.bufferUsedBytes === 'number' && typeof quota.bufferLimitBytes === 'number'
      ? { usedBytes: quota.bufferUsedBytes, limitBytes: quota.bufferLimitBytes }
      : null;
  return {
    buffer,
    userStorage: { usedBytes: quota.usedBytes, limitBytes: quota.limitBytes },
  };
}

/**
 * Исход последнего чтения предела по снимку (#2538). Серверный бэкенд с `serverReachable=false` —
 * чтение не удалось (сервис сохранил прежние числа и прежний `readAt`); не серверный бэкенд читает
 * локальный предел и считается прочитанным. `readAt` отсутствует → успешного чтения не было.
 */
export function quotaReadStateFromQuota(quota: StorageQuota): QuotaReadState {
  return {
    fresh: quota.backend !== 'server' || quota.serverReachable,
    readAt: quota.readAt ?? null,
  };
}

/**
 * Место по живой оси (#2533). Судья — ТОТ ЖЕ `stopDecision` с порогом `BUFFER_STOP_RATIO`, которым
 * страж прибора входит в удержание (`localGuard.ts`): ниже порога страж не перевходит, значит слово
 * «освобождено» не лжёт; вторая правда о пороге здесь не заводится. Предел не объявлен
 * (`filled === null`) или оси нет → `unknown`. Освобождение места удержание НЕ снимает (M3 DoD 7).
 */
export function judgeOverflowStanding(axis: OverflowHoldAxis | null): OverflowStanding {
  if (axis === null) return 'unknown';
  const verdict = stopDecision(axis, { policy: 'stop' });
  if (verdict.filled === null) return 'unknown';
  return verdict.action === 'stop' ? 'full' : 'freed';
}

function resolveTariff(transitions: TariffTransitionsKnowledge): OverflowWindowViewModel['tariff'] {
  if (transitions === 'unknown') {
    return {
      enabled: true,
      note: 'переходы показывает кабинет — откроется страница мембраны',
      transitions,
    };
  }
  if (transitions.length === 0) {
    return { enabled: false, note: TARIFF_NO_TRANSITIONS_TEXT, transitions };
  }
  return {
    enabled: true,
    note: `доступно переходов: ${transitions.length} — выбор в кабинете`,
    transitions,
  };
}

/**
 * Функция чистая: замороженный эпизод остаётся вещдоком, а живые оси приходят отдельным
 * входом из снимка библиотеки. Сеть и React остаются в host.
 */
export function buildOverflowWindowViewModel(input: OverflowWindowViewModelInput): OverflowWindowViewModel {
  const { episode } = input;
  const phase: RuntimeOverflowHoldPayload['phase'] = episode.overflowId === null ? 'held_local' : 'held';
  const reason = describeOverflowReason(episode.reason);
  // Место судится по живой оси ПРИЧИНЫ (буфер либо наборы), не по буферу вообще. Предел, который
  // не удалось перечитать, — не живая ось (#2538): числа показываются с пометкой, но суждения
  // «полон»/«освобождено» по ним нет.
  const standing = !input.quotaRead.fresh
    ? 'unknown'
    : judgeOverflowStanding(reason.axis === null ? null : input.liveAxes[reason.axis]);
  return {
    windowKey: episodeWindowKey(episode),
    overflowId: episode.overflowId,
    title: OVERFLOW_TITLE_BY_STANDING[standing],
    standing,
    heldText: OVERFLOW_HELD_TEXT_BY_STANDING[standing],
    reason,
    axes: {
      buffer: toAxisView(input.liveAxes.buffer),
      userStorage: toAxisView(input.liveAxes.userStorage),
    },
    quotaRead: input.quotaRead,
    quotaReadText: describeQuotaRead(input.quotaRead),
    axesAtStop: {
      buffer: toAxisView(episode.buffer),
      userStorage: toAxisView(episode.userStorage),
    },
    overflowAt: episode.overflowAt,
    phase,
    phaseText: OVERFLOW_PHASE_TEXT[phase],
    policy: episode.policy,
    policyText: OVERFLOW_POLICY_TEXT[episode.policy],
    source: episode.source,
    held: input.held,
    tariff: resolveTariff(input.tariffTransitions),
  };
}
