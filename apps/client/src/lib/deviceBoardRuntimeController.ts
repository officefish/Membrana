import {
  createEmptyDeviceScenarioDocument,
  type DeviceScenarioDocument,
  type RuntimeMode,
} from '@membrana/core';
import {
  ScenarioRuntime,
  createIdleScenarioRuntimeState,
  type ScenarioRuntimeState,
} from '@membrana/device-board';

import { createScenarioRuntimeHost } from '@/modules/device-board/createScenarioRuntimeHost';
import { createClientDeviceBoardPersistAdapterFromSession } from '@/modules/device-board/deviceScenarioPersistence';
import {
  loadPersistedRuntimeMode,
  savePersistedRuntimeMode,
} from '@/lib/runtimeModePersistence';

type StateListener = (state: ScenarioRuntimeState) => void;

/**
 * MP7b RT2: headless-контроллер scenario runtime поверх реального audio-host.
 *
 * Живёт на уровне приложения (не привязан к board mode редактора): кабинет может
 * запускать/останавливать мониторинг по WS даже когда доска закрыта. Сценарий
 * грузится из persist-адаптера (тот же источник, что и редактор), с дефолтным
 * фоллбэком, если persist пуст.
 */
class DeviceBoardRuntimeController {
  private runtime: ScenarioRuntime | null = null;

  private unsubscribeRuntime: (() => void) | null = null;

  // RT7: режим восстанавливается из localStorage при инициализации узла.
  private mode: RuntimeMode = loadPersistedRuntimeMode();

  private state: ScenarioRuntimeState = createIdleScenarioRuntimeState();

  private readonly listeners = new Set<StateListener>();

  getState(): ScenarioRuntimeState {
    return this.state;
  }

  getMode(): RuntimeMode {
    return this.mode;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(): Promise<void> {
    const runtime = this.ensureRuntime();
    if (runtime.getState().isRunning) {
      return;
    }
    const document = await this.loadDocument();
    runtime.load(document);
    // Не ждём завершения run-промиса: main loop крутится до stop.
    void runtime.start();
  }

  stop(): void {
    this.runtime?.stop('user');
  }

  /**
   * RT3: ручной режим normal/alarm. Делегируется в ScenarioRuntime (источник истины
   * поведения); если runtime ещё не создан — режим запоминается и применяется при start.
   */
  setMode(mode: RuntimeMode): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    savePersistedRuntimeMode(mode); // RT7: переживает перезапуск узла
    if (this.runtime !== null) {
      this.runtime.setMode(mode);
    } else {
      this.notify(this.state);
    }
  }

  /** Сброс синглтона между тестами. */
  reset(): void {
    this.runtime?.stop('system');
    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;
    this.runtime = null;
    this.mode = 'normal';
    this.state = createIdleScenarioRuntimeState();
    this.listeners.clear();
  }

  private ensureRuntime(): ScenarioRuntime {
    if (this.runtime !== null) {
      return this.runtime;
    }
    const runtime = new ScenarioRuntime(createScenarioRuntimeHost());
    this.unsubscribeRuntime = runtime.subscribe((state) => {
      this.state = state;
      this.notify(state);
    });
    if (this.mode !== 'normal') {
      runtime.setMode(this.mode);
    }
    this.runtime = runtime;
    return runtime;
  }

  private notify(state: ScenarioRuntimeState): void {
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private async loadDocument(): Promise<DeviceScenarioDocument> {
    const adapter = createClientDeviceBoardPersistAdapterFromSession();
    const record = await adapter.load();
    return record?.document ?? createEmptyDeviceScenarioDocument('microphone');
  }
}

const controller = new DeviceBoardRuntimeController();

export function getDeviceBoardRuntimeController(): DeviceBoardRuntimeController {
  return controller;
}

export function resetDeviceBoardRuntimeControllerForTests(): void {
  controller.reset();
}

export type { DeviceBoardRuntimeController };
