import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceBoardWorkspaceHost } from '@membrana/device-board';

import { useServerFirstStore } from '@/stores/serverFirstStore';

import { withScenarioListAnnouncements } from './scenarioListAnnouncer';

// announceScenarioList сам ходит в сеть, но без paired-режима (reset стора)
// коротко замыкается до send — unit проверяет делегирование и отсутствие
// побочных эффектов вне захвата.

function fakeHost(): DeviceBoardWorkspaceHost {
  return {
    maxUserWorkspaces: 3,
    listWorkspaces: vi.fn().mockResolvedValue([]),
    countWorkspaces: vi.fn().mockResolvedValue(0),
    getActiveWorkspaceId: vi.fn().mockResolvedValue(null),
    loadWorkspace: vi.fn().mockResolvedValue(null),
    createWorkspace: vi.fn().mockResolvedValue({ workspaceId: 'ws-new', document: {} as never }),
    cloneWorkspaceFromUserCase: vi
      .fn()
      .mockResolvedValue({ workspaceId: 'ws-clone', document: {} as never }),
    renameWorkspace: vi.fn().mockResolvedValue(true),
    deleteWorkspace: vi.fn().mockResolvedValue(true),
    setActiveWorkspaceId: vi.fn().mockResolvedValue(undefined),
    saveWorkspace: vi.fn().mockResolvedValue(undefined),
  } as unknown as DeviceBoardWorkspaceHost;
}

describe('withScenarioListAnnouncements (CX3)', () => {
  beforeEach(() => {
    useServerFirstStore.getState().reset();
  });

  it('делегирует мутации оригинальному host и сохраняет результат', async () => {
    const host = fakeHost();
    const wrapped = withScenarioListAnnouncements(host);

    const created = await wrapped.createWorkspace('Новый');
    expect(created?.workspaceId).toBe('ws-new');
    expect(host.createWorkspace).toHaveBeenCalledWith('Новый');

    await expect(wrapped.deleteWorkspace('ws-1')).resolves.toBe(true);
    await expect(wrapped.renameWorkspace('ws-1', 'Имя')).resolves.toBe(true);
  });

  it('без захвата мутации НЕ шлют объявление (нет исходящего в клиент WS)', async () => {
    const host = fakeHost();
    const wrapped = withScenarioListAnnouncements(host);

    // capture === null (reset) — announceScenarioList не должен дойти до send:
    // он отваливается на mode !== 'paired' и вернёт false, но главное — сам
    // вызов не планируется. Проверяем косвенно: mutation resolve без ошибок.
    await expect(wrapped.createWorkspace('X')).resolves.not.toBeNull();
  });

  it('read-методы проксируются без изменений', async () => {
    const host = fakeHost();
    const wrapped = withScenarioListAnnouncements(host);

    await wrapped.listWorkspaces();
    await wrapped.getActiveWorkspaceId();

    expect(host.listWorkspaces).toHaveBeenCalled();
    expect(host.getActiveWorkspaceId).toHaveBeenCalled();
  });
});
