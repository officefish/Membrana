import { useMemo } from 'react';

import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';
import { createClientDeviceBoardPersistAdapter } from './deviceScenarioPersistence.js';
import { createDeviceBoardWorkspaceHost } from './createDeviceBoardWorkspaceHost.js';
import { resolveDeviceBoardPersistDeviceId } from './resolveDeviceBoardPersistDeviceId.js';

/** Shared deviceId bindings для workspace host + persist adapter (U10 W3). */
export function useDeviceBoardClientBindings() {
  const mode = useNodeConnectionStore((state) => state.mode);
  const pairing = useNodeConnectionStore((state) => state.pairing);

  return useMemo(() => {
    const deviceId = resolveDeviceBoardPersistDeviceId(mode === 'paired' ? pairing : null);
    return {
      deviceId,
      workspaceHost: createDeviceBoardWorkspaceHost(deviceId),
      persistAdapter: createClientDeviceBoardPersistAdapter(deviceId),
    };
  }, [mode, pairing]);
}

/** @deprecated Use useDeviceBoardClientBindings */
export function useDeviceBoardPersistAdapter() {
  return useDeviceBoardClientBindings().persistAdapter;
}

/** @deprecated Use useDeviceBoardClientBindings */
export function useDeviceBoardWorkspaceHost() {
  return useDeviceBoardClientBindings().workspaceHost;
}
