import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  type RuntimeCommandPayload,
  type RuntimeStatePayload,
} from '@membrana/core';

import {
  captureDevice as captureDeviceApi,
  releaseDevice as releaseDeviceApi,
  type DeviceCaptureMode,
  type DeviceCaptureView,
} from '@/api/deviceCapture';
import {
  buildCabinetRunScenarioCommand,
  buildCabinetSelectScenarioCommand,
  buildCabinetStopScenarioCommand,
} from '@/lib/cabinetNodeRuntimeCommands';
import {
  getCabinetNodeRealtimeClient,
  type CabinetRealtimeClientState,
} from '@/lib/cabinetNodeRealtimeClient';
import {
  applyCaptureFromRest,
  getCabinetRuntimeSnapshot,
  startCabinetRuntimeStore,
  subscribeCabinetRuntime,
} from '@/lib/cabinetNodeRuntimeStore';
import type { DeviceScenarioListView } from '@/lib/cabinetRuntimeState';
import { isDeviceLive as checkDeviceLive } from '@/lib/isDeviceLive';

export type { DeviceScenarioListView } from '@/lib/cabinetRuntimeState';

export interface CabinetNodeRuntime {
  /** Последнее состояние runtime по deviceId узла. */
  readonly states: Record<string, RuntimeStatePayload>;
  readonly connection: CabinetRealtimeClientState;
  /** deviceId узлов с активной online-presence (node.online). */
  readonly onlineDeviceIds: ReadonlySet<string>;
  /** CT3 (tariff v2): активные захваты по deviceId (board.capture broadcast + REST). */
  readonly captures: Record<string, DeviceCaptureView>;
  /** CX3: списки сценариев по deviceId (объявление узла + bootstrap GET). */
  readonly scenarioLists: Record<string, DeviceScenarioListView>;
  /** Единый селектор «связь жива» для gating Пуска (DBR6). */
  readonly isDeviceLive: (deviceId: string | null | undefined) => boolean;
  /** CT3: явный захват устройства (шаг 1 двухшаговой модели, канон §1). */
  readonly captureDevice: (nodeId: string, mode: DeviceCaptureMode) => Promise<void>;
  /** CT3: отпустить захват (играющий сценарий НЕ останавливается, канон §3). */
  readonly releaseDevice: (nodeId: string) => Promise<void>;
  readonly run: (deviceId: string) => void;
  readonly stop: (deviceId: string) => void;
  /** CX3: выбрать сценарий из объявленного списка (сервер — источник истины). */
  readonly selectScenario: (deviceId: string, scenarioId: string) => void;
  // CT7: pause/resume/setMode удалены (// Tariff v3).
}

/**
 * MP7b RT5 + SF6 + CT3 + CX6: тонкий хук над модульным стором runtime.
 * Состояние (presence/захваты/сценарии) живёт в cabinetNodeRuntimeStore и
 * переживает навигацию по разделам кабинета — presence.snapshot сервер шлёт
 * только при открытии WS, per-mount React-стейт терял его до hard-reload
 * (прод-находка владельца 2026-07-07). Интерфейс не изменён.
 */
export function useCabinetNodeRuntime(membraneId: string | null): CabinetNodeRuntime {
  useEffect(() => {
    if (!membraneId) return;
    getCabinetNodeRealtimeClient().connect(membraneId);
    startCabinetRuntimeStore();
  }, [membraneId]);

  const snapshot = useSyncExternalStore(subscribeCabinetRuntime, getCabinetRuntimeSnapshot);

  const isDeviceLive = useCallback(
    (deviceId: string | null | undefined) => checkDeviceLive(deviceId, snapshot.onlineDeviceIds),
    [snapshot.onlineDeviceIds],
  );

  const captureDevice = useCallback(async (nodeId: string, mode: DeviceCaptureMode) => {
    const { capture } = await captureDeviceApi(nodeId, mode);
    applyCaptureFromRest(capture);
  }, []);

  const releaseDevice = useCallback(async (nodeId: string) => {
    await releaseDeviceApi(nodeId);
    // Точечная очистка придёт через board.release broadcast (там есть deviceId).
  }, []);

  const sendCommand = useCallback((payload: RuntimeCommandPayload) => {
    getCabinetNodeRealtimeClient().send(
      createNodeRealtimeEnvelope('runtime', NODE_REALTIME_EVENT_TYPES.runtime.command, payload),
    );
  }, []);

  // CX3: «Пуск» запускает выбранный сценарий (если список объявлен);
  // без списка — сохранённый сценарий устройства, как раньше.
  const run = useCallback(
    (deviceId: string) =>
      sendCommand(
        buildCabinetRunScenarioCommand(
          deviceId,
          getCabinetRuntimeSnapshot().scenarioLists[deviceId]?.selectedScenarioId ?? undefined,
        ),
      ),
    [sendCommand],
  );
  const stop = useCallback(
    (deviceId: string) => sendCommand(buildCabinetStopScenarioCommand(deviceId)),
    [sendCommand],
  );
  // CX3: выбор без optimistic-обновления — сервер валидирует против
  // объявленного списка и ре-бродкастит авторитетный снапшот.
  const selectScenario = useCallback(
    (deviceId: string, scenarioId: string) =>
      sendCommand(buildCabinetSelectScenarioCommand(deviceId, scenarioId)),
    [sendCommand],
  );

  return useMemo(
    () => ({
      states: snapshot.states,
      connection: snapshot.connection,
      onlineDeviceIds: snapshot.onlineDeviceIds,
      captures: snapshot.captures,
      scenarioLists: snapshot.scenarioLists,
      isDeviceLive,
      captureDevice,
      releaseDevice,
      run,
      stop,
      selectScenario,
    }),
    [captureDevice, isDeviceLive, releaseDevice, run, selectScenario, snapshot, stop],
  );
}
