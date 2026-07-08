import { describe, expect, it, vi } from 'vitest';

import { DeviceScenarioRegistry, type DeviceScenarioEntry } from './device-scenario.registry';
import type {
  ScenarioSelectionStore,
  StoredScenarioSelection,
} from './scenario-selection.store';

const list = { scenarios: [{ id: 's1', title: 'One' }, { id: 's2', title: 'Two' }] };

function fakeStore(initial: readonly StoredScenarioSelection[] = []): ScenarioSelectionStore & {
  upsert: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  clearAll: ReturnType<typeof vi.fn>;
} {
  return {
    loadAll: vi.fn().mockResolvedValue(initial),
    upsert: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('DeviceScenarioRegistry — персистентность (TD2)', () => {
  it('без стора работает чисто in-memory (обратная совместимость)', () => {
    const reg = new DeviceScenarioRegistry();
    reg.setList('m1', { deviceId: 'd1', ...list, selectedScenarioId: 's2' });
    expect(reg.get('d1')?.selectedScenarioId).toBe('s2');
  });

  it('onModuleInit гидратирует кэш из стора (переживает рестарт)', async () => {
    const entry: DeviceScenarioEntry = {
      membraneId: 'm1',
      scenarios: list.scenarios,
      selectedScenarioId: 's1',
    };
    const store = fakeStore([{ mediaDeviceId: 'd1', entry }]);
    const reg = new DeviceScenarioRegistry(store);

    expect(reg.get('d1')).toBeNull(); // до гидрации пусто
    await reg.onModuleInit();
    expect(reg.get('d1')).toEqual(entry); // после — восстановлено из БД
  });

  it('setList и select пишут через стор (write-through)', async () => {
    const store = fakeStore();
    const reg = new DeviceScenarioRegistry(store);

    reg.setList('m1', { deviceId: 'd1', ...list, selectedScenarioId: 's1' });
    reg.select('d1', 's2');
    await flush();

    expect(store.upsert).toHaveBeenCalledTimes(2);
    expect(store.upsert).toHaveBeenLastCalledWith(
      'd1',
      expect.objectContaining({ selectedScenarioId: 's2' }),
    );
  });

  it('delete/clear удаляют через стор', async () => {
    const store = fakeStore();
    const reg = new DeviceScenarioRegistry(store);
    reg.setList('m1', { deviceId: 'd1', ...list, selectedScenarioId: 's1' });

    reg.delete('d1');
    reg.clear();
    await flush();

    expect(store.remove).toHaveBeenCalledWith('d1');
    expect(store.clearAll).toHaveBeenCalledTimes(1);
  });

  it('сбой стора не роняет реестр (best-effort, деградация)', async () => {
    const store = fakeStore();
    store.upsert.mockRejectedValueOnce(new Error('db down'));
    store.loadAll = vi.fn().mockRejectedValue(new Error('db down'));
    const reg = new DeviceScenarioRegistry(store);

    await expect(reg.onModuleInit()).resolves.toBeUndefined(); // гидрация не бросает
    expect(() =>
      reg.setList('m1', { deviceId: 'd1', ...list, selectedScenarioId: 's1' }),
    ).not.toThrow();
    await flush();
    expect(reg.get('d1')?.selectedScenarioId).toBe('s1'); // кэш работает несмотря на сбой БД
  });
});
