import type { RuntimeOverflowHoldPayload } from '@membrana/core';
import type { OverflowPolicy, QuotaSubject } from '@membrana/plugin-contracts';

import type { OverflowHoldAxis, OverflowHoldEpisode } from '@/lib/device-overflow-hold';

import {
  NOT_AVAILABLE_TEXT,
  OVERFLOW_PHASE_TEXT,
  OVERFLOW_POLICY_TEXT,
  OVERFLOW_WINDOW_TITLE,
  TARIFF_NO_TRANSITIONS_TEXT,
  describeOverflowReason,
  formatBytes,
  type OverflowReasonDescription,
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

export interface RecordedBeforeStop {
  readonly samples: number;
  readonly bytes: number;
}

export interface OverflowWindowViewModel {
  /** Ключ однократности окна: `overflowId` сервера либо локальный ключ до повышения. */
  readonly windowKey: string;
  readonly overflowId: string | null;
  readonly title: string;
  readonly reason: OverflowReasonDescription;
  readonly axes: Readonly<Record<QuotaSubject, OverflowAxisView | null>>;
  readonly overflowAt: string;
  readonly phase: RuntimeOverflowHoldPayload['phase'];
  readonly phaseText: string;
  readonly policy: OverflowPolicy;
  readonly policyText: string;
  readonly source: OverflowHoldEpisode['source'];
  readonly held: boolean;
  /** Из состояния узла; `null` → «н/д» явной строкой. */
  readonly recordedBeforeStop: RecordedBeforeStop | null;
  readonly recordedBeforeStopText: string;
  readonly tariff: {
    readonly enabled: boolean;
    /** Пояснение под кнопкой: почему выключена / куда ведёт. */
    readonly note: string;
    readonly transitions: TariffTransitionsKnowledge;
  };
}

export interface OverflowWindowViewModelInput {
  readonly episode: OverflowHoldEpisode;
  /** `hold.isHeld()` — эпизод ∧ политика `stop`. */
  readonly held: boolean;
  readonly recordedBeforeStop: RecordedBeforeStop | null;
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

function describeRecordedBeforeStop(value: RecordedBeforeStop | null): string {
  if (value === null) return NOT_AVAILABLE_TEXT;
  return `${value.samples} проб · ${formatBytes(value.bytes)}`;
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
 * Окно строится ТОЛЬКО из эпизода носителя (ответ отказа A уже внутри: причина, оси, политика,
 * `overflowId`/`overflowAt`) и статуса удержания — второго запроса квоты здесь нет и быть не
 * может: функция чистая, без сети, сервиса и React (зуб `viewModel.test.ts`).
 */
export function buildOverflowWindowViewModel(input: OverflowWindowViewModelInput): OverflowWindowViewModel {
  const { episode } = input;
  const phase: RuntimeOverflowHoldPayload['phase'] = episode.overflowId === null ? 'held_local' : 'held';
  return {
    windowKey: episodeWindowKey(episode),
    overflowId: episode.overflowId,
    title: OVERFLOW_WINDOW_TITLE,
    reason: describeOverflowReason(episode.reason),
    axes: {
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
    recordedBeforeStop: input.recordedBeforeStop,
    recordedBeforeStopText: describeRecordedBeforeStop(input.recordedBeforeStop),
    tariff: resolveTariff(input.tariffTransitions),
  };
}
