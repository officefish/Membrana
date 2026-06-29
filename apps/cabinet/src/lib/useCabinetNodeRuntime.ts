import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  type RuntimeCommandPayload,
  type RuntimeMode,
  type RuntimeStatePayload,
} from '@membrana/core';

import {
  buildCabinetPauseCommand,
  buildCabinetResumeCommand,
  buildCabinetRunCommand,
  buildCabinetSetModeCommand,
  buildCabinetStopCommand,
  type CabinetRunFollowerMode,
} from '@/lib/cabinetNodeRuntimeCommands';
import {
  getCabinetNodeRealtimeClient,
  type CabinetRealtimeClientState,
} from '@/lib/cabinetNodeRealtimeClient';
import { isDeviceLive as checkDeviceLive } from '@/lib/isDeviceLive';

export interface CabinetRunOptions {
  readonly followerMode?: CabinetRunFollowerMode;
}

export interface CabinetNodeRuntime {
  /** Последнее состояние runtime по deviceId узла. */
  readonly states: Record<string, RuntimeStatePayload>;
  readonly connection: CabinetRealtimeClientState;
  /** deviceId узлов с активной online-presence (node.online). */
  readonly onlineDeviceIds: ReadonlySet<string>;
  /** Единый селектор «связь жива» для gating Пуска (DBR6). */
  readonly isDeviceLive: (deviceId: string | null | undefined) => boolean;
  readonly run: (deviceId: string, options?: CabinetRunOptions) => void;
  readonly stop: (deviceId: string) => void;
  readonly pause: (deviceId: string) => void;
  readonly resume: (deviceId: string) => void;
  readonly setMode: (deviceId: string, mode: RuntimeMode) => void;
}

/**
 * MP7b RT5 + SF6: подключение кабинета к runtime-каналу и управление узлами.
 */
export function useCabinetNodeRuntime(membraneId: string | null): CabinetNodeRuntime {
  const [states, setStates] = useState<Record<string, RuntimeStatePayload>>({});
  const [connection, setConnection] = useState<CabinetRealtimeClientState>('disconnected');
  const [onlineDeviceIds, setOnlineDeviceIds] = useState<ReadonlySet<string>>(() => new Set());

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
    return () => {
      unsubState();
      unsubRuntime();
      unsubOnline();
      unsubOffline();
    };
  }, [membraneId]);

  const isDeviceLive = useCallback(
    (deviceId: string | null | undefined) => checkDeviceLive(deviceId, onlineDeviceIds),
    [onlineDeviceIds],
  );

  const sendCommand = useCallback((payload: RuntimeCommandPayload) => {
    getCabinetNodeRealtimeClient().send(
      createNodeRealtimeEnvelope('runtime', NODE_REALTIME_EVENT_TYPES.runtime.command, payload),
    );
  }, []);

  const run = useCallback(
    (deviceId: string, options?: CabinetRunOptions) =>
      sendCommand(buildCabinetRunCommand(deviceId, options?.followerMode)),
    [sendCommand],
  );
  const stop = useCallback(
    (deviceId: string) => sendCommand(buildCabinetStopCommand(deviceId)),
    [sendCommand],
  );
  const pause = useCallback(
    (deviceId: string) => sendCommand(buildCabinetPauseCommand(deviceId)),
    [sendCommand],
  );
  const resume = useCallback(
    (deviceId: string) => sendCommand(buildCabinetResumeCommand(deviceId)),
    [sendCommand],
  );
  const setMode = useCallback(
    (deviceId: string, mode: RuntimeMode) =>
      sendCommand(buildCabinetSetModeCommand(deviceId, mode)),
    [sendCommand],
  );

  return useMemo(
    () => ({ states, connection, onlineDeviceIds, isDeviceLive, run, stop, pause, resume, setMode }),
    [connection, isDeviceLive, onlineDeviceIds, pause, resume, run, setMode, states, stop],
  );
}
