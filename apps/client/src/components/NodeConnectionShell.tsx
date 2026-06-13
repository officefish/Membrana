import React, { useEffect } from 'react';

import { ConnectionFallbackDialog } from './node-connection/ConnectionFallbackDialog';
import { MembranePairingPanel } from './node-connection/MembranePairingPanel';
import { NodeConnectionModePicker } from './node-connection/NodeConnectionModePicker';
import { useNodeConnectionStore } from '../stores/nodeConnectionStore';

/** MP3: startup hydration + global modals for node connection mode. */
export const NodeConnectionShell: React.FC = () => {
  const hydrate = useNodeConnectionStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      <NodeConnectionModePicker />
      <MembranePairingPanel />
      <ConnectionFallbackDialog />
    </>
  );
};
