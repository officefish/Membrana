import type {
  BoardCaptureHeartbeatPayload,
  BoardCapturePayload,
  BoardCaptureReleasePayload,
  BoardScenarioListPayload,
  PresenceSnapshotPayload,
  RuntimeStatePayload,
} from '@membrana/core';

import type { BoardScenarioListItem } from '@membrana/core';

import type { DeviceCaptureView } from '@/api/deviceCapture';
import type { CabinetRealtimeClientState } from '@/lib/cabinetNodeRealtimeClient';
import { capturesByDeviceId } from '@/lib/captureSnapshot';

/** CX3: объявленный узлом список сценариев + выбранный. */
export interface DeviceScenarioListView {
  readonly scenarios: readonly BoardScenarioListItem[];
  readonly selectedScenarioId: string | null;
}

/**
 * CX6: снимок runtime-состояния кабинета. Живёт в модульном сторе
 * (cabinetNodeRuntimeStore), а не в React-состоянии страницы: presence.snapshot
 * сервер шлёт только при открытии WS, и per-mount стейт после навигации
 * оставался пустым до hard-reload («сопряжён · offline» — прод-находка
 * владельца 2026-07-07). Редьюсеры чистые — стор только применяет их.
 */
export interface CabinetRuntimeSnapshot {
  readonly connection: CabinetRealtimeClientState;
  readonly states: Record<string, RuntimeStatePayload>;
  readonly onlineDeviceIds: ReadonlySet<string>;
  readonly captures: Record<string, DeviceCaptureView>;
  readonly scenarioLists: Record<string, DeviceScenarioListView>;
}

export const INITIAL_CABINET_RUNTIME_SNAPSHOT: CabinetRuntimeSnapshot = {
  connection: 'disconnected',
  states: {},
  onlineDeviceIds: new Set(),
  captures: {},
  scenarioLists: {},
};

export function applyConnection(
  prev: CabinetRuntimeSnapshot,
  connection: CabinetRealtimeClientState,
): CabinetRuntimeSnapshot {
  if (prev.connection === connection) return prev;
  return { ...prev, connection };
}

/** PL1: снапшот присутствия — авторитетная полная замена набора. */
export function applyPresenceSnapshot(
  prev: CabinetRuntimeSnapshot,
  payload: PresenceSnapshotPayload,
): CabinetRuntimeSnapshot {
  return { ...prev, onlineDeviceIds: new Set(payload.onlineDeviceIds) };
}

export function applyPresenceOnline(
  prev: CabinetRuntimeSnapshot,
  deviceId: string,
): CabinetRuntimeSnapshot {
  if (prev.onlineDeviceIds.has(deviceId)) return prev;
  const next = new Set(prev.onlineDeviceIds);
  next.add(deviceId);
  return { ...prev, onlineDeviceIds: next };
}

export function applyPresenceOffline(
  prev: CabinetRuntimeSnapshot,
  deviceId: string,
): CabinetRuntimeSnapshot {
  if (!prev.onlineDeviceIds.has(deviceId)) return prev;
  const next = new Set(prev.onlineDeviceIds);
  next.delete(deviceId);
  return { ...prev, onlineDeviceIds: next };
}

export function applyRuntimeState(
  prev: CabinetRuntimeSnapshot,
  payload: RuntimeStatePayload,
): CabinetRuntimeSnapshot {
  if (!payload.deviceId) return prev;
  return { ...prev, states: { ...prev.states, [payload.deviceId]: payload } };
}

/** CX2: авторитетный REST-снапшот захватов (+CX3: списки сценариев из него). */
export function applyCapturesBootstrap(
  prev: CabinetRuntimeSnapshot,
  list: readonly DeviceCaptureView[],
): CabinetRuntimeSnapshot {
  const scenarioLists = { ...prev.scenarioLists };
  for (const capture of list) {
    if (capture.scenarios !== undefined) {
      scenarioLists[capture.deviceId] = {
        scenarios: capture.scenarios,
        selectedScenarioId: capture.selectedScenarioId ?? null,
      };
    }
  }
  return { ...prev, captures: capturesByDeviceId(list), scenarioLists };
}

export function applyBoardCapture(
  prev: CabinetRuntimeSnapshot,
  payload: BoardCapturePayload,
): CabinetRuntimeSnapshot {
  return {
    ...prev,
    captures: {
      ...prev.captures,
      [payload.deviceId]: {
        deviceId: payload.deviceId,
        mode: payload.mode,
        sessionId: payload.sessionId,
        acquiredAt: payload.acquiredAt,
        expiresAt: payload.expiresAt,
      },
    },
  };
}

/** REST-ответ capture применяем сразу (broadcast придёт следом — идемпотентно). */
export function applyCaptureView(
  prev: CabinetRuntimeSnapshot,
  capture: DeviceCaptureView,
): CabinetRuntimeSnapshot {
  return { ...prev, captures: { ...prev.captures, [capture.deviceId]: capture } };
}

export function applyCaptureHeartbeat(
  prev: CabinetRuntimeSnapshot,
  payload: BoardCaptureHeartbeatPayload,
): CabinetRuntimeSnapshot {
  const current = prev.captures[payload.deviceId];
  if (!current || current.sessionId !== payload.sessionId) return prev;
  return {
    ...prev,
    captures: {
      ...prev.captures,
      [payload.deviceId]: { ...current, expiresAt: payload.expiresAt },
    },
  };
}

export function applyCaptureRelease(
  prev: CabinetRuntimeSnapshot,
  payload: BoardCaptureReleasePayload,
): CabinetRuntimeSnapshot {
  if (!(payload.deviceId in prev.captures)) return prev;
  const captures = { ...prev.captures };
  delete captures[payload.deviceId];
  return { ...prev, captures };
}

/** CX3: объявление узла / ре-бродкаст select'а — авторитетная замена списка. */
export function applyScenarioList(
  prev: CabinetRuntimeSnapshot,
  payload: BoardScenarioListPayload,
): CabinetRuntimeSnapshot {
  return {
    ...prev,
    scenarioLists: {
      ...prev.scenarioLists,
      [payload.deviceId]: {
        scenarios: payload.scenarios,
        selectedScenarioId: payload.selectedScenarioId,
      },
    },
  };
}
