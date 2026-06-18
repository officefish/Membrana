import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  type NodeRealtimeEnvelope,
  type RuntimeCommandPayload,
  type RuntimeMode,
  type RuntimeStatePayload,
} from '@membrana/core';
import type { ScenarioRuntimeState } from '@membrana/device-board';

import { getDeviceBoardRuntimeController } from '@/lib/deviceBoardRuntimeController';
import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';

/** Минимальный контракт контроллера, нужный мосту (упрощает unit-тесты). */
export interface RuntimeBridgeController {
  start: () => void | Promise<void>;
  stop: () => void;
  setMode: (mode: RuntimeMode) => void;
}

/** Проекция снимка ScenarioRuntime в wire-payload runtime.state. */
export function runtimeStateToPayload(
  state: ScenarioRuntimeState,
  mode: RuntimeMode,
): RuntimeStatePayload {
  return {
    phase: state.phase,
    isRunning: state.isRunning,
    mode,
    activeBranch: state.activeBranch,
    activeNodeId: state.activeNodeId,
    mainLoopIteration: state.mainLoopIteration,
    alarmLoopIteration: state.alarmLoopIteration,
    lastError: state.lastError,
  };
}

/** Применяет команду runtime.command к контроллеру. Возвращает true, если команда распознана. */
export function applyRuntimeCommand(
  controller: RuntimeBridgeController,
  payload: RuntimeCommandPayload,
): boolean {
  switch (payload.action) {
    case 'run':
      void controller.start();
      return true;
    case 'stop':
      controller.stop();
      return true;
    case 'setMode':
      controller.setMode(payload.mode);
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

/**
 * MP7b RT2: связывает Node Realtime client с headless scenario runtime.
 *  - runtime.command (кабинет → узел) → start/stop/setMode контроллера;
 *  - изменения состояния runtime → runtime.state (узел → кабинет).
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
    applyRuntimeCommand(controller, envelope.payload as RuntimeCommandPayload);
  });

  stateUnsub = controller.subscribe((state) => {
    client.send(
      createNodeRealtimeEnvelope(
        'runtime',
        NODE_REALTIME_EVENT_TYPES.runtime.state,
        runtimeStateToPayload(state, controller.getMode()),
      ),
    );
  });
}

export function stopRuntimeRealtimeBridge(): void {
  messageUnsub?.();
  messageUnsub = null;
  stateUnsub?.();
  stateUnsub = null;
}
