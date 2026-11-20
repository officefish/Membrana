/**
 * Пульс уборщика холодного архива (#2632 g5b; решения владельца шторма 08.10: Т1, Т6).
 *
 * Т1 — ТРЕВОГА: уборка включена, а успешного прогона нет дольше 2 ч → `stale`. Успешного прогона не было
 * вовсе (`lastSucceededRunAt = null`) при включённой уборке — тоже `stale`: «ни разу» не лучше «давно».
 * Т6 — ВЫКЛЮЧЕНО = ТИШИНА: режим `disabled` → пульс `disabled`, media не спрашивается вовсе.
 *
 * Источник времени последнего успеха — журнал media (дверь g4a `purge-pulse`), не память процесса office:
 * рестарт office не обнуляет пульс. Режим — по флагам office (`sweepModeOf`), не по журналу.
 */
import type { ColdArchiveSweepClient, JournalOutcome } from './cold-archive-sweep.client';
import type { SweepMode } from './cold-archive-sweep.scheduler';

/** Порог тревоги Т1: успешного прогона нет ДОЛЬШЕ двух часов (ровно 2 ч — ещё не тревога). */
export const PULSE_STALE_AFTER_MS = 2 * 60 * 60 * 1000;

export type PulseState = 'disabled' | 'ok' | 'stale';

export function pulseOf(mode: SweepMode, lastSucceededRunAt: Date | null, now: Date): PulseState {
  if (mode === 'disabled') return 'disabled';
  if (lastSucceededRunAt === null) return 'stale';
  return now.getTime() - lastSucceededRunAt.getTime() > PULSE_STALE_AFTER_MS ? 'stale' : 'ok';
}

/** Ответ ручки панели: режим по флагам и пульс; даты — строками ISO, как у media. */
export interface PulseView {
  readonly mode: SweepMode;
  readonly pulse: PulseState;
  readonly staleAfterMs: number;
  readonly lastSucceededRunAt: string | null;
  readonly lastFinishedRunAt: string | null;
  readonly checkedAt: string;
}

const isoOrNull = (value: unknown): Date | null | undefined => {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Режим + пульс. Выключено — без вызова media; иначе дверь `purge-pulse`, кривой ответ — media-unreachable. */
export async function readPulse(
  mode: SweepMode,
  client: Pick<ColdArchiveSweepClient, 'pulse'>,
  now: Date,
): Promise<{ readonly kind: 'ok'; readonly view: PulseView } | Exclude<JournalOutcome, { readonly kind: 'ok' }>> {
  const base = { mode, staleAfterMs: PULSE_STALE_AFTER_MS, checkedAt: now.toISOString() };
  if (mode === 'disabled') {
    return { kind: 'ok', view: { ...base, pulse: 'disabled', lastSucceededRunAt: null, lastFinishedRunAt: null } };
  }
  const outcome = await client.pulse();
  if (outcome.kind !== 'ok') return outcome;
  const body = (outcome.body ?? {}) as { lastSucceededRunAt?: unknown; lastFinishedRunAt?: unknown };
  const succeeded = isoOrNull(body.lastSucceededRunAt);
  const finished = isoOrNull(body.lastFinishedRunAt);
  if (succeeded === undefined || finished === undefined) return { kind: 'media-unreachable', detail: 'unexpected pulse shape from media' };
  return {
    kind: 'ok',
    view: { ...base, pulse: pulseOf(mode, succeeded, now), lastSucceededRunAt: succeeded?.toISOString() ?? null, lastFinishedRunAt: finished?.toISOString() ?? null },
  };
}
