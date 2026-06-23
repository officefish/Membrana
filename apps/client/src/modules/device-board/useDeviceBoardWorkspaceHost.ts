import { useMemo } from 'react';
import type { DeviceBoardWorkspaceHost } from '@membrana/device-board';

import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';
import { createDeviceBoardWorkspaceHost } from './createDeviceBoardWorkspaceHost.js';
import { resolveDeviceBoardPersistDeviceId } from './resolveDeviceBoardPersistDeviceId.js';

/** Host user workspace для DeviceBoardShell (U10 W2). */
export function useDeviceBoardWorkspaceHost(): DeviceBoardWorkspaceHost {
  const mode = useNodeConnectionStore((state) => state.mode);
  const pairing = useNodeConnectionStore((state) => state.pairing);

  return useMemo(() => {
    const deviceId = resolveDeviceBoardPersistDeviceId(mode === 'paired' ? pairing : null);
    return createDeviceBoardWorkspaceHost(deviceId);
  }, [mode, pairing]);
}
