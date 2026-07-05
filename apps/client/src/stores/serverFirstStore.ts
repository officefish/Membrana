import { create } from 'zustand';

import type {
  BoardCaptureStatePayload,
  BoardEditLeasePayload,
  DeviceCaptureReleaseReason,
  RuntimeAuthority,
  RuntimeFollowerMode,
} from '@membrana/core';
import type { DeviceCaptureClientState } from '@membrana/device-board';

interface ServerFirstStoreState {
  /** @deprecated Tariff v3 (edit lease вне тарифа v2). Удаляется в CT7. */
  readonly editLease: BoardEditLeasePayload | null;
  /** @deprecated v1 legacy — заменён осью `capture` (board.capture). Удаляется в CT7. */
  readonly captureState: BoardCaptureStatePayload | null;
  /** v2: явный захват устройства кабинетом (канон §2). null = отпущено. */
  readonly capture: DeviceCaptureClientState | null;
  /** Причина последнего release — для alert/badge (CT5). */
  readonly lastCaptureRelease: DeviceCaptureReleaseReason | null;
  /** v2: сценарий, выбранный кабинетом (runtime.selectScenario). */
  readonly selectedScenarioId: string | null;
  /** CT5: живо ли WS-соединение realtime (для badge «Соединение потеряно»). */
  readonly realtimeConnected: boolean;
  /**
   * PCB5: доска открыта принудительно захватом кабинета (view-only). Флаг
   * снимается на release. Полевые контролы всё равно скрыты через
   * resolveServerFirstFlags(capture); флаг нужен для force-open + индикатора.
   */
  readonly isViewOnlyFromCapture: boolean;
  setEditLease: (lease: BoardEditLeasePayload | null) => void;
  setCaptureState: (capture: BoardCaptureStatePayload | null) => void;
  setCaptureFromRunCommand: (deviceId: string, input: {
    authority?: RuntimeAuthority;
    followerMode?: RuntimeFollowerMode;
    isRunning?: boolean;
    isPaused?: boolean;
  }) => void;
  setFieldCapture: (deviceId: string) => void;
  setCapture: (capture: DeviceCaptureClientState) => void;
  applyCaptureHeartbeat: (sessionId: string, expiresAt: string) => void;
  releaseCapture: (reason: DeviceCaptureReleaseReason) => void;
  setSelectedScenarioId: (scenarioId: string | null) => void;
  setRealtimeConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useServerFirstStore = create<ServerFirstStoreState>((set, get) => ({
  editLease: null,
  captureState: null,
  capture: null,
  lastCaptureRelease: null,
  selectedScenarioId: null,
  realtimeConnected: true,
  isViewOnlyFromCapture: false,
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
  setCapture: (capture) => set({ capture, lastCaptureRelease: null, isViewOnlyFromCapture: true }),
  applyCaptureHeartbeat: (sessionId, expiresAt) => {
    const current = get().capture;
    // Heartbeat чужой/мёртвой сессии не воскрешает захват (канон §3).
    if (current === null || current.sessionId !== sessionId) {
      return;
    }
    set({ capture: { ...current, expiresAt } });
  },
  releaseCapture: (reason) => set({ capture: null, lastCaptureRelease: reason, isViewOnlyFromCapture: false }),
  setSelectedScenarioId: (scenarioId) => set({ selectedScenarioId: scenarioId }),
  setRealtimeConnected: (connected) => set({ realtimeConnected: connected }),
  reset: () =>
    set({
      editLease: null,
      captureState: null,
      capture: null,
      lastCaptureRelease: null,
      selectedScenarioId: null,
      realtimeConnected: true,
      isViewOnlyFromCapture: false,
    }),
}));

export function resetServerFirstStoreForTests(): void {
  useServerFirstStore.getState().reset();
}
