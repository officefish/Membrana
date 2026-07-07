import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ScenarioRuntimeHost } from '@membrana/device-board';

import {
  getDeviceBoardRuntimeController,
  resetDeviceBoardRuntimeControllerForTests,
} from './deviceBoardRuntimeController';

// Минимальный host-заглушка: runtime не запускаем, проверяем только plumbing
// единого инстанса (CSR1). Аудио/мик-порты не вызываются в этих кейсах.
function fakeHost(): ScenarioRuntimeHost {
  return new Proxy(
    {},
    {
      get: () => () => undefined,
    },
  ) as unknown as ScenarioRuntimeHost;
}

describe('DeviceBoardRuntimeController.acquireRuntime (CSR1)', () => {
  afterEach(() => {
    resetDeviceBoardRuntimeControllerForTests();
  });

  it('возвращает единый инстанс runtime между вызовами', () => {
    const controller = getDeviceBoardRuntimeController();
    const first = controller.acquireRuntime(fakeHost());
    const second = controller.acquireRuntime(fakeHost());
    expect(second).toBe(first);
  });

  it('состояние контроллера = состояние общего runtime (борд и мост видят одно)', () => {
    const controller = getDeviceBoardRuntimeController();
    const runtime = controller.acquireRuntime(fakeHost());
    expect(controller.getState()).toEqual(runtime.getState());
  });

  it('подписка контроллера получает изменения общего runtime (эмиссия на сервер)', () => {
    const controller = getDeviceBoardRuntimeController();
    const runtime = controller.acquireRuntime(fakeHost());
    const listener = vi.fn();
    const unsub = controller.subscribe(listener);
    // Борд крутит ТОТ ЖЕ runtime (externalRuntime) → контроллер уведомляет мост.
    runtime.setMode('alarm');
    expect(listener).toHaveBeenCalled();
    unsub();
  });
});
