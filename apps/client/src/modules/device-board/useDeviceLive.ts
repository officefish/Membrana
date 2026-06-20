import { useEffect, useState } from 'react';

import { getNodeRealtimeClient, type NodeRealtimeClientState } from '@/lib/nodeRealtimeClient';
import { isDeviceLive as checkDeviceLive } from '@/lib/isDeviceLive';
import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';

/**
 * Online-presence локального узла для gating Пуска на device-board (DBR6).
 * Автономный режим — всегда live; paired — WS `connected`.
 */
export function useDeviceLive(): boolean {
  const mode = useNodeConnectionStore((s) => s.mode);
  const pairing = useNodeConnectionStore((s) => s.pairing);
  const [wsState, setWsState] = useState<NodeRealtimeClientState>('disconnected');

  useEffect(() => {
    if (mode !== 'paired') {
      setWsState('disconnected');
      return;
    }
    const client = getNodeRealtimeClient();
    setWsState(client.getState());
    return client.subscribeState(setWsState);
  }, [mode, pairing?.deviceId]);

  return checkDeviceLive(pairing?.deviceId ?? null, mode, wsState);
}
