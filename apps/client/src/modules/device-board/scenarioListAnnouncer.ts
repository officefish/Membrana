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
import { readDeviceBoardUserCaseGate } from './user-case-settings-gate.js';

/**
 * csp-3: системные (по тарифу) сценарии узла из каталога UserCases. bundled
 * доступны всегда; tariff-gated помечены entitlement (locked/entitled по
 * entitledTariffSkus из config, который приходит с node.entitlements). Кабинет
 * группирует их отдельно и показывает locked неактивными (апселл).
 */
export function collectSystemScenarios(): BoardScenarioListItem[] {
  const gate = readDeviceBoardUserCaseGate();
  if (!gate.catalogEnabled) return [];
  // deviceKind фиксирован 'microphone': текущий полевой узел — микрофонный
  // (FREE-каталог microphone-only). Обобщение на другие deviceKind — когда появятся.
  return gate.catalogService.listCards('microphone').map((card) => ({
    id: card.id,
    title: card.title,
    kind: 'system' as const,
    ...(card.description !== undefined ? { description: card.description } : {}),
    entitlement: card.entitlement,
    branchCount: card.branchCount,
    functionCount: card.functionCount,
  }));
}

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
    const userScenarios: BoardScenarioListItem[] = items.map((workspace) => ({
      id: workspace.workspaceId,
      title: workspace.title,
      kind: 'user' as const,
    }));
    // csp-3: единый список = пользовательские + системные (по тарифу). Дедуп по id
    // защищает инвариант сервера (parseBoardScenarioListPayload отвергает дубли).
    const userIds = new Set(userScenarios.map((scenario) => scenario.id));
    const scenarios: BoardScenarioListItem[] = [
      ...userScenarios,
      ...collectSystemScenarios().filter((scenario) => !userIds.has(scenario.id)),
    ];
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
