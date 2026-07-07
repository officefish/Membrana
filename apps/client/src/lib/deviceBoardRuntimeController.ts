import {
  createEmptyDeviceScenarioDocument,
  type DeviceScenarioDocument,
  type RuntimeMode,
} from '@membrana/core';
import {
  ScenarioRuntime,
  createIdleScenarioRuntimeState,
  resolveDeviceCaptureFlags,
  resolveServerFirstFlags,
  type ScenarioRuntimeHost,
  type ScenarioRuntimeState,
} from '@membrana/device-board';
import {
  ScenarioAsyncJobHub,
  bindScenarioAsyncJobPublisher,
} from '@membrana/agenda';
import { stopAllActivePlayback } from '@membrana/audio-engine-service';

import { createScenarioRuntimeHost } from '@/modules/device-board/createScenarioRuntimeHost';
import { createClientDeviceBoardPersistAdapterFromSession } from '@/modules/device-board/deviceScenarioPersistence';
import {
  loadPersistedRuntimeMode,
  savePersistedRuntimeMode,
} from '@/lib/runtimeModePersistence';
import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';
import { preemptRunningScenario } from '@/lib/runtimePreemption';
import { useServerFirstStore } from '@/stores/serverFirstStore';

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

  /**
   * CSR1: хост, на котором строится единственный runtime. App инъектирует свой
   * host (`acquireRuntime`), чтобы борд и контроллер делили ОДИН runtime и хост —
   * иначе на клиенте жили два инстанса (кнопки борда правили не тот, сервер их
   * не видел). Fallback createScenarioRuntimeHost() — для headless-команд кабинета,
   * если App ещё не инъектировал host.
   */
  private injectedHost: ScenarioRuntimeHost | null = null;

  /** CT6: активный run для LWW-preemption (ожидание settle перед перезапуском). */
  private scenarioRunPromise: Promise<void> | undefined;

  private unsubscribeRuntime: (() => void) | null = null;

  private unsubscribeAsyncJobs: (() => void) | null = null;

  private readonly asyncJobHub = new ScenarioAsyncJobHub();

  // RT7: режим восстанавливается из localStorage при инициализации узла.
  private mode: RuntimeMode = loadPersistedRuntimeMode();

  private state: ScenarioRuntimeState = createIdleScenarioRuntimeState();

  private readonly listeners = new Set<StateListener>();

  /**
   * CSR1: единый runtime для борда и realtime-моста. App вызывает при связи и
   * передаёт полученный инстанс в DeviceBoardShell (externalRuntime), чтобы
   * кнопки борда и команды кабинета крутили один и тот же runtime — состояние
   * и журнал двунаправленно синхронизируются с сервером.
   */
  acquireRuntime(host?: ScenarioRuntimeHost): ScenarioRuntime {
    if (host !== undefined) {
      this.injectedHost = host;
    }
    return this.ensureRuntime();
  }

  getState(): ScenarioRuntimeState {
    return this.state;
  }

  getMode(): RuntimeMode {
    return this.mode;
  }

  /** AP v1 R10: UI subscribe facade (pending upload badge, debug). */
  getAsyncJobHub(): ScenarioAsyncJobHub {
    this.ensureRuntime();
    return this.asyncJobHub;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(options?: { fromRemote?: boolean }): Promise<void> {
    const deviceId = getNodeRealtimeClient().getDeviceId();
    const captureFlags = resolveDeviceCaptureFlags(useServerFirstStore.getState().capture);
    if (captureFlags.captured) {
      // CT4 (канон §4.2): при явном захвате v2 решает ось capture —
      // hard блокирует локальный run, soft разрешает (last-write-win §3.2).
      if (!options?.fromRemote && !captureFlags.allowFieldRun) {
        return;
      }
    } else {
      // v1 legacy path (неявный run=capture) — до CT7 cleanup.
      const flags = resolveServerFirstFlags({
        deviceId,
        editLease: useServerFirstStore.getState().editLease,
        captureState: useServerFirstStore.getState().captureState,
      });
      if (!options?.fromRemote && flags.blockLocalRun) {
        return;
      }
    }
    const runtime = this.ensureRuntime();
    // CT6 (канон §3.2): last-write-win — последний run побеждает,
    // проигравший сценарий останавливается.
    if (!(await preemptRunningScenario(runtime, this.scenarioRunPromise))) {
      return; // конкурентный preempt уже перезапустил runtime
    }
    if (!options?.fromRemote && deviceId !== null) {
      useServerFirstStore.getState().setFieldCapture(deviceId);
    }
    this.asyncJobHub.clear();
    const document = await this.loadDocument();
    runtime.load(document);
    this.scenarioRunPromise = runtime.start().catch(() => undefined);
  }

  /**
   * Emergency stop: доступен ВСЕГДА, в любом режиме захвата —
   * инвариант канона §3.3 (audio-engine без permission-check).
   * CT6: `fadeOutMs` > 0 гасит слышимое воспроизведение плавно
   * (вытеснение захватом = 200 мс); 0/умолчание — hard-cut.
   */
  stop(options?: { fadeOutMs?: number }): void {
    void stopAllActivePlayback({ fadeOutMs: options?.fadeOutMs ?? 0 });
    this.runtime?.stop('user');
  }

  pause(): void {
    // CT4 (канон §4.2): пауза под захватом заблокирована (soft и hard) — тариф v3.
    if (resolveDeviceCaptureFlags(useServerFirstStore.getState().capture).captured) {
      return;
    }
    this.runtime?.pause();
  }

  resume(): void {
    if (resolveDeviceCaptureFlags(useServerFirstStore.getState().capture).captured) {
      return;
    }
    this.runtime?.resume();
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
    this.scenarioRunPromise = undefined;
    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;
    this.unsubscribeAsyncJobs?.();
    this.unsubscribeAsyncJobs = null;
    this.runtime = null;
    this.injectedHost = null;
    this.asyncJobHub.clear();
    this.mode = 'normal';
    this.state = createIdleScenarioRuntimeState();
    this.listeners.clear();
  }

  private ensureRuntime(): ScenarioRuntime {
    if (this.runtime !== null) {
      return this.runtime;
    }
    // CSR1: общий host из App (если инъектирован) — иначе fallback для headless.
    const runtime = new ScenarioRuntime(this.injectedHost ?? createScenarioRuntimeHost());
    this.unsubscribeAsyncJobs?.();
    this.unsubscribeAsyncJobs = bindScenarioAsyncJobPublisher(
      this.asyncJobHub,
      (listener) => runtime.subscribeAsyncJobs(listener),
      { seed: () => runtime.listPendingAsyncJobs() },
    );
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
