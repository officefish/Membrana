import { useCallback, useEffect, useState } from 'react';
import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  type RuntimeCommandPayload,
  type RuntimeMode,
  type RuntimeStatePayload,
} from '@membrana/core';

import {
  getCabinetNodeRealtimeClient,
  type CabinetRealtimeClientState,
} from '@/lib/cabinetNodeRealtimeClient';

export interface CabinetNodeRuntime {
  /** Последнее состояние runtime по deviceId узла. */
  readonly states: Record<string, RuntimeStatePayload>;
  readonly connection: CabinetRealtimeClientState;
  readonly run: (deviceId: string) => void;
  readonly stop: (deviceId: string) => void;
  readonly setMode: (deviceId: string, mode: RuntimeMode) => void;
}

/**
 * MP7b RT5: подключение кабинета к runtime-каналу и управление узлами.
 * Команды адресуются конкретному узлу через payload.deviceId; состояние
 * сопоставляется по deviceId из runtime.state.
 */
export function useCabinetNodeRuntime(membraneId: string | null): CabinetNodeRuntime {
  const [states, setStates] = useState<Record<string, RuntimeStatePayload>>({});
  const [connection, setConnection] = useState<CabinetRealtimeClientState>('disconnected');

  useEffect(() => {
    if (!membraneId) return undefined;
    const client = getCabinetNodeRealtimeClient();
    client.connect(membraneId);
    setConnection(client.getState());
    const unsubState = client.subscribeState(setConnection);
    const unsubRuntime = client.subscribeRuntimeState((payload) => {
      if (!payload.deviceId) return;
      const deviceId = payload.deviceId;
      setStates((prev) => ({ ...prev, [deviceId]: payload }));
    });
    return () => {
      unsubState();
      unsubRuntime();
    };
  }, [membraneId]);

  const sendCommand = useCallback((payload: RuntimeCommandPayload) => {
    getCabinetNodeRealtimeClient().send(
      createNodeRealtimeEnvelope('runtime', NODE_REALTIME_EVENT_TYPES.runtime.command, payload),
    );
  }, []);

  const run = useCallback(
    (deviceId: string) => sendCommand({ action: 'run', deviceId }),
    [sendCommand],
  );
  const stop = useCallback(
    (deviceId: string) => sendCommand({ action: 'stop', deviceId }),
    [sendCommand],
  );
  const setMode = useCallback(
    (deviceId: string, mode: RuntimeMode) => sendCommand({ action: 'setMode', mode, deviceId }),
    [sendCommand],
  );

  return { states, connection, run, stop, setMode };
}
