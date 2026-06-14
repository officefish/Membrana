import { useEffect } from 'react';

import { fetchPairStatus, pingMediaApi } from '@/api/pairing';
import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';

const PAIR_STATUS_INTERVAL_MS = 60_000;

/** Polls cabinet pair status; unlinks client when key is revoked or session ends. */
export function usePairStatusMonitor(): void {
  const mode = useNodeConnectionStore((s) => s.mode);
  const pairing = useNodeConnectionStore((s) => s.pairing);
  const handlePairingInvalid = useNodeConnectionStore((s) => s.handlePairingInvalid);
  const reportConnectionError = useNodeConnectionStore((s) => s.reportConnectionError);

  useEffect(() => {
    if (mode !== 'paired' || !pairing) return;

    let cancelled = false;

    const check = async (): Promise<void> => {
      try {
        const status = await fetchPairStatus(pairing.token);
        if (cancelled) return;

        if (status === 'endpoint_unavailable') {
          return;
        }

        if (status === 'session_expired') {
          handlePairingInvalid('session_expired');
          return;
        }

        if (!status.linked || !status.keyActive) {
          handlePairingInvalid(status.linked && status.inactiveReason === 'expired' ? 'expired' : 'revoked');
          return;
        }

        const mediaOk = await pingMediaApi(pairing.mediaApiUrl, pairing.mediaToken, pairing.deviceId);
        if (cancelled) return;
        if (!mediaOk) {
          reportConnectionError('media-server unreachable');
        }
      } catch {
        if (!cancelled) {
          reportConnectionError('cabinet unreachable');
        }
      }
    };

    void check();
    const timer = window.setInterval(() => void check(), PAIR_STATUS_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mode, pairing, handlePairingInvalid, reportConnectionError]);
}
