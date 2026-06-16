import { useCallback, useEffect, useRef, useState } from 'react';

import { runRemoteMutation } from './remoteMutation';

export interface RemoteMutationRunOptions {
  readonly onSuccess?: () => void;
  readonly timeoutMs?: number;
}

export interface UseRemoteMutationResult {
  readonly busy: boolean;
  readonly run: (
    label: string,
    op: () => Promise<void>,
    options?: RemoteMutationRunOptions,
  ) => Promise<boolean>;
}

/**
 * Serializes remote mutations: disables UI while in flight, enforces timeout, resets on unmount.
 */
export function useRemoteMutation(): UseRemoteMutationResult {
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      setBusy(false);
    };
  }, []);

  const run = useCallback(
    async (
      label: string,
      op: () => Promise<void>,
      options?: RemoteMutationRunOptions,
    ): Promise<boolean> => {
      if (busy) return false;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      try {
        await runRemoteMutation(
          label,
          async (signal) => {
            if (signal.aborted) {
              throw new DOMException('aborted', 'AbortError');
            }
            await op();
          },
          { signal: controller.signal, timeoutMs: options?.timeoutMs },
        );
        options?.onSuccess?.();
        return true;
      } catch (err) {
        if (controller.signal.aborted && err instanceof DOMException) {
          return false;
        }
        throw err;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setBusy(false);
        }
      }
    },
    [busy],
  );

  return { busy, run };
}
