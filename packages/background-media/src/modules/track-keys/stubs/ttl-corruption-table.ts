/**
 * Таблица порчи настройки срока — общий перебор для зуба умолчания и для порча-зуба.
 *
 * Живёт отдельным файлом, а не внутри теста, ровно потому, что её читают ДВА зуба: обычный
 * (`track-key-ttl.test.ts`) и порча-зуб (`track-key-ttl.porcha.test.ts`), гоняющий тот же
 * перебор по искалеченной копии исходника. Импортируй один тест из другого — набор
 * собирался бы дважды.
 *
 * Перебор покрывает шесть состояний, названных DoD блока дословно: пусто · невалидно · NaN ·
 * повреждено · дата в прошлом · отрицательное.
 */
import type { StoredTrackKeyTtl, TrackKeyTtlFallbackReason } from '../track-key-ttl';
import { MAX_TRACK_KEY_TTL } from '../track-key-ttl';

/** Опора времени перебора: владелец времени — вызывающий, не машина. */
export const TTL_NOW = new Date('2026-09-02T12:00:00.000Z');

export interface TtlCorruptionCase {
  /** Разряд DoD, к которому относится случай. */
  readonly kind: 'пусто' | 'невалидно' | 'NaN' | 'повреждено' | 'дата в прошлом' | 'отрицательное';
  readonly name: string;
  readonly stored: StoredTrackKeyTtl;
  readonly reason: TrackKeyTtlFallbackReason;
}

export const TTL_CORRUPTION_CASES: readonly TtlCorruptionCase[] = [
  // ── пусто: человек не открывал блок, хранилище пусто ────────────────────────────────────
  { kind: 'пусто', name: 'undefined', stored: undefined, reason: 'absent' },
  { kind: 'пусто', name: 'null', stored: null, reason: 'absent' },
  { kind: 'пусто', name: 'пустая строка', stored: '', reason: 'blank' },
  { kind: 'пусто', name: 'одни пробелы', stored: '   ', reason: 'blank' },
  { kind: 'пусто', name: 'пустой объект', stored: {}, reason: 'malformed' },

  // ── невалидно: форма не та ──────────────────────────────────────────────────────────────
  { kind: 'невалидно', name: 'слово вместо срока', stored: 'soon', reason: 'not-a-number' },
  { kind: 'невалидно', name: 'булево', stored: true, reason: 'malformed' },
  { kind: 'невалидно', name: 'массив', stored: [900], reason: 'malformed' },
  { kind: 'невалидно', name: 'функция', stored: () => 900, reason: 'malformed' },
  { kind: 'невалидно', name: 'неизвестный mode', stored: { mode: 'forever' }, reason: 'malformed' },
  { kind: 'невалидно', name: 'Infinity', stored: Number.POSITIVE_INFINITY, reason: 'not-finite' },
  { kind: 'невалидно', name: 'величина сверх потолка', stored: 1e12, reason: 'over-ceiling' },
  {
    kind: 'невалидно',
    name: 'потолок + 1 секунда',
    stored: { mode: 'seconds', seconds: MAX_TRACK_KEY_TTL + 1 },
    reason: 'over-ceiling',
  },

  // ── NaN ─────────────────────────────────────────────────────────────────────────────────
  { kind: 'NaN', name: 'голый NaN', stored: Number.NaN, reason: 'nan' },
  { kind: 'NaN', name: 'NaN в поле seconds', stored: { mode: 'seconds', seconds: Number.NaN }, reason: 'nan' },
  { kind: 'NaN', name: 'строка "NaN"', stored: 'NaN', reason: 'not-a-number' },

  // ── повреждено: запись есть, но она не запись ───────────────────────────────────────────
  { kind: 'повреждено', name: 'обрезанный JSON', stored: '{"mode":"seco', reason: 'not-a-number' },
  { kind: 'повреждено', name: 'mode=seconds без числа', stored: { mode: 'seconds' }, reason: 'malformed' },
  { kind: 'повреждено', name: 'mode=seconds со null', stored: { mode: 'seconds', seconds: null }, reason: 'malformed' },
  {
    kind: 'повреждено',
    name: 'снятие срока без подписи',
    stored: { mode: 'lifted' },
    reason: 'malformed',
  },
  {
    kind: 'повреждено',
    name: 'снятие срока без даты движения',
    stored: { mode: 'lifted', liftedBy: 'owner' },
    reason: 'malformed',
  },
  {
    kind: 'повреждено',
    name: 'снятие срока с нечитаемой датой',
    stored: { mode: 'lifted', liftedBy: 'owner', liftedAt: 'позавчера' },
    reason: 'malformed',
  },
  { kind: 'повреждено', name: 'expiresAt не дата', stored: { expiresAt: {} }, reason: 'malformed' },

  // ── дата в прошлом ──────────────────────────────────────────────────────────────────────
  { kind: 'дата в прошлом', name: 'ISO вчера', stored: '2026-09-01T12:00:00.000Z', reason: 'expired' },
  { kind: 'дата в прошлом', name: 'Date вчера', stored: new Date('2026-09-01T12:00:00.000Z'), reason: 'expired' },
  {
    kind: 'дата в прошлом',
    name: 'expiresAt вчера',
    stored: { expiresAt: '2026-09-01T12:00:00.000Z' },
    reason: 'expired',
  },
  { kind: 'дата в прошлом', name: 'ровно сейчас', stored: TTL_NOW.toISOString(), reason: 'expired' },

  // ── отрицательное и вырожденное ─────────────────────────────────────────────────────────
  { kind: 'отрицательное', name: 'минус секунда', stored: -1, reason: 'negative' },
  { kind: 'отрицательное', name: 'строка "-300"', stored: '-300', reason: 'negative' },
  {
    kind: 'отрицательное',
    name: 'минус в поле seconds',
    stored: { mode: 'seconds', seconds: -300 },
    reason: 'negative',
  },
  { kind: 'отрицательное', name: 'ноль', stored: 0, reason: 'zero' },
  { kind: 'отрицательное', name: 'полсекунды (усечётся в ноль)', stored: 0.5, reason: 'zero' },
];
