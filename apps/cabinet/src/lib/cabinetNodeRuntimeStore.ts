import { fetchCaptures as fetchCapturesApi } from '@/api/deviceCapture';
import type { DeviceCaptureView } from '@/api/deviceCapture';
import { getCabinetNodeRealtimeClient } from '@/lib/cabinetNodeRealtimeClient';
import {
  INITIAL_CABINET_RUNTIME_SNAPSHOT,
  applyBoardCapture,
  applyCaptureHeartbeat,
  applyCaptureRelease,
  applyCapturesBootstrap,
  applyCaptureView,
  applyConnection,
  applyPresenceOffline,
  applyPresenceOnline,
  applyPresenceSnapshot,
  applyRuntimeState,
  applyScenarioList,
  type CabinetRuntimeSnapshot,
} from '@/lib/cabinetRuntimeState';

/**
 * CX6: модульный стор runtime-состояния кабинета (по образцу синглтона
 * cabinetNodeRealtimeClient). Подписки на realtime-клиент монтируются ОДИН раз
 * на сессию кабинета — presence.snapshot, полученный при открытии WS, переживает
 * навигацию по разделам (сервер шлёт его только на connect; per-mount React-стейт
 * после размонтирования стартовал пустым → «сопряжён · offline» до hard-reload).
 * React читает через useSyncExternalStore (getCabinetRuntimeSnapshot стабилен
 * по ссылке между изменениями). Reset — на logout, вместе с disconnect (CX2).
 */
let snapshot: CabinetRuntimeSnapshot = INITIAL_CABINET_RUNTIME_SNAPSHOT;
let started = false;
let unsubs: (() => void)[] = [];
const listeners = new Set<() => void>();

function commit(next: CabinetRuntimeSnapshot): void {
  if (next === snapshot) return;
  snapshot = next;
  for (const listener of listeners) listener();
}

/** CX2: авторитетный REST-снапшот захватов (+CX3 сценарии) — старт и реконнект. */
function refreshCaptures(): void {
  void fetchCapturesApi()
    .then(({ captures: list }) => {
      commit(applyCapturesBootstrap(snapshot, list));
    })
    .catch(() => {
      /* best-effort: до следующего reconnect/broadcast живём на текущем стейте */
    });
}

/** Идемпотентный старт: первый вызов монтирует подписки, дальше no-op. */
export function startCabinetRuntimeStore(): void {
  if (started) return;
  started = true;
  const client = getCabinetNodeRealtimeClient();
  commit(applyConnection(snapshot, client.getState()));
  unsubs = [
    client.subscribeState((next) => {
      commit(applyConnection(snapshot, next));
      // Реконнект мог пропустить board-broadcast'ы — пересинхронизируемся.
      if (next === 'connected') refreshCaptures();
    }),
    client.subscribePresenceSnapshot((payload) => {
      commit(applyPresenceSnapshot(snapshot, payload));
    }),
    client.subscribePresenceOnline((payload) => {
      commit(applyPresenceOnline(snapshot, payload.deviceId));
    }),
    client.subscribePresenceOffline((payload) => {
      commit(applyPresenceOffline(snapshot, payload.deviceId));
    }),
    client.subscribeRuntimeState((payload) => {
      commit(applyRuntimeState(snapshot, payload));
    }),
    client.subscribeBoardCapture((payload) => {
      commit(applyBoardCapture(snapshot, payload));
    }),
    client.subscribeBoardCaptureHeartbeat((payload) => {
      commit(applyCaptureHeartbeat(snapshot, payload));
    }),
    client.subscribeBoardCaptureRelease((payload) => {
      commit(applyCaptureRelease(snapshot, payload));
    }),
    client.subscribeBoardScenarioList((payload) => {
      commit(applyScenarioList(snapshot, payload));
    }),
  ];
  refreshCaptures();
}

export function subscribeCabinetRuntime(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCabinetRuntimeSnapshot(): CabinetRuntimeSnapshot {
  return snapshot;
}

/** REST-ответ capture применяем сразу (broadcast придёт следом — идемпотентно). */
export function applyCaptureFromRest(capture: DeviceCaptureView): void {
  commit(applyCaptureView(snapshot, capture));
}

/** CX6: сброс на logout — состояние не должно пережить сессию кабинета. */
export function resetCabinetRuntimeStore(): void {
  for (const unsub of unsubs) unsub();
  unsubs = [];
  started = false;
  commit(INITIAL_CABINET_RUNTIME_SNAPSHOT);
}
