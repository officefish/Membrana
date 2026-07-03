import { useCallback, useEffect, useMemo, useState } from 'react';
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
  buildCabinetStopScenarioCommand,
} from '@/lib/cabinetNodeRuntimeCommands';
import {
  getCabinetNodeRealtimeClient,
  type CabinetRealtimeClientState,
} from '@/lib/cabinetNodeRealtimeClient';
import { isDeviceLive as checkDeviceLive } from '@/lib/isDeviceLive';

export interface CabinetNodeRuntime {
  /** Последнее состояние runtime по deviceId узла. */
  readonly states: Record<string, RuntimeStatePayload>;
  readonly connection: CabinetRealtimeClientState;
  /** deviceId узлов с активной online-presence (node.online). */
  readonly onlineDeviceIds: ReadonlySet<string>;
  /** CT3 (tariff v2): активные захваты по deviceId (board.capture broadcast + REST). */
  readonly captures: Record<string, DeviceCaptureView>;
  /** Единый селектор «связь жива» для gating Пуска (DBR6). */
  readonly isDeviceLive: (deviceId: string | null | undefined) => boolean;
  /** CT3: явный захват устройства (шаг 1 двухшаговой модели, канон §1). */
  readonly captureDevice: (nodeId: string, mode: DeviceCaptureMode) => Promise<void>;
  /** CT3: отпустить захват (играющий сценарий НЕ останавливается, канон §3). */
  readonly releaseDevice: (nodeId: string) => Promise<void>;
  readonly run: (deviceId: string) => void;
  readonly stop: (deviceId: string) => void;
  // CT7: pause/resume/setMode удалены (// Tariff v3).
}

/**
 * MP7b RT5 + SF6 + CT3: подключение кабинета к runtime/board каналам,
 * явный захват устройств и управление сохранённым сценарием (tariff v2).
 */
export function useCabinetNodeRuntime(membraneId: string | null): CabinetNodeRuntime {
  const [states, setStates] = useState<Record<string, RuntimeStatePayload>>({});
  const [connection, setConnection] = useState<CabinetRealtimeClientState>('disconnected');
  const [onlineDeviceIds, setOnlineDeviceIds] = useState<ReadonlySet<string>>(() => new Set());
  const [captures, setCaptures] = useState<Record<string, DeviceCaptureView>>({});

  useEffect(() => {
    if (!membraneId) return undefined;
    const client = getCabinetNodeRealtimeClient();
    client.connect(membraneId);
    setConnection(client.getState());
    const unsubState = client.subscribeState((next) => {
      setConnection(next);
      if (next === 'disconnected' || next === 'connecting') {
        setOnlineDeviceIds(new Set());
      }
    });
    const unsubRuntime = client.subscribeRuntimeState((payload) => {
      if (!payload.deviceId) return;
      const deviceId = payload.deviceId;
      setStates((prev) => ({ ...prev, [deviceId]: payload }));
    });
    const unsubOnline = client.subscribePresenceOnline((payload) => {
      setOnlineDeviceIds((prev) => {
        const next = new Set(prev);
        next.add(payload.deviceId);
        return next;
      });
    });
    const unsubOffline = client.subscribePresenceOffline((payload) => {
      setOnlineDeviceIds((prev) => {
        const next = new Set(prev);
        next.delete(payload.deviceId);
        return next;
      });
    });
    // CT3: снимок захватов из board broadcast (единый источник — сервер).
    const unsubCapture = client.subscribeBoardCapture((payload) => {
      setCaptures((prev) => ({
        ...prev,
        [payload.deviceId]: {
          deviceId: payload.deviceId,
          mode: payload.mode,
          sessionId: payload.sessionId,
          acquiredAt: payload.acquiredAt,
          expiresAt: payload.expiresAt,
        },
      }));
    });
    const unsubHeartbeat = client.subscribeBoardCaptureHeartbeat((payload) => {
      setCaptures((prev) => {
        const current = prev[payload.deviceId];
        if (!current || current.sessionId !== payload.sessionId) return prev;
        return { ...prev, [payload.deviceId]: { ...current, expiresAt: payload.expiresAt } };
      });
    });
    const unsubRelease = client.subscribeBoardCaptureRelease((payload) => {
      setCaptures((prev) => {
        if (!(payload.deviceId in prev)) return prev;
        const next = { ...prev };
        delete next[payload.deviceId];
        return next;
      });
    });
    return () => {
      unsubState();
      unsubRuntime();
      unsubOnline();
      unsubOffline();
      unsubCapture();
      unsubHeartbeat();
      unsubRelease();
    };
  }, [membraneId]);

  const isDeviceLive = useCallback(
    (deviceId: string | null | undefined) => checkDeviceLive(deviceId, onlineDeviceIds),
    [onlineDeviceIds],
  );

  const captureDevice = useCallback(async (nodeId: string, mode: DeviceCaptureMode) => {
    const { capture } = await captureDeviceApi(nodeId, mode);
    // REST-ответ применяем сразу (broadcast придёт следом — идемпотентно).
    setCaptures((prev) => ({ ...prev, [capture.deviceId]: capture }));
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

  const run = useCallback(
    (deviceId: string) => sendCommand(buildCabinetRunScenarioCommand(deviceId)),
    [sendCommand],
  );
  const stop = useCallback(
    (deviceId: string) => sendCommand(buildCabinetStopScenarioCommand(deviceId)),
    [sendCommand],
  );

  return useMemo(
    () => ({
      states,
      connection,
      onlineDeviceIds,
      captures,
      isDeviceLive,
      captureDevice,
      releaseDevice,
      run,
      stop,
    }),
    [
      captureDevice,
      captures,
      connection,
      isDeviceLive,
      onlineDeviceIds,
      releaseDevice,
      run,
      states,
      stop,
    ],
  );
}
