/**
 * Зубы контроллера окна (поведение окна по #2310 / посылка M3, T5, T9). Предмет —
 * `controller.ts` поверх НАСТОЯЩЕГО носителя удержания (`DeviceOverflowHoldImpl`, память).
 *
 * Порчи → красный: второе окно на тот же `overflowId` (opensForKey по `entered` > 1 или
 * смена ключа) — красный; `close()` снял удержание (`isHeld()` стал false / `release` вызван)
 * — красный; `start-refused` при закрытом окне не поднял то же окно того же id — красный;
 * `releaseByHuman` не зовёт `release('human')` — красный.
 */
import { BUFFER_OVERFLOW_REASONS } from '@membrana/plugin-contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  resetDeviceOverflowHoldForTests,
  type DeviceOverflowHold,
  type OverflowRefusalSnapshot,
} from '@/lib/device-overflow-hold';

import { OverflowWindowController, resetOverflowWindowControllerForTests } from './controller';

const REFUSAL: OverflowRefusalSnapshot = {
  reason: BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL,
  overflowId: 'ovf-1',
  overflowAt: '2026-09-06T02:11:00.000Z',
  overflowPolicy: 'stop',
  buffer: { usedBytes: 100, limitBytes: 100 },
  userStorage: { usedBytes: 0, limitBytes: 100 },
};

describe('OverflowWindowController — одно окно на overflowId', () => {
  let hold: DeviceOverflowHold;
  let controller: OverflowWindowController;

  beforeEach(() => {
    hold = resetDeviceOverflowHoldForTests();
    controller = resetOverflowWindowControllerForTests(hold);
  });

  afterEach(() => {
    controller.dispose();
  });

  it('entered → окно открыто на этот id; 100 повторных отказов того же id → окно то же, одно', () => {
    const opens: string[] = [];
    controller.subscribe(() => {
      const s = controller.getSnapshot();
      if (s.open) opens.push(`${s.windowKey}:${s.cause}`);
    });
    expect(hold.activateFromServer(REFUSAL)).toBe('entered');
    for (let i = 0; i < 100; i += 1) expect(hold.activateFromServer(REFUSAL)).toBe('unchanged');
    const s = controller.getSnapshot();
    expect(s.open).toBe(true);
    expect(s.windowKey).toBe('ovf-1');
    expect(s.cause).toBe('entered');
    expect(s.opensForKey).toBe(1);
    expect(opens).toEqual(['ovf-1:entered']);
  });

  it('закрытие окна (Esc/крестик) НЕ снимает удержание: isHeld остаётся, release не зовётся', () => {
    const release = vi.spyOn(hold, 'release');
    hold.activateFromServer(REFUSAL);
    controller.close();
    expect(controller.getSnapshot().open).toBe(false);
    expect(hold.isHeld()).toBe(true);
    expect(hold.getEpisode()?.overflowId).toBe('ovf-1');
    expect(release).not.toHaveBeenCalled();
  });

  it('start-refused при удержании поднимает ТО ЖЕ окно того же id с отбитой попыткой (T5)', () => {
    hold.activateFromServer(REFUSAL);
    controller.close();
    expect(hold.refuseStart({ source: 'board', what: 'запись сценария' })).toBe(true);
    const s = controller.getSnapshot();
    expect(s.open).toBe(true);
    expect(s.windowKey).toBe('ovf-1');
    expect(s.cause).toBe('start-refused');
    expect(s.refusedAttempt).toEqual({ source: 'board', what: 'запись сценария' });
    expect(s.opensForKey).toBe(2);
  });

  it('плашка/бейдж: openForCurrentEpisode — то же окно того же id; без эпизода — ничего', () => {
    expect(controller.openForCurrentEpisode()).toBe(false);
    expect(controller.getSnapshot().open).toBe(false);
    hold.activateFromServer(REFUSAL);
    controller.close();
    expect(controller.openForCurrentEpisode()).toBe(true);
    const s = controller.getSnapshot();
    expect(s.windowKey).toBe('ovf-1');
    expect(s.cause).toBe('reopen');
  });

  it('releaseByHuman — единственный ручной выход: release("human"), после сброса окно можно закрыть в ноль', () => {
    const release = vi.spyOn(hold, 'release');
    hold.activateFromServer(REFUSAL);
    controller.releaseByHuman();
    expect(release).toHaveBeenCalledWith('human');
    expect(hold.isHeld()).toBe(false);
    // Окно открыто — остаётся для сводки, но уже «не удержано».
    expect(controller.getSnapshot().open).toBe(true);
    expect(controller.getSnapshot().held).toBe(false);
    controller.close();
    expect(controller.getSnapshot()).toMatchObject({ open: false, windowKey: null, episode: null });
  });

  it('локальный эпизод повышается до серверного без второго окна: ключ следует за id', () => {
    expect(
      hold.activateFromLocalGuard({
        reason: BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL,
        buffer: { usedBytes: 96, limitBytes: 100 },
        policy: 'stop',
      }),
    ).toBe('entered');
    const localKey = controller.getSnapshot().windowKey;
    expect(localKey?.startsWith('local:')).toBe(true);
    expect(hold.activateFromServer(REFUSAL)).toBe('promoted');
    const s = controller.getSnapshot();
    expect(s.windowKey).toBe('ovf-1');
    expect(s.opensForKey).toBe(1);
    expect(s.open).toBe(true);
  });

  it('новый серверный id при живом удержании (после release) — новое окно нового факта', () => {
    hold.activateFromServer(REFUSAL);
    controller.close();
    hold.release('human');
    expect(controller.getSnapshot().windowKey).toBeNull();
    expect(hold.activateFromServer({ ...REFUSAL, overflowId: 'ovf-2' })).toBe('entered');
    expect(controller.getSnapshot()).toMatchObject({ open: true, windowKey: 'ovf-2', opensForKey: 1 });
  });

  it('сброс очисткой при закрытом окне обнуляет состояние; при открытом — окно живёт для сводки', () => {
    hold.activateFromServer(REFUSAL);
    controller.close();
    hold.release('cleanup');
    expect(controller.getSnapshot()).toMatchObject({ open: false, windowKey: null });

    hold.activateFromServer({ ...REFUSAL, overflowId: 'ovf-3' });
    hold.release('cleanup');
    expect(controller.getSnapshot()).toMatchObject({ open: true, windowKey: 'ovf-3', held: false });
  });

  it('контроллер не знает сети и библиотеки: в нём нет getQuota/refresh/fetch', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('./controller.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/getQuota|refresh\(|fetch\(|media-library/u);
  });
});
