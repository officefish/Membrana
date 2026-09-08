/**
 * Зубы view-model окна оператора (M5 (а), DoD 1, #2310). Предмет — `viewModel.ts` и
 * `reasonTexts.ts`.
 *
 * Порчи → красный: убрать строку из `OVERFLOW_REASON_TEXT` — красный `tsc` (Record по union);
 * неизвестный код без сырого кода — красный; одна шкала вместо двух — красный; «н/д» заменить
 * на число — красный; пустой список переходов с включённой кнопкой — красный.
 */
import { BUFFER_OVERFLOW_REASONS, type BufferOverflowReason } from '@membrana/plugin-contracts';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { OverflowHoldEpisode } from '@/lib/device-overflow-hold';

import {
  NOT_AVAILABLE_TEXT,
  OVERFLOW_REASON_TEXT,
  OVERFLOW_WINDOW_TITLE,
  TARIFF_NO_TRANSITIONS_TEXT,
  describeOverflowReason,
  formatAxisRemaining,
} from './reasonTexts';
import { buildOverflowWindowViewModel, episodeWindowKey } from './viewModel';

const EPISODE: OverflowHoldEpisode = {
  overflowId: '7e0d3f9a-0000-4000-8000-000000000001',
  overflowAt: '2026-09-06T02:11:00.000Z',
  reason: BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL,
  policy: 'stop',
  source: 'server',
  buffer: { usedBytes: 1_000_000, limitBytes: 1_000_000 },
  userStorage: { usedBytes: 10, limitBytes: 1_000_000 },
  enteredAtMs: 1_000,
};

describe('таблица код→текст', () => {
  it('ключ — импортированный union словаря A; обе причины названы словами, не кодом', () => {
    expectTypeOf(OVERFLOW_REASON_TEXT).toEqualTypeOf<Record<BufferOverflowReason, string>>();
    expect(Object.keys(OVERFLOW_REASON_TEXT).sort()).toEqual(Object.values(BUFFER_OVERFLOW_REASONS).sort());
    for (const [code, text] of Object.entries(OVERFLOW_REASON_TEXT)) {
      expect(text).not.toContain(code);
      expect(text.length).toBeGreaterThan(5);
    }
  });

  it('неизвестный код → «Буфер полон» + сырой код приглушённой строкой, не молчание', () => {
    const d = describeOverflowReason('quota_exceeded');
    expect(d.text).toBe(OVERFLOW_WINDOW_TITLE);
    expect(d.rawCode).toBe('quota_exceeded');
    expect(d.axis).toBeNull();
    const known = describeOverflowReason(BUFFER_OVERFLOW_REASONS.USER_STORAGE_FULL);
    expect(known.rawCode).toBeNull();
    expect(known.axis).toBe('userStorage');
  });

  it('остаток по оси словами; ось отсутствует → н/д', () => {
    expect(formatAxisRemaining({ usedBytes: 900, limitBytes: 1000 })).toBe('свободно 100 B из 1000 B');
    expect(formatAxisRemaining(null)).toContain(NOT_AVAILABLE_TEXT);
  });
});

describe('buildOverflowWindowViewModel — только эпизод + статус, без сети', () => {
  it('две шкалы всегда: занято / лимит / свободно (T4), даже если одна «ок»', () => {
    const vm = buildOverflowWindowViewModel({
      episode: EPISODE,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(vm.axes.buffer).toEqual({ usedBytes: 1_000_000, limitBytes: 1_000_000, freeBytes: 0, percent: 100 });
    expect(vm.axes.userStorage).toEqual({ usedBytes: 10, limitBytes: 1_000_000, freeBytes: 999_990, percent: 0 });
    expect(vm.reason.text).toBe(OVERFLOW_REASON_TEXT.device_buffer_full);
    expect(vm.overflowAt).toBe(EPISODE.overflowAt);
    expect(vm.phase).toBe('held');
    expect(vm.policyText).toBe('остановка');
    expect(vm.title).toBe(OVERFLOW_WINDOW_TITLE);
    expect(vm.windowKey).toBe(EPISODE.overflowId);
  });

  it('«что записано до остановки»: нет в состоянии узла → явная строка «н/д»; есть → число', () => {
    const none = buildOverflowWindowViewModel({
      episode: EPISODE,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(none.recordedBeforeStopText).toBe(NOT_AVAILABLE_TEXT);
    const some = buildOverflowWindowViewModel({
      episode: EPISODE,
      held: true,
      recordedBeforeStop: { samples: 12, bytes: 2048 },
      tariffTransitions: 'unknown',
    });
    expect(some.recordedBeforeStopText).toBe('12 проб · 2.0 KB');
  });

  it('локальный эпизод: фаза held_local, ключ окна — локальный, ось хранилища н/д', () => {
    const vm = buildOverflowWindowViewModel({
      episode: { ...EPISODE, overflowId: null, source: 'local', userStorage: null },
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(vm.phase).toBe('held_local');
    expect(vm.windowKey).toBe(`local:${EPISODE.overflowAt}`);
    expect(vm.axes.userStorage).toBeNull();
    expect(episodeWindowKey({ overflowId: null, overflowAt: 'x' })).toBe('local:x');
  });

  it('тариф: переходов нет → кнопка выключена + прямой текст; неизвестно → в кабинет; есть → счёт', () => {
    const empty = buildOverflowWindowViewModel({
      episode: EPISODE,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: [],
    });
    expect(empty.tariff.enabled).toBe(false);
    expect(empty.tariff.note).toBe(TARIFF_NO_TRANSITIONS_TEXT);

    const unknown = buildOverflowWindowViewModel({
      episode: EPISODE,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(unknown.tariff.enabled).toBe(true);
    expect(unknown.tariff.note).toContain('кабинет');

    const some = buildOverflowWindowViewModel({
      episode: EPISODE,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: [{ id: 'checkpoint-v1', name: 'Блокпост' }],
    });
    expect(some.tariff.enabled).toBe(true);
    expect(some.tariff.note).toContain('1');
  });

  it('неизвестный код причины доезжает до окна сырым и приглушённым', () => {
    const vm = buildOverflowWindowViewModel({
      episode: { ...EPISODE, reason: 'something_new' },
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(vm.reason.text).toBe(OVERFLOW_WINDOW_TITLE);
    expect(vm.reason.rawCode).toBe('something_new');
  });
});
