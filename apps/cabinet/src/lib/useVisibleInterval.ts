import { useEffect, useRef } from 'react';

/** Poll callback while document tab is visible (TJ7 cabinet parity). */
export function useVisibleInterval(
  tick: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
): void {
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!enabled || intervalMs <= 0 || typeof document === 'undefined') {
      return undefined;
    }

    let timerId: ReturnType<typeof setInterval> | null = null;

    const runTick = (): void => {
      if (document.visibilityState === 'hidden') return;
      void tickRef.current();
    };

    const stop = (): void => {
      if (timerId != null) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const start = (): void => {
      stop();
      runTick();
      timerId = setInterval(runTick, intervalMs);
    };

    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        stop();
        return;
      }
      start();
    };

    if (document.visibilityState !== 'hidden') {
      start();
    }

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs]);
}
