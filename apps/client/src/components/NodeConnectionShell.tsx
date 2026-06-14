import React, { useEffect, useRef } from 'react';

import { usePairStatusMonitor } from '@/hooks/usePairStatusMonitor';
import { useTelemetryCloudSync } from '@/hooks/useTelemetryCloudSync';
import { reconfigureMediaLibraryFromConnection } from '@/lib/mediaLibraryHubBridge';
import { ConnectionFallbackDialog } from './node-connection/ConnectionFallbackDialog';
import { MembraneLinkedPanel } from './node-connection/MembraneLinkedPanel';
import { MembranePairingPanel } from './node-connection/MembranePairingPanel';
import { NodeConnectionModePicker } from './node-connection/NodeConnectionModePicker';
import { PairingInvalidDialog } from './node-connection/PairingInvalidDialog';
import { useNodeConnectionStore } from '../stores/nodeConnectionStore';

/** MP3: startup hydration + global modals for node connection mode. */
export const NodeConnectionShell: React.FC = () => {
  const hydrate = useNodeConnectionStore((s) => s.hydrate);
  const hydrated = useNodeConnectionStore((s) => s.hydrated);
  const mode = useNodeConnectionStore((s) => s.mode);
  const pairing = useNodeConnectionStore((s) => s.pairing);
  const lastConnectionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const key =
      mode === 'paired' && pairing
        ? `paired:${pairing.deviceId}:${pairing.mediaToken}`
        : mode ?? 'unset';
    if (lastConnectionKeyRef.current === key) return;
    lastConnectionKeyRef.current = key;
    void reconfigureMediaLibraryFromConnection(mode, pairing);
  }, [hydrated, mode, pairing]);

  usePairStatusMonitor();
  useTelemetryCloudSync();

  return (
    <>
      <NodeConnectionModePicker />
      <MembranePairingPanel />
      <MembraneLinkedPanel />
      <PairingInvalidDialog />
      <ConnectionFallbackDialog />
    </>
  );
};
