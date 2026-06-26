import { create } from 'zustand';

import type {
  BoardCaptureStatePayload,
  BoardEditLeasePayload,
  RuntimeAuthority,
  RuntimeFollowerMode,
} from '@membrana/core';

interface ServerFirstStoreState {
  readonly editLease: BoardEditLeasePayload | null;
  readonly captureState: BoardCaptureStatePayload | null;
  setEditLease: (lease: BoardEditLeasePayload | null) => void;
  setCaptureState: (capture: BoardCaptureStatePayload | null) => void;
  setCaptureFromRunCommand: (deviceId: string, input: {
    authority?: RuntimeAuthority;
    followerMode?: RuntimeFollowerMode;
    isRunning?: boolean;
    isPaused?: boolean;
  }) => void;
  setFieldCapture: (deviceId: string) => void;
  reset: () => void;
}

export const useServerFirstStore = create<ServerFirstStoreState>((set, get) => ({
  editLease: null,
  captureState: null,
  setEditLease: (lease) => set({ editLease: lease }),
  setCaptureState: (capture) => set({ captureState: capture }),
  setCaptureFromRunCommand: (deviceId, input) => {
    const prev = get().captureState;
    set({
      captureState: {
        deviceId,
        authority: input.authority ?? prev?.authority ?? 'field',
        followerMode:
          (input.authority ?? prev?.authority) === 'cabinet'
            ? input.followerMode ?? prev?.followerMode ?? 'soft'
            : null,
        isRunning: input.isRunning ?? prev?.isRunning ?? true,
        isPaused: input.isPaused ?? prev?.isPaused ?? false,
      },
    });
  },
  setFieldCapture: (deviceId) =>
    set({
      captureState: {
        deviceId,
        authority: 'field',
        followerMode: null,
        isRunning: true,
        isPaused: false,
      },
    }),
  reset: () => set({ editLease: null, captureState: null }),
}));

export function resetServerFirstStoreForTests(): void {
  useServerFirstStore.getState().reset();
}
