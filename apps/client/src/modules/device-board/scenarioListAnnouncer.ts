import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  normalizeScenarioSelection,
  type BoardScenarioListItem,
} from '@membrana/core';
import type { DeviceBoardWorkspaceHost } from '@membrana/device-board';

import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';
import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';
import { useServerFirstStore } from '@/stores/serverFirstStore';

import { createHybridDeviceBoardWorkspaceHost } from './createHybridDeviceBoardWorkspaceHost.js';
import { resolveDeviceBoardPersistDeviceId } from './resolveDeviceBoardPersistDeviceId.js';
import { resolveWorkspaceTariff } from './workspace-tariff.js';

/**
 * CX3: объявление списка сценариев узла (board.scenario-list, узел → сервер).
 * Сценарии пользовательские и живут на устройстве — сервер хранит только
 * {id, title} + выбранный. Вызывается при получении захвата (boardLeaseBridge)
 * и после изменения набора workspace'ов под захватом.
 *
 * Инвариант «один всегда выбран»: предпочтение — уже выбранный кабинетом
 * (serverFirstStore.selectedScenarioId), иначе активный workspace устройства,
 * иначе первый в списке (normalizeScenarioSelection).
 */
export async function announceScenarioList(): Promise<boolean> {
  const { mode, pairing } = useNodeConnectionStore.getState();
  if (mode !== 'paired' || pairing === null) return false;

  const client = getNodeRealtimeClient();
  const wireDeviceId = client.getDeviceId();
  if (wireDeviceId === null) return false;

  try {
    const persistDeviceId = resolveDeviceBoardPersistDeviceId(pairing);
    const tariff = resolveWorkspaceTariff(mode, pairing);
    const host = createHybridDeviceBoardWorkspaceHost(
      persistDeviceId,
      pairing,
      tariff.maxUserWorkspaces,
    );
    const [items, activeWorkspaceId] = await Promise.all([
      host.listWorkspaces(),
      host.getActiveWorkspaceId(),
    ]);
    const scenarios: BoardScenarioListItem[] = items.map((workspace) => ({
      id: workspace.workspaceId,
      title: workspace.title,
    }));
    const preferred =
      useServerFirstStore.getState().selectedScenarioId ?? activeWorkspaceId;
    client.send(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.scenarioList, {
        deviceId: wireDeviceId,
        scenarios,
        selectedScenarioId: normalizeScenarioSelection(scenarios, preferred),
      }),
    );
    return true;
  } catch {
    // best-effort: без списка кабинет остаётся на «сохранённом сценарии» —
    // повторное объявление придёт со следующим захватом/изменением набора.
    return false;
  }
}

/**
 * CX3: обёртка workspace host — после мутаций набора (create/rename/delete)
 * под активным захватом узел ре-объявляет список серверу. Без захвата — no-op:
 * объявление придёт со следующим board.capture.
 */
export function withScenarioListAnnouncements(
  host: DeviceBoardWorkspaceHost,
): DeviceBoardWorkspaceHost {
  const reannounceIfCaptured = (): void => {
    if (useServerFirstStore.getState().capture === null) return;
    void announceScenarioList();
  };
  return {
    ...host,
    async createWorkspace(title) {
      const result = await host.createWorkspace(title);
      if (result !== null) reannounceIfCaptured();
      return result;
    },
    async cloneWorkspaceFromUserCase(input) {
      const result = await host.cloneWorkspaceFromUserCase(input);
      if (result !== null) reannounceIfCaptured();
      return result;
    },
    async renameWorkspace(workspaceId, title) {
      const result = await host.renameWorkspace(workspaceId, title);
      reannounceIfCaptured();
      return result;
    },
    async deleteWorkspace(workspaceId) {
      const result = await host.deleteWorkspace(workspaceId);
      reannounceIfCaptured();
      return result;
    },
  };
}
