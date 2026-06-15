import React, { useEffect, useRef } from 'react';

import { usePairStatusMonitor } from '@/hooks/usePairStatusMonitor';
import { useTelemetryCloudSync } from '@/hooks/useTelemetryCloudSync';
import { reconfigureMediaLibraryFromConnection, schedulePairedMediaLibraryUpgrade, stopPairedMediaLibraryUpgrade } from '@/lib/mediaLibraryHubBridge';
import { reconfigureJournalFromConnection, schedulePairedJournalUpgrade, stopPairedJournalUpgrade } from '@/lib/journalHubBridge';
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
    void reconfigureJournalFromConnection(mode, pairing);
  }, [hydrated, mode, pairing]);

  useEffect(() => {
    if (!hydrated) return;
    if (mode === 'paired' && pairing) {
      schedulePairedMediaLibraryUpgrade(mode, pairing);
      schedulePairedJournalUpgrade(mode, pairing);
      return () => {
        stopPairedMediaLibraryUpgrade();
        stopPairedJournalUpgrade();
      };
    }
    stopPairedMediaLibraryUpgrade();
    stopPairedJournalUpgrade();
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
