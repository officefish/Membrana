import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DeviceOverflowHoldImpl,
  createMemoryOverflowHoldStore,
  overflowHoldToRuntimePayload,
} from './deviceOverflowHold';
import { applyLocalGuardFromQuota } from './localGuard';
import type { OverflowRefusalSnapshot, OverflowWindowSignal } from './types';

const MB = 1048576;

const SERVER_REFUSAL: OverflowRefusalSnapshot = {
  reason: 'device_buffer_full',
  overflowId: 'ovf-1',
  overflowAt: '2026-09-05T21:40:18.000Z',
  overflowPolicy: 'stop',
  buffer: { usedBytes: 1024 * MB, limitBytes: 1024 * MB },
  userStorage: { usedBytes: 1, limitBytes: 5000 * MB },
};

function makeHold(now = () => 1_000): { hold: DeviceOverflowHoldImpl; signals: OverflowWindowSignal[] } {
  const hold = new DeviceOverflowHoldImpl({ store: createMemoryOverflowHoldStore(), now });
  const signals: OverflowWindowSignal[] = [];
  hold.subscribeWindowSignal((s) => signals.push(s));
  return { hold, signals };
}

describe('DeviceOverflowHold — серверный путь (главный источник, M3 (б))', () => {
  it('отказ сервера с overflowId активирует удержание с этим id и временем факта', () => {
    const { hold, signals } = makeHold();
    expect(hold.isHeld()).toBe(false);

    expect(hold.activateFromServer(SERVER_REFUSAL)).toBe('entered');

    expect(hold.isHeld()).toBe(true);
    const ep = hold.getEpisode();
    expect(ep?.overflowId).toBe('ovf-1');
    expect(ep?.overflowAt).toBe(SERVER_REFUSAL.overflowAt);
    expect(ep?.reason).toBe('device_buffer_full');
    expect(ep?.source).toBe('server');
    expect(signals).toHaveLength(1);
    expect(signals[0]?.cause).toBe('entered');
  });

  it('100 отказов одного id → один сигнал окна и один вызов подписчика (порча: сигнал на каждый → красный)', () => {
    const { hold, signals } = makeHold();
    const changes = vi.fn();
    hold.subscribe(changes);

    const results = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      results.add(hold.activateFromServer(SERVER_REFUSAL));
    }

    expect([...results].sort()).toEqual(['entered', 'unchanged']);
    expect(signals).toHaveLength(1);
    expect(changes).toHaveBeenCalledTimes(1);
    expect(hold.getEpisode()?.overflowId).toBe('ovf-1');
  });

  it('другой overflowId при активном эпизоде — новый факт: сервер главнее, новый сигнал', () => {
    const { hold, signals } = makeHold();
    hold.activateFromServer(SERVER_REFUSAL);
    expect(hold.activateFromServer({ ...SERVER_REFUSAL, overflowId: 'ovf-2' })).toBe('entered');
    expect(hold.getEpisode()?.overflowId).toBe('ovf-2');
    expect(signals.map((s) => s.overflowId)).toEqual(['ovf-1', 'ovf-2']);
  });

  it('политика smart_cleanup в отказе: эпизод записан, но удержания нет', () => {
    const { hold } = makeHold();
    hold.activateFromServer({ ...SERVER_REFUSAL, overflowPolicy: 'smart_cleanup' });
    expect(hold.getEpisode()?.policy).toBe('smart_cleanup');
    expect(hold.isHeld()).toBe(false);
    expect(hold.refuseStart({ source: 'mic', what: 'запись' })).toBe(false);
  });
});

describe('DeviceOverflowHold — локальный страж и повышение до серверного id', () => {
  it('страж при пустом носителе открывает локальный эпизод без id, с временем стража', () => {
    const { hold, signals } = makeHold(() => Date.UTC(2026, 8, 6, 12, 0, 0));
    const result = applyLocalGuardFromQuota(hold, { usedBytes: 1000 * MB, limitBytes: 1024 * MB }, 'stop');
    expect(result).toBe('entered');
    expect(hold.isHeld()).toBe(true);
    expect(hold.getEpisode()).toMatchObject({
      overflowId: null,
      source: 'local',
      reason: 'device_buffer_full',
      overflowAt: '2026-09-06T12:00:00.000Z',
    });
    expect(signals).toHaveLength(1);
  });

  it('страж молчит ниже порога и при политике smart_cleanup', () => {
    const { hold } = makeHold();
    expect(applyLocalGuardFromQuota(hold, { usedBytes: 100 * MB, limitBytes: 1024 * MB }, 'stop')).toBe('ignored');
    expect(applyLocalGuardFromQuota(hold, { usedBytes: 1024 * MB, limitBytes: 1024 * MB }, 'smart_cleanup')).toBe('ignored');
    expect(hold.isHeld()).toBe(false);
  });

  it('локальный эпизод повышается до серверного overflowId БЕЗ второго сигнала (порча: сигнал → красный)', () => {
    const { hold, signals } = makeHold();
    const changes: string[] = [];
    hold.subscribe((_ep, change) => changes.push(change));

    applyLocalGuardFromQuota(hold, { usedBytes: 1000 * MB, limitBytes: 1024 * MB }, 'stop');
    expect(hold.activateFromServer(SERVER_REFUSAL)).toBe('promoted');

    expect(hold.getEpisode()).toMatchObject({
      overflowId: 'ovf-1',
      source: 'server',
      overflowAt: SERVER_REFUSAL.overflowAt,
    });
    expect(signals).toHaveLength(1);
    expect(changes).toEqual(['entered', 'promoted']);
  });

  it('страж поверх серверного эпизода ничего не меняет: сервер главнее', () => {
    const { hold, signals } = makeHold();
    hold.activateFromServer(SERVER_REFUSAL);
    expect(applyLocalGuardFromQuota(hold, { usedBytes: 1024 * MB, limitBytes: 1024 * MB }, 'stop')).toBe('unchanged');
    expect(hold.getEpisode()?.overflowId).toBe('ovf-1');
    expect(signals).toHaveLength(1);
  });

  it('оба пути пишут в один эпизод: два входа → один overflowId, один enteredAtMs', () => {
    let t = 1_000;
    const { hold } = makeHold(() => t);
    applyLocalGuardFromQuota(hold, { usedBytes: 1000 * MB, limitBytes: 1024 * MB }, 'stop');
    t = 5_000;
    hold.activateFromServer(SERVER_REFUSAL);
    expect(hold.getEpisode()?.enteredAtMs).toBe(1_000);
  });
});

describe('DeviceOverflowHold — повторный старт, рестарт, нет авто-возобновления', () => {
  it('повторный старт при удержании отбивается тем же фактом и снова даёт сигнал окна (T5)', () => {
    const { hold, signals } = makeHold();
    hold.activateFromServer(SERVER_REFUSAL);

    expect(hold.refuseStart({ source: 'mic', what: 'запись в буфер' })).toBe(true);
    expect(hold.refuseStart({ source: 'board', what: 'запись сценария' })).toBe(true);

    expect(signals.map((s) => s.cause)).toEqual(['entered', 'start-refused', 'start-refused']);
    expect(signals[1]?.overflowId).toBe('ovf-1');
    expect(signals[2]?.attempt?.source).toBe('board');
    expect(hold.getEpisode()?.overflowId).toBe('ovf-1');
  });

  it('без удержания старт не отбивается и сигнала нет', () => {
    const { hold, signals } = makeHold();
    expect(hold.refuseStart({ source: 'mic', what: 'запись' })).toBe(false);
    expect(signals).toHaveLength(0);
  });

  it('удержание переживает рестарт: новый носитель над тем же store читает тот же эпизод без нового сигнала', () => {
    const store = createMemoryOverflowHoldStore();
    const first = new DeviceOverflowHoldImpl({ store, now: () => 1 });
    first.activateFromServer(SERVER_REFUSAL);

    const restarted = new DeviceOverflowHoldImpl({ store, now: () => 2 });
    const signals: OverflowWindowSignal[] = [];
    restarted.subscribeWindowSignal((s) => signals.push(s));

    expect(restarted.isHeld()).toBe(true);
    expect(restarted.getEpisode()?.overflowId).toBe('ovf-1');
    expect(signals).toHaveLength(0);
    expect(restarted.activateFromServer(SERVER_REFUSAL)).toBe('unchanged');
  });

  it('освобождение места НЕ снимает удержание (порча: авто-resume → красный)', () => {
    const { hold } = makeHold();
    hold.activateFromServer(SERVER_REFUSAL);

    for (let i = 0; i < 10; i += 1) {
      applyLocalGuardFromQuota(hold, { usedBytes: 0, limitBytes: 1024 * MB }, 'stop');
    }

    expect(hold.isHeld()).toBe(true);
    expect(hold.getEpisode()?.overflowId).toBe('ovf-1');
  });

  it('выход только release: человек или очистка; после — старт не отбивается', () => {
    const { hold } = makeHold();
    const changes: string[] = [];
    hold.subscribe((_ep, change) => changes.push(change));
    hold.activateFromServer(SERVER_REFUSAL);

    hold.release('cleanup');

    expect(hold.isHeld()).toBe(false);
    expect(hold.getEpisode()).toBeNull();
    expect(hold.refuseStart({ source: 'mic', what: 'запись' })).toBe(false);
    expect(changes).toEqual(['entered', 'released']);

    // release без эпизода — no-op, подписчик не дёргается.
    hold.release('human');
    expect(changes).toEqual(['entered', 'released']);
  });
});

describe('overflowHoldToRuntimePayload — значение состояния узла (M4 (б))', () => {
  let hold: DeviceOverflowHoldImpl;

  beforeEach(() => {
    hold = new DeviceOverflowHoldImpl({ store: createMemoryOverflowHoldStore(), now: () => Date.UTC(2026, 8, 6) });
  });

  it('нет эпизода → null', () => {
    expect(hold.toRuntimePayload()).toBeNull();
    expect(overflowHoldToRuntimePayload(null)).toBeNull();
  });

  it('локальный эпизод → held_local без id; серверный → held с id, reason, overflowAt', () => {
    applyLocalGuardFromQuota(hold, { usedBytes: 1000 * MB, limitBytes: 1024 * MB }, 'stop');
    expect(hold.toRuntimePayload()).toEqual({
      phase: 'held_local',
      reason: 'device_buffer_full',
      overflowId: null,
      overflowAt: '2026-09-06T00:00:00.000Z',
      policy: 'stop',
    });

    hold.activateFromServer(SERVER_REFUSAL);
    expect(hold.toRuntimePayload()).toEqual({
      phase: 'held',
      reason: 'device_buffer_full',
      overflowId: 'ovf-1',
      overflowAt: SERVER_REFUSAL.overflowAt,
      policy: 'stop',
    });
  });
});
