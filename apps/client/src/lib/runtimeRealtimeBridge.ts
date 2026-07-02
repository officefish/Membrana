import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  parseRuntimeCommandPayload,
  type NodeRealtimeEnvelope,
  type RuntimeCommandPayload,
  type RuntimeMode,
  type RuntimeStatePayload,
} from '@membrana/core';
import { resolveServerFirstFlags, type ScenarioRuntimeState } from '@membrana/device-board';

import { getDeviceBoardRuntimeController } from '@/lib/deviceBoardRuntimeController';
import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';
import { useServerFirstStore } from '@/stores/serverFirstStore';

/** Минимальный контракт контроллера, нужный мосту (упрощает unit-тесты). */
export interface RuntimeBridgeController {
  start: (options?: { fromRemote?: boolean }) => void | Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setMode: (mode: RuntimeMode) => void;
}

function getCaptureWireFields(deviceId: string | null): Pick<
  RuntimeStatePayload,
  'authority' | 'followerMode'
> {
  const store = useServerFirstStore.getState();
  const flags = resolveServerFirstFlags({
    deviceId,
    editLease: store.editLease,
    captureState: store.captureState,
  });
  if (flags.authority === null) {
    return {};
  }
  return {
    authority: flags.authority,
    followerMode: flags.followerMode,
  };
}

/** Проекция снимка ScenarioRuntime в wire-payload runtime.state. */
export function runtimeStateToPayload(
  state: ScenarioRuntimeState,
  mode: RuntimeMode,
  deviceId?: string | null,
): RuntimeStatePayload {
  const capture = getCaptureWireFields(deviceId ?? null);
  return {
    ...(deviceId ? { deviceId } : {}),
    phase: state.phase,
    isRunning: state.isRunning,
    isPaused: state.isPaused,
    mode,
    activeBranch: state.activeBranch,
    activeNodeId: state.activeNodeId,
    mainLoopIteration: state.mainLoopIteration,
    alarmLoopIteration: state.alarmLoopIteration,
    lastError: state.lastError,
    ...capture,
  };
}

function syncCaptureAfterCommand(
  deviceId: string | null,
  payload: RuntimeCommandPayload,
): void {
  if (deviceId === null) {
    return;
  }
  const store = useServerFirstStore.getState();
  switch (payload.action) {
    case 'run':
      store.setCaptureFromRunCommand(deviceId, {
        authority: payload.authority,
        followerMode: payload.followerMode,
        isRunning: true,
        isPaused: false,
      });
      break;
    case 'stop':
      store.setCaptureState({
        deviceId,
        authority: store.captureState?.authority ?? 'field',
        followerMode: store.captureState?.followerMode ?? null,
        isRunning: false,
        isPaused: false,
      });
      break;
    case 'pause':
      if (store.captureState?.deviceId === deviceId) {
        store.setCaptureState({
          ...store.captureState,
          isPaused: true,
        });
      }
      break;
    case 'resume':
      if (store.captureState?.deviceId === deviceId) {
        store.setCaptureState({
          ...store.captureState,
          isPaused: false,
          isRunning: true,
        });
      }
      break;
    default:
      break;
  }
}

/** Применяет команду runtime.command к контроллеру. Возвращает true, если команда распознана. */
export function applyRuntimeCommand(
  controller: RuntimeBridgeController,
  payload: RuntimeCommandPayload,
  deviceId: string | null = null,
): boolean {
  const parsed = parseRuntimeCommandPayload(payload);
  if (parsed === null) {
    return false;
  }

  syncCaptureAfterCommand(deviceId, parsed);

  switch (parsed.action) {
    case 'run':
      // CT4: выбранный кабинетом сценарий фиксируем в store; фактическая
      // загрузка по scenarioId — CT3 (selector) + CT6 (runtime).
      if (parsed.scenarioId !== undefined) {
        useServerFirstStore.getState().setSelectedScenarioId(parsed.scenarioId);
      }
      void controller.start({ fromRemote: true });
      return true;
    case 'selectScenario':
      useServerFirstStore.getState().setSelectedScenarioId(parsed.scenarioId);
      return true;
    case 'stop':
      // fadeOutMs прокидывается в audio-engine в CT6; здесь стоп немедленный.
      controller.stop();
      return true;
    case 'pause':
      controller.pause();
      return true;
    case 'resume':
      controller.resume();
      return true;
    case 'setMode':
      controller.setMode(parsed.mode);
      return true;
    default:
      return false;
  }
}

/** true, если envelope — команда кабинета по каналу runtime. */
export function isRuntimeCommandEnvelope(envelope: NodeRealtimeEnvelope): boolean {
  return (
    envelope.channel === 'runtime' &&
    envelope.type === NODE_REALTIME_EVENT_TYPES.runtime.command
  );
}

let messageUnsub: (() => void) | null = null;
let stateUnsub: (() => void) | null = null;
let connectionUnsub: (() => void) | null = null;

interface RuntimeStateSink {
  send: (envelope: NodeRealtimeEnvelope) => void;
  getDeviceId: () => string | null;
}

interface RuntimeStateSource {
  getState: () => ScenarioRuntimeState;
  getMode: () => RuntimeMode;
}

/** Отправляет текущий снимок состояния контроллера в runtime.state (общий путь для подписки и reconnect). */
function emitRuntimeState(
  client: RuntimeStateSink,
  source: RuntimeStateSource,
  state: ScenarioRuntimeState,
): void {
  client.send(
    createNodeRealtimeEnvelope(
      'runtime',
      NODE_REALTIME_EVENT_TYPES.runtime.state,
      runtimeStateToPayload(state, source.getMode(), client.getDeviceId()),
    ),
  );
}

/**
 * MP7b RT2/RT7 + SF4: связывает Node Realtime client с headless scenario runtime.
 */
export function startRuntimeRealtimeBridge(): void {
  if (messageUnsub !== null) {
    return;
  }
  const client = getNodeRealtimeClient();
  const controller = getDeviceBoardRuntimeController();

  messageUnsub = client.subscribeMessages((envelope) => {
    if (!isRuntimeCommandEnvelope(envelope)) {
      return;
    }
    const payload = envelope.payload as RuntimeCommandPayload;
    applyRuntimeCommand(controller, payload, client.getDeviceId());
  });

  stateUnsub = controller.subscribe((state) => {
    emitRuntimeState(client, controller, state);
  });

  connectionUnsub = client.subscribeState((connectionState) => {
    if (connectionState === 'connected') {
      emitRuntimeState(client, controller, controller.getState());
    }
  });
}

export function stopRuntimeRealtimeBridge(): void {
  messageUnsub?.();
  messageUnsub = null;
  stateUnsub?.();
  stateUnsub = null;
  connectionUnsub?.();
  connectionUnsub = null;
}
