import { useEffect, useRef } from 'react';

import {
  acquireScenarioEditLease,
  releaseScenarioEditLease,
  renewScenarioEditLease,
  SCENARIO_EDIT_LEASE_RENEW_MS,
} from '@/api/scenarioEditLease';

/**
 * Server-first SF3: acquire edit lease on mount, renew heartbeat, release on unmount.
 * Idempotent при смене nodeId — release предыдущего узла перед acquire нового.
 */
export function useCabinetEditLease(nodeId: string | null, revision = 0): void {
  const revisionRef = useRef(revision);
  revisionRef.current = revision;

  useEffect(() => {
    if (nodeId === null) return undefined;

    let cancelled = false;
    let renewTimer: ReturnType<typeof setInterval> | null = null;
    let activeNodeId: string | null = null;

    const startRenew = (id: string) => {
      if (renewTimer) clearInterval(renewTimer);
      renewTimer = setInterval(() => {
        void renewScenarioEditLease(id, revisionRef.current).catch(() => {
          /* non-blocking heartbeat */
        });
      }, SCENARIO_EDIT_LEASE_RENEW_MS);
    };

    const acquire = async (id: string) => {
      await acquireScenarioEditLease(id, revisionRef.current);
      if (cancelled) {
        void releaseScenarioEditLease(id).catch(() => undefined);
        return;
      }
      activeNodeId = id;
      startRenew(id);
    };

    void acquire(nodeId);

    return () => {
      cancelled = true;
      if (renewTimer) clearInterval(renewTimer);
      const releaseId = activeNodeId ?? nodeId;
      void releaseScenarioEditLease(releaseId).catch(() => undefined);
      activeNodeId = null;
    };
  }, [nodeId]);
}
