import React, { useEffect } from 'react';

import { usePairStatusMonitor } from '@/hooks/usePairStatusMonitor';
import { useTelemetryCloudSync } from '@/hooks/useTelemetryCloudSync';
import { ConnectionFallbackDialog } from './node-connection/ConnectionFallbackDialog';
import { MembraneLinkedPanel } from './node-connection/MembraneLinkedPanel';
import { MembranePairingPanel } from './node-connection/MembranePairingPanel';
import { NodeConnectionModePicker } from './node-connection/NodeConnectionModePicker';
import { PairingInvalidDialog } from './node-connection/PairingInvalidDialog';
import { useNodeConnectionStore } from '../stores/nodeConnectionStore';

/** MP3: startup hydration + global modals for node connection mode. */
export const NodeConnectionShell: React.FC = () => {
  const hydrate = useNodeConnectionStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
