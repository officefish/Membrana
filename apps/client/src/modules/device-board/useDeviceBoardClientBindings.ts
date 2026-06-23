import { useMemo } from 'react';

import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';
import { createClientDeviceBoardPersistAdapter } from './deviceScenarioPersistence.js';
import { createDeviceBoardWorkspaceHost } from './createDeviceBoardWorkspaceHost.js';
import { createHybridDeviceBoardWorkspaceHost } from './createHybridDeviceBoardWorkspaceHost.js';
import { resolveDeviceBoardPersistDeviceId } from './resolveDeviceBoardPersistDeviceId.js';
import { resolveMaxUserWorkspaces } from './resolveMaxUserWorkspaces.js';

/** Shared deviceId bindings для workspace host + persist adapter (U10 W3). */
export function useDeviceBoardClientBindings() {
  const mode = useNodeConnectionStore((state) => state.mode);
  const pairing = useNodeConnectionStore((state) => state.pairing);

  return useMemo(() => {
    const deviceId = resolveDeviceBoardPersistDeviceId(mode === 'paired' ? pairing : null);
    const maxUserWorkspaces = resolveMaxUserWorkspaces(mode, pairing);
    const workspaceHost =
      mode === 'paired' && pairing !== null
        ? createHybridDeviceBoardWorkspaceHost(deviceId, pairing, maxUserWorkspaces)
        : createDeviceBoardWorkspaceHost(deviceId, maxUserWorkspaces);
    return {
      deviceId,
      maxUserWorkspaces,
      workspaceHost,
      persistAdapter: createClientDeviceBoardPersistAdapter(deviceId, maxUserWorkspaces),
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
