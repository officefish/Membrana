import { useMemo } from 'react';

import { resolveServerFirstFlags, type ServerFirstFlagsInput } from '@membrana/device-board';

import { useServerFirstStore } from '@/stores/serverFirstStore';

/** Проекция zustand store → ServerFirstFlagsInput для DeviceBoardShell. */
export function useServerFirstBoardState(deviceId: string | null): ServerFirstFlagsInput {
  const editLease = useServerFirstStore((s) => s.editLease);
  const captureState = useServerFirstStore((s) => s.captureState);
  const capture = useServerFirstStore((s) => s.capture);
  const lastCaptureRelease = useServerFirstStore((s) => s.lastCaptureRelease);
  const realtimeConnected = useServerFirstStore((s) => s.realtimeConnected);

  return useMemo(
    () => ({
      deviceId,
      editLease,
      captureState,
      capture,
      captureConnectionLost: capture !== null && !realtimeConnected,
      lastCaptureRelease,
    }),
    [capture, captureState, deviceId, editLease, lastCaptureRelease, realtimeConnected],
  );
}

export function useServerFirstFieldUi(deviceId: string | null): {
  readonly serverFirstState: ServerFirstFlagsInput;
  readonly showRunControls: boolean;
} {
  const serverFirstState = useServerFirstBoardState(deviceId);
  const showRunControls = useMemo(() => {
    const flags = resolveServerFirstFlags(serverFirstState);
    return !flags.hideFieldRuntimeControls;
  }, [serverFirstState]);

  return { serverFirstState, showRunControls };
}
