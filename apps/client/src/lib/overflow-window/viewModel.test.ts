/**
 * Зубы view-model окна оператора (M5 (а), DoD 1, #2310). Предмет — `viewModel.ts` и
 * `reasonTexts.ts`.
 *
 * Порчи → красный: убрать строку из `OVERFLOW_REASON_TEXT` — красный `tsc` (Record по union);
 * неизвестный код без сырого кода — красный; одна шкала вместо двух — красный; «н/д» заменить
 * на число — красный; пустой список переходов с включённой кнопкой — красный.
 *
 * #2533 (порчи, красные на стволе dba53da0): заголовок «Буфер полон» при живом буфере 0 B и
 * неснятом удержании — красный; фаза локального эпизода со словами «ещё не подтверждено» —
 * красный; место судится по буферу при причине «наборы полны» — красный; освобождение места
 * снимает `held` — красный.
 */
import { BUFFER_STOP_RATIO } from '@membrana/media-library-service';
import { BUFFER_OVERFLOW_REASONS, type BufferOverflowReason } from '@membrana/plugin-contracts';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { OverflowHoldEpisode } from '@/lib/device-overflow-hold';

import {
  NOT_AVAILABLE_TEXT,
  OVERFLOW_FREED_TITLE,
  QUOTA_READ_FRESH_PREFIX,
  QUOTA_READ_NONE_TEXT,
  QUOTA_READ_STALE_PREFIX,
  describeQuotaRead,
  OVERFLOW_HELD_TEXT_BY_STANDING,
  OVERFLOW_PHASE_TEXT,
  OVERFLOW_REASON_TEXT,
  OVERFLOW_WINDOW_TITLE,
  TARIFF_NO_TRANSITIONS_TEXT,
  describeOverflowReason,
  formatAxisRemaining,
} from './reasonTexts';
import {
  buildOverflowWindowViewModel,
  episodeWindowKey,
  judgeOverflowStanding,
  liveAxesFromQuota,
  quotaReadStateFromQuota,
} from './viewModel';

const LIVE_AXES = {
  buffer: { usedBytes: 250_000, limitBytes: 2_000_000 },
  userStorage: { usedBytes: 20, limitBytes: 2_000_000 },
} as const;

/** #2538: свежее чтение предела с моментом — умолчание зубов, где возраст не предмет. */
const QUOTA_READ = { fresh: true, readAt: '2026-10-01T08:00:00.000Z' } as const;

const EPISODE: OverflowHoldEpisode = {
  overflowId: '7e0d3f9a-0000-4000-8000-000000000001',
  overflowAt: '2026-09-06T02:11:00.000Z',
  reason: BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL,
  policy: 'stop',
  source: 'server',
  buffer: { usedBytes: 1_000_000, limitBytes: 1_000_000 },
  userStorage: { usedBytes: 10, limitBytes: 1_000_000 },
  enteredAtMs: 1_000,
  owner: { kind: 'membrane', membraneId: 'm-1', deviceId: 'dev-1' },
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

describe('#2533 — место по живой оси причины, удержание от него не зависит', () => {
  const LIMIT = 536_870_912;
  /** Живой эпизод 30.09: страж вошёл на 95.06 % (486.7 MB из 512 MB), id сервера нет. */
  const LOCAL_EPISODE: OverflowHoldEpisode = {
    ...EPISODE,
    overflowId: null,
    source: 'local',
    buffer: { usedBytes: 510_302_892, limitBytes: LIMIT },
    userStorage: null,
  };
  const build = (liveBuffer: number, liveUser = 510_302_892, episode: OverflowHoldEpisode = LOCAL_EPISODE) =>
    buildOverflowWindowViewModel({
      episode,
      liveAxes: {
        buffer: { usedBytes: liveBuffer, limitBytes: LIMIT },
        userStorage: { usedBytes: liveUser, limitBytes: LIMIT },
      },
      quotaRead: QUOTA_READ,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });

  it('порча: буфер 0 B при неснятом удержании — заголовок НЕ «Буфер полон», а «Место освобождено — снимите удержание»', () => {
    const vm = build(0);
    expect(vm.standing).toBe('freed');
    expect(vm.title).not.toBe(OVERFLOW_WINDOW_TITLE);
    expect(vm.title).toBe(OVERFLOW_FREED_TITLE);
    expect(vm.heldText).toBe(OVERFLOW_HELD_TEXT_BY_STANDING.freed);
    expect(vm.heldText).toContain('место освобождено');
    // Удержание НЕ снято освобождением места (M3 DoD 7): held приходит снаружи и остаётся.
    expect(vm.held).toBe(true);
    // Снимок остановки — вещдок, не переписан живой осью.
    expect(vm.axesAtStop.buffer?.usedBytes).toBe(510_302_892);
  });

  it('место занято не ниже порога стража → «Буфер полон»; порог — тот же, что у стража', () => {
    const atGuard = Math.ceil(LIMIT * BUFFER_STOP_RATIO);
    expect(build(atGuard).standing).toBe('full');
    expect(build(atGuard).title).toBe(OVERFLOW_WINDOW_TITLE);
    expect(build(atGuard).heldText).toBe(OVERFLOW_HELD_TEXT_BY_STANDING.full);
    expect(build(atGuard - 1).standing).toBe('freed');
    expect(build(LIMIT).standing).toBe('full');
  });

  it('причина «наборы полны» судится по оси наборов, а не по буферу', () => {
    const userFull: OverflowHoldEpisode = { ...EPISODE, reason: BUFFER_OVERFLOW_REASONS.USER_STORAGE_FULL };
    // Буфер пуст, наборы полны → по оси причины место занято.
    expect(build(0, LIMIT, userFull).standing).toBe('full');
    // Наборы освободили, буфер полон → по оси причины место есть.
    expect(build(LIMIT, 0, userFull).standing).toBe('freed');
  });

  it('живой оси нет / предел не объявлен / код причины неизвестен → unknown и прежний заголовок', () => {
    expect(judgeOverflowStanding(null)).toBe('unknown');
    expect(judgeOverflowStanding({ usedBytes: 0, limitBytes: 0 })).toBe('unknown');
    const noLive = buildOverflowWindowViewModel({
      episode: LOCAL_EPISODE,
      liveAxes: { buffer: null, userStorage: null },
      quotaRead: QUOTA_READ,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(noLive.standing).toBe('unknown');
    expect(noLive.title).toBe(OVERFLOW_WINDOW_TITLE);
    const unknownReason = build(0, 0, { ...LOCAL_EPISODE, reason: 'quota_exceeded' });
    expect(unknownReason.standing).toBe('unknown');
    expect(unknownReason.title).toBe(OVERFLOW_WINDOW_TITLE);
  });
});

describe('buildOverflowWindowViewModel — только эпизод + статус, без сети', () => {
  it('две шкалы всегда: занято / лимит / свободно (T4), даже если одна «ок»', () => {
    const vm = buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: LIVE_AXES,
      quotaRead: QUOTA_READ,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(vm.axes.buffer).toEqual({ usedBytes: 250_000, limitBytes: 2_000_000, freeBytes: 1_750_000, percent: 13 });
    expect(vm.axes.userStorage).toEqual({ usedBytes: 20, limitBytes: 2_000_000, freeBytes: 1_999_980, percent: 0 });
    expect(vm.axesAtStop.buffer).toEqual({ usedBytes: 1_000_000, limitBytes: 1_000_000, freeBytes: 0, percent: 100 });
    expect(vm.reason.text).toBe(OVERFLOW_REASON_TEXT.device_buffer_full);
    expect(vm.overflowAt).toBe(EPISODE.overflowAt);
    expect(vm.phase).toBe('held');
    expect(vm.policyText).toBe('остановка');
    // Живой буфер 13 % — место освобождено (#2533): заголовок не утверждает «полон» при свободной оси.
    expect(vm.standing).toBe('freed');
    expect(vm.title).toBe(OVERFLOW_FREED_TITLE);
    expect(vm.windowKey).toBe(EPISODE.overflowId);
  });

  it('«что записано до остановки»: нет в состоянии узла → явная строка «н/д»; есть → число', () => {
    const none = buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: LIVE_AXES,
      quotaRead: QUOTA_READ,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(none.recordedBeforeStopText).toBe(NOT_AVAILABLE_TEXT);
    const some = buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: LIVE_AXES,
      quotaRead: QUOTA_READ,
      held: true,
      recordedBeforeStop: { samples: 12, bytes: 2048 },
      tariffTransitions: 'unknown',
    });
    expect(some.recordedBeforeStopText).toBe('12 проб · 2.0 KB');
  });

  it('локальный эпизод: фаза не обещает подтверждения сервера, которого при stop не бывает (#2533)', () => {
    // Страж входит при 95 %, сервер отказал бы при 100 %, после стража шлюз не выпускает проб:
    // «ещё не подтверждено» — ложь о будущем, не переходное состояние.
    expect(OVERFLOW_PHASE_TEXT.held_local).not.toMatch(/ещё не подтвержден/u);
    expect(OVERFLOW_PHASE_TEXT.held_local).toContain('по стражу прибора');
    expect(OVERFLOW_PHASE_TEXT.held).toContain('подтверждено сервером');
  });

  it('локальный эпизод: фаза held_local, ключ окна — локальный, снимок хранилища н/д', () => {
    const vm = buildOverflowWindowViewModel({
      episode: { ...EPISODE, overflowId: null, source: 'local', userStorage: null },
      liveAxes: LIVE_AXES,
      quotaRead: QUOTA_READ,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(vm.phase).toBe('held_local');
    expect(vm.windowKey).toBe(`local:${EPISODE.overflowAt}`);
    expect(vm.axesAtStop.userStorage).toBeNull();
    expect(episodeWindowKey({ overflowId: null, overflowAt: 'x' })).toBe('local:x');
  });

  it('тариф: переходов нет → кнопка выключена + прямой текст; неизвестно → в кабинет; есть → счёт', () => {
    const empty = buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: LIVE_AXES,
      quotaRead: QUOTA_READ,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: [],
    });
    expect(empty.tariff.enabled).toBe(false);
    expect(empty.tariff.note).toBe(TARIFF_NO_TRANSITIONS_TEXT);

    const unknown = buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: LIVE_AXES,
      quotaRead: QUOTA_READ,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(unknown.tariff.enabled).toBe(true);
    expect(unknown.tariff.note).toContain('кабинет');

    const some = buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: LIVE_AXES,
      quotaRead: QUOTA_READ,
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
      liveAxes: LIVE_AXES,
      quotaRead: QUOTA_READ,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(vm.reason.text).toBe(OVERFLOW_WINDOW_TITLE);
    expect(vm.reason.rawCode).toBe('something_new');
  });

  it('#2444: квота библиотеки преобразуется в две живые оси; снимок эпизода в этом не участвует', () => {
    expect(
      liveAxesFromQuota({
        usedBytes: 30,
        limitBytes: 300,
        bufferUsedBytes: 20,
        bufferLimitBytes: 200,
        backend: 'server',
        serverReachable: true,
      }),
    ).toEqual({
      buffer: { usedBytes: 20, limitBytes: 200 },
      userStorage: { usedBytes: 30, limitBytes: 300 },
    });
  });
});

/**
 * #2538 — момент чтения предела. Живой опыт 01.10: окно показывало 512 МБ при сервере 2 ГБ,
 * потому что предел лежал в снимке без момента чтения и отказ перечитывания был невидим.
 *
 * Порчи → красный: несвежая квота судится «полон»/«освобождено» — красный; строка возраста без
 * времени при известном readAt — красный; отказ чтения прячет числа — красный.
 */
describe('#2538 — предел без момента чтения не живой', () => {
  const STALE = { fresh: false, readAt: '2026-10-01T05:00:00.000Z' } as const;

  it('свежее чтение: строка «предел сервера прочитан HH:MM:SS», место судится по оси', () => {
    const vm = buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: { buffer: { usedBytes: 0, limitBytes: 1000 }, userStorage: EPISODE.userStorage },
      quotaRead: QUOTA_READ,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    expect(vm.quotaRead).toEqual(QUOTA_READ);
    expect(vm.quotaReadText.startsWith(QUOTA_READ_FRESH_PREFIX)).toBe(true);
    expect(vm.quotaReadText).toMatch(/\d{1,2}:\d{2}/u);
    expect(vm.standing).toBe('freed');
  });

  it('отказ чтения: числа прежние, строка «не прочитан — показан снимок от …», standing unknown, held не тронут', () => {
    const vm = buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: { buffer: { usedBytes: 0, limitBytes: 1000 }, userStorage: EPISODE.userStorage },
      quotaRead: STALE,
      held: true,
      recordedBeforeStop: null,
      tariffTransitions: 'unknown',
    });
    // Числа не скрываются (развилка 4 — слово владельца), но «освобождено» по ним не судится.
    expect(vm.axes.buffer).toEqual({ usedBytes: 0, limitBytes: 1000, freeBytes: 1000, percent: 0 });
    expect(vm.standing).toBe('unknown');
    expect(vm.title).toBe(OVERFLOW_WINDOW_TITLE);
    expect(vm.quotaReadText.startsWith(QUOTA_READ_STALE_PREFIX)).toBe(true);
    expect(vm.quotaReadText).toMatch(/\d{1,2}:\d{2}/u);
    expect(vm.held).toBe(true);
  });

  it('успешного чтения ещё не было: fresh без времени → «момент чтения н/д»; не fresh → «снимка ещё нет»', () => {
    expect(describeQuotaRead({ fresh: true, readAt: null })).toContain(NOT_AVAILABLE_TEXT);
    expect(describeQuotaRead({ fresh: false, readAt: null })).toBe(QUOTA_READ_NONE_TEXT);
  });

  it('quotaReadStateFromQuota: сервер недоступен → не свежо; локальный бэкенд — свежо; readAt ?? null', () => {
    expect(
      quotaReadStateFromQuota({ usedBytes: 1, limitBytes: 2, backend: 'server', serverReachable: false, readAt: 'x' }),
    ).toEqual({ fresh: false, readAt: 'x' });
    expect(quotaReadStateFromQuota({ usedBytes: 1, limitBytes: 2, backend: 'server', serverReachable: true })).toEqual({
      fresh: true,
      readAt: null,
    });
    expect(
      quotaReadStateFromQuota({ usedBytes: 1, limitBytes: 2, backend: 'browser-limited', serverReachable: false }),
    ).toEqual({ fresh: true, readAt: null });
  });
});
