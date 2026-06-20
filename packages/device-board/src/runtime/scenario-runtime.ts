import type { DeviceScenarioDocument, ScenarioGraphNode, ScenarioSubgraph, ScenarioVariable } from '@membrana/core';
import { createStringValue } from '@membrana/core';

import { ALARM_LOOP_PAUSE_MS } from './alarm-constants.js';
import { isDetectionFrontEdge } from './detection-front.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import { CollectRuntimeStore } from './collect-runtime-store.js';
import { ReporterRuntimeStore } from './reporter-runtime-store.js';
import type { ScenarioRuntimeHost } from './host.js';
import { LOOP_TICK_PAUSE_MS, waitUntilNextLoopTick } from './runtime-timing.js';
import type { ResolveInputContext } from './resolve-input.js';
import {
  createIdleScenarioRuntimeState,
  runtimeBranchToHandlerBranch,
  type ScenarioDetectionResult,
  type ScenarioRuntimeBranch,
  type ScenarioRuntimeState,
  type ScenarioStopReason,
} from './types.js';
import type { RuntimeMode } from '@membrana/core';
import { ScenarioVariableStore } from './variable-store.js';

function hostAudioResolveContext(
  host: ScenarioRuntimeHost,
): Pick<
  ResolveInputContext,
  | 'getActiveAudioStreamRef'
  | 'getCapturedAudioSampleRef'
  | 'getCapturedFftFrameRef'
  | 'getRecorderSessionRef'
  | 'getSpectralAnalyserSessionRef'
  | 'getDeviceJournalRef'
  | 'getServerJournalRef'
  | 'getReporterRef'
> {
  const result: {
    getActiveAudioStreamRef?: ResolveInputContext['getActiveAudioStreamRef'];
    getCapturedAudioSampleRef?: ResolveInputContext['getCapturedAudioSampleRef'];
    getCapturedFftFrameRef?: ResolveInputContext['getCapturedFftFrameRef'];
    getRecorderSessionRef?: ResolveInputContext['getRecorderSessionRef'];
    getSpectralAnalyserSessionRef?: ResolveInputContext['getSpectralAnalyserSessionRef'];
    getDeviceJournalRef?: ResolveInputContext['getDeviceJournalRef'];
    getServerJournalRef?: ResolveInputContext['getServerJournalRef'];
    getReporterRef?: ResolveInputContext['getReporterRef'];
  } = {};
  if (host.getActiveAudioStreamRef !== undefined) {
    result.getActiveAudioStreamRef = () => host.getActiveAudioStreamRef!();
  }
  if (host.getCapturedAudioSampleRef !== undefined) {
    result.getCapturedAudioSampleRef = (nodeId: string) => host.getCapturedAudioSampleRef!(nodeId);
  }
  if (host.getCapturedFftFrameRef !== undefined) {
    result.getCapturedFftFrameRef = (nodeId: string) => host.getCapturedFftFrameRef!(nodeId);
  }
  if (host.getRecorderSessionRef !== undefined) {
    result.getRecorderSessionRef = (deviceHandle: string) =>
      host.getRecorderSessionRef!(deviceHandle);
  }
  if (host.getSpectralAnalyserSessionRef !== undefined) {
    result.getSpectralAnalyserSessionRef = (deviceHandle: string) =>
      host.getSpectralAnalyserSessionRef!(deviceHandle);
  }
  if (host.getDeviceJournalRef !== undefined) {
    result.getDeviceJournalRef = (deviceHandle: string) => host.getDeviceJournalRef!(deviceHandle);
  }
  if (host.getServerJournalRef !== undefined) {
    result.getServerJournalRef = (deviceHandle: string) => host.getServerJournalRef!(deviceHandle);
  }
  return result;
}

export type ScenarioRuntimeListener = (state: ScenarioRuntimeState) => void;

export interface ScenarioRuntimeOptions {
  readonly mainLoopChunkDurationMs?: number;
  /** Пауза между тиками main/alarm; `0` — без паузы (тесты). */
  readonly loopTickPauseMs?: number;
}

/**
 * Scenario runtime v1 — initial + main + alarm + onStop + onDisconnect (H2b–H4, H3a–H3b).
 * Чистое ядро без React/DOM; host реализует I/O.
 */
export class ScenarioRuntime {
  private readonly host: ScenarioRuntimeHost;

  private readonly options: ScenarioRuntimeOptions;

  private readonly loopTickPauseMs: number;

  private document: DeviceScenarioDocument | null = null;

  private state: ScenarioRuntimeState = createIdleScenarioRuntimeState();

  private abortController: AbortController | null = null;

  private readonly listeners = new Set<ScenarioRuntimeListener>();

  private readonly variableStore = new ScenarioVariableStore();

  private readonly collectStore = new CollectRuntimeStore();

  private readonly reporterStore = new ReporterRuntimeStore();

  private runPromise: Promise<void> | null = null;

  private stopRequested = false;

  private disconnectRequested = false;

  private stopReason: ScenarioStopReason | null = null;

  private wasRunningBeforeDisconnect = false;

  /** Источник истины ручного режима (MP7b RT3). Переживает load/start. */
  private mode: RuntimeMode = 'normal';

  private scenarioStartedAtMs: number | null = null;

  private lastMainTickAtMs: number | null = null;

  private lastAlarmTickAtMs: number | null = null;

  constructor(host: ScenarioRuntimeHost, options: ScenarioRuntimeOptions = {}) {
    this.host = host;
    this.options = options;
    this.loopTickPauseMs = options.loopTickPauseMs ?? LOOP_TICK_PAUSE_MS;
  }

  getState(): ScenarioRuntimeState {
    return this.state;
  }

  getMode(): RuntimeMode {
    return this.mode;
  }

  /** Снимок переменных сценария после exec (v0.4 DBR4). */
  getVariables(): readonly ScenarioVariable[] {
    return this.variableStore.snapshot();
  }

  subscribe(listener: ScenarioRuntimeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Ручной режим (MP7b RT3): `alarm` — приоритетный override (форсит alarm-loop,
   * авто detection-front игнорируется); `normal` — возврат к main + авто-детект.
   */
  setMode(mode: RuntimeMode): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    this.host.log(`setMode ${mode}`, {});
    this.patchState({ ...this.state, mode });
  }

  /** Idle-снимок c сохранением текущего ручного режима. */
  private idleState(): ScenarioRuntimeState {
    return { ...createIdleScenarioRuntimeState(), mode: this.mode };
  }

  load(document: DeviceScenarioDocument): void {
    if (this.state.isRunning) {
      throw new Error('Cannot load scenario while runtime is running');
    }
    this.document = document;
    this.variableStore.reset(document.scenario.variables);
    this.collectStore.resetAll();
    this.reporterStore.resetAll();
    this.host.resetCollectorSessions?.();
    this.stopRequested = false;
    this.disconnectRequested = false;
    this.stopReason = null;
    this.wasRunningBeforeDisconnect = false;
    this.patchState(this.idleState());
  }

  start(): Promise<void> {
    if (this.document === null) {
      return Promise.reject(new Error('ScenarioRuntime: no document loaded'));
    }
    if (this.state.isRunning) {
      return this.runPromise ?? Promise.resolve();
    }

    this.stopRequested = false;
    this.disconnectRequested = false;
    this.stopReason = null;
    this.collectStore.resetAll();
    this.reporterStore.resetAll();
    this.host.resetCollectorSessions?.();
    this.abortController = new AbortController();
    this.patchState({
      ...this.idleState(),
      isRunning: true,
      phase: 'initial',
    });

    this.runPromise = this.runLoadedDocument(this.document, this.abortController.signal).finally(() => {
      this.runPromise = null;
      this.abortController = null;
    });

    return this.runPromise;
  }

  /** Остановка сценария: UI-кнопка (`user`) или системное событие (`system`, T1). */
  stop(reason: ScenarioStopReason = 'user'): void {
    this.stopRequested = true;
    this.stopReason = reason;
    this.abortController?.abort();
    if (this.state.isRunning) {
      this.patchState({ ...this.state, phase: 'stopping', lastStopReason: reason });
    }
  }

  /** Потеря соединения с устройством (T3) — onDisconnect, не onStop. */
  handleDisconnect(): void {
    if (!this.state.isRunning) {
      return;
    }
    this.wasRunningBeforeDisconnect = true;
    this.disconnectRequested = true;
    this.abortController?.abort();
    this.patchState({ ...this.state, phase: 'stopping' });
  }

  /** Reconnect → повторный проход initial (T4). */
  async handleReconnect(): Promise<void> {
    if (!this.wasRunningBeforeDisconnect || this.document === null || this.state.isRunning) {
      return;
    }
    this.wasRunningBeforeDisconnect = false;
    this.host.log('reconnect → initial', {});
    await this.start();
  }

  /**
   * Запуск обработчика onConnect (v0.4 DBR4): Event → variable-set и т.д.
   * Вызывается приложением при подключении устройства.
   */
  async runOnConnect(): Promise<void> {
    if (this.document === null) {
      throw new Error('ScenarioRuntime: no document loaded');
    }
    if (!this.isDeviceLinked()) {
      return;
    }
    const onConnect = this.document.scenario.onConnect;
    if (onConnect.nodes.length === 0) {
      return;
    }

    const signal = new AbortController().signal;
    await runSubgraphOnce(
      onConnect,
      this.host,
      signal,
      this.execOptions('initial', this.document.scenario.functions, undefined, {
        handlerBranch: 'onConnect',
        deviceHandle: this.host.getDeviceHandle?.() ?? null,
        serverHandle: this.host.getServerHandle?.() ?? null,
        triggeredAt: new Date().toISOString(),
      }),
    );
  }

  private async runOnConnectIfLinked(
    document: DeviceScenarioDocument,
    signal: AbortSignal,
  ): Promise<void> {
    if (!this.isDeviceLinked()) {
      return;
    }
    const onConnect = document.scenario.onConnect;
    if (onConnect.nodes.length === 0) {
      return;
    }
    this.host.log('onConnect → onStart chain', {});
    await runSubgraphOnce(
      onConnect,
      this.host,
      signal,
      this.execOptions('initial', document.scenario.functions, undefined, {
        handlerBranch: 'onConnect',
        deviceHandle: this.host.getDeviceHandle?.() ?? null,
        serverHandle: this.host.getServerHandle?.() ?? null,
        triggeredAt: new Date().toISOString(),
      }),
      { onNodeEnter: (node) => this.onNodeEnter('initial', node) },
    );
  }

  private isDeviceLinked(): boolean {
    return this.host.isDeviceLinked?.() ?? false;
  }

  private augmentResolveContext(context: ResolveInputContext | undefined): ResolveInputContext | undefined {
    const audio = hostAudioResolveContext(this.host);
    const print: Pick<ResolveInputContext, 'getPrintOutputValue'> = {
      getPrintOutputValue: (nodeId) => {
        const message = this.state.printOutputs[nodeId];
        if (message === undefined) {
          return null;
        }
        return createStringValue(message);
      },
    };
    const collect: Pick<ResolveInputContext, 'getCollectBatchRef'> = {
      getCollectBatchRef: (nodeId) => this.collectStore.getLastBatchRef(nodeId),
    };
    const reporter: Pick<ResolveInputContext, 'getReporterRef'> = {
      getReporterRef: (journalHandle) => {
        const fromHost = this.host.getReporterRef?.(journalHandle);
        if (fromHost !== undefined && fromHost !== null) {
          return fromHost;
        }
        return this.reporterStore.getReporterRef(journalHandle);
      },
    };
    const merged = { ...audio, ...print, ...collect, ...reporter };
    if (Object.keys(merged).length === 0) {
      return context;
    }
    if (context === undefined) {
      return merged;
    }
    return { ...context, ...merged };
  }

  private buildResolveContext(branch: ScenarioRuntimeBranch): ResolveInputContext | undefined {
    const handlerBranch = runtimeBranchToHandlerBranch(branch);
    if (handlerBranch !== null) {
      return {
        handlerBranch,
        deviceHandle: this.host.getDeviceHandle?.() ?? null,
        serverHandle: this.host.getServerHandle?.() ?? null,
        triggeredAt: new Date().toISOString(),
      };
    }
    if (branch === 'main' || branch === 'alarm') {
      return this.buildLoopTickResolveContext(branch);
    }
    return undefined;
  }

  private buildLoopTickResolveContext(branch: 'main' | 'alarm', mutateTick = true): ResolveInputContext {
    const nowMs = Date.now();
    const startedAt = this.scenarioStartedAtMs ?? nowMs;
    const lastTickAt = branch === 'main' ? this.lastMainTickAtMs : this.lastAlarmTickAtMs;
    const tickMs = lastTickAt === null ? 0 : nowMs - lastTickAt;
    if (mutateTick) {
      if (branch === 'main') {
        this.lastMainTickAtMs = nowMs;
      } else {
        this.lastAlarmTickAtMs = nowMs;
      }
    }
    return {
      loopElapsedMs: nowMs - startedAt,
      loopTickMs: tickMs,
      deviceHandle: this.host.getDeviceHandle?.() ?? null,
    };
  }

  /**
   * Контекст pull-резолюции для UI-инспекции узла (без сдвига счётчиков тика).
   * @param branchTab — вкладка scenario graph на доске.
   */
  getInspectionResolveContext(
    branchTab:
      | 'initial'
      | 'onConnect'
      | 'main'
      | 'alarm'
      | 'onStop'
      | 'onDisconnect'
      | 'function',
  ): ResolveInputContext | undefined {
    if (branchTab === 'onConnect') {
      return this.augmentResolveContext({
        handlerBranch: 'onConnect',
        deviceHandle: this.host.getDeviceHandle?.() ?? null,
        serverHandle: this.host.getServerHandle?.() ?? null,
        triggeredAt: new Date().toISOString(),
      });
    }
    if (branchTab === 'initial') {
      return this.augmentResolveContext({
        handlerBranch: 'initial',
        deviceHandle: this.host.getDeviceHandle?.() ?? null,
        serverHandle: this.host.getServerHandle?.() ?? null,
        triggeredAt: new Date().toISOString(),
      });
    }
    if (branchTab === 'onStop') {
      return this.augmentResolveContext({
        handlerBranch: 'onStop',
        deviceHandle: this.host.getDeviceHandle?.() ?? null,
        triggeredAt: new Date().toISOString(),
      });
    }
    if (branchTab === 'onDisconnect') {
      return this.augmentResolveContext({
        handlerBranch: 'onDisconnect',
        deviceHandle: null,
        triggeredAt: new Date().toISOString(),
      });
    }
    if (branchTab === 'main' || branchTab === 'alarm') {
      return this.augmentResolveContext({
        ...this.buildLoopTickResolveContext(branchTab, false),
        deviceHandle: this.host.getDeviceHandle?.() ?? null,
      });
    }
    return undefined;
  }

  private execOptions(
    branch: ScenarioRuntimeBranch,
    functions: DeviceScenarioDocument['scenario']['functions'],
    defaultChunkDurationMs?: number,
    resolveContextOverride?: ResolveInputContext,
  ) {
    const resolveContext = this.augmentResolveContext(
      resolveContextOverride ?? this.buildResolveContext(branch),
    );
    return {
      branch,
      functions,
      defaultChunkDurationMs,
      variableStore: this.variableStore,
      resolveContext,
      onPrintOutput: (nodeId: string, message: string) => this.recordPrintOutput(nodeId, message),
      onStopRuntime: () => this.stop('user'),
      collectStore: this.collectStore,
    };
  }

  private recordPrintOutput(nodeId: string, message: string): void {
    this.patchState({
      ...this.state,
      printOutputs: { ...this.state.printOutputs, [nodeId]: message },
    });
  }

  private async runLoadedDocument(
    document: DeviceScenarioDocument,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      await this.runOnConnectIfLinked(document, signal);
      if (signal.aborted) {
        await this.finalizeRun(document);
        return;
      }

      await runSubgraphOnce(document.scenario.initial, this.host, signal, this.execOptions('initial', document.scenario.functions), {
        onNodeEnter: (node) => this.onNodeEnter('initial', node),
      });

      if (signal.aborted) {
        await this.finalizeRun(document);
        return;
      }

      this.scenarioStartedAtMs = Date.now();
      this.lastMainTickAtMs = null;
      this.lastAlarmTickAtMs = null;

      let mainIteration = 0;
      let previousMainDetection: ScenarioDetectionResult | null = null;

      while (!signal.aborted) {
        // MP7b RT3: ручной режим alarm — приоритетный override, форсит alarm-loop.
        if (this.mode === 'alarm') {
          this.host.log('main → alarm (manual override)', {});
          await this.runAlarmLoop(
            document.scenario.loops.alarm,
            document.scenario.functions,
            signal,
            'manual',
          );
          // После выхода из override пересобираем базовую детекцию.
          previousMainDetection = null;
          continue;
        }

        mainIteration += 1;
        this.patchState({
          ...this.state,
          phase: 'main',
          activeBranch: 'main',
          mainLoopIteration: mainIteration,
        });

        const mainResolveContext = this.buildLoopTickResolveContext('main');
        const lastDetection = await runSubgraphOnce(
          document.scenario.loops.main,
          this.host,
          signal,
          this.execOptions('main', document.scenario.functions, this.options.mainLoopChunkDurationMs, mainResolveContext),
          {
            onNodeEnter: (node) => this.onNodeEnter('main', node),
          },
        );

        if (signal.aborted) {
          break;
        }

        // Авто detection-front работает только в normal-режиме.
        if (this.mode === 'normal' && isDetectionFrontEdge(previousMainDetection, lastDetection)) {
          this.host.log('main → alarm (detection front)', {
            templateId: lastDetection?.templateId,
          });
          await this.runAlarmLoop(
            document.scenario.loops.alarm,
            document.scenario.functions,
            signal,
            'auto',
          );
        }

        previousMainDetection = lastDetection;

        if (this.loopTickPauseMs > 0) {
          try {
            await waitUntilNextLoopTick(this.host, this.loopTickPauseMs, signal);
          } catch {
            break;
          }
        }
      }

      await this.finalizeRun(document);
    } catch (error) {
      if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        await this.finalizeRun(document);
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.host.log('scenario-runtime error', { message });
      this.patchState({
        ...this.state,
        isRunning: false,
        phase: 'error',
        lastError: message,
        activeNodeId: null,
        activeBlockKind: null,
      });
    }
  }

  /**
   * Alarm-loop. `trigger`:
   *  - `auto` — вход по detection-front в normal-режиме; выход по тишине.
   *  - `manual` — ручной override (`setMode('alarm')`); держится, пока режим `alarm`,
   *    выход немедленно при `setMode('normal')` (без проверки уровня).
   * В любом триггере: пока `mode === 'alarm'`, alarm удерживается независимо от уровня.
   */
  private async runAlarmLoop(
    alarmSubgraph: ScenarioSubgraph,
    functions: DeviceScenarioDocument['scenario']['functions'],
    signal: AbortSignal,
    trigger: 'auto' | 'manual',
  ): Promise<void> {
    this.lastAlarmTickAtMs = null;
    let alarmIteration = 0;

    while (!signal.aborted) {
      alarmIteration += 1;
      this.patchState({
        ...this.state,
        phase: 'alarm',
        activeBranch: 'alarm',
        alarmLoopIteration: alarmIteration,
      });

      const alarmResolveContext = this.buildLoopTickResolveContext('alarm');
      await runSubgraphOnce(alarmSubgraph, this.host, signal, this.execOptions('alarm', functions, undefined, alarmResolveContext), {
        onNodeEnter: (node) => this.onNodeEnter('alarm', node),
      });

      if (signal.aborted) {
        return;
      }

      // Ручной override активен — удерживаем alarm независимо от уровня.
      if (this.mode === 'alarm') {
        await waitUntilNextLoopTick(this.host, ALARM_LOOP_PAUSE_MS, signal);
        continue;
      }

      // mode === 'normal': снятый override возвращает в main немедленно.
      if (trigger === 'manual') {
        this.host.log('alarm → main (mode normal)', {});
        return;
      }

      // Авто-alarm выходит по тишине (detection-front погашен).
      const level = await this.host.evaluateSoundLevel();
      if (level.isQuietEnough) {
        this.host.log('alarm → main (quiet enough)', { rawLevel: level.rawLevel });
        return;
      }

      await waitUntilNextLoopTick(this.host, ALARM_LOOP_PAUSE_MS, signal);
    }
  }

  private async runOnStopTrigger(
    onStop: ScenarioSubgraph,
    functions: DeviceScenarioDocument['scenario']['functions'],
  ): Promise<void> {
    if (onStop.nodes.length === 0) {
      return;
    }

    this.host.log('onStop trigger', { reason: this.stopReason ?? 'user' });
    await this.runTriggerSubgraph('onStop', onStop, functions);
  }

  private async runOnDisconnectTrigger(
    onDisconnect: ScenarioSubgraph,
    functions: DeviceScenarioDocument['scenario']['functions'],
  ): Promise<void> {
    if (!this.isDeviceLinked()) {
      return;
    }
    if (onDisconnect.nodes.length === 0) {
      return;
    }

    this.host.log('onDisconnect trigger', {});
    await this.runTriggerSubgraph('onDisconnect', onDisconnect, functions);
  }

  private async runTriggerSubgraph(
    branch: 'onStop' | 'onDisconnect',
    subgraph: ScenarioSubgraph,
    functions: DeviceScenarioDocument['scenario']['functions'],
  ): Promise<void> {
    this.patchState({
      ...this.state,
      phase: branch,
      activeBranch: branch,
      isRunning: true,
    });

    const teardownSignal = new AbortController().signal;
    await runSubgraphOnce(subgraph, this.host, teardownSignal, this.execOptions(branch, functions), {
      onNodeEnter: (node) => this.onNodeEnter(branch, node),
    });
  }

  private async finalizeRun(document: DeviceScenarioDocument): Promise<void> {
    if (this.stopRequested) {
      if (this.isDeviceLinked()) {
        await this.runOnDisconnectTrigger(
          document.scenario.triggers.onDisconnect,
          document.scenario.functions,
        );
      }
      await this.runOnStopTrigger(document.scenario.triggers.onStop, document.scenario.functions);
    } else if (this.disconnectRequested) {
      await this.runOnDisconnectTrigger(
        document.scenario.triggers.onDisconnect,
        document.scenario.functions,
      );
    }
    await this.finishStopped();
  }

  private onNodeEnter(branch: ScenarioRuntimeBranch, node: ScenarioGraphNode): void {
    const phase =
      branch === 'onStop' || branch === 'onDisconnect' ? branch : branch;
    this.patchState({
      ...this.state,
      activeBranch: branch,
      activeNodeId: node.id,
      activeBlockKind: node.blockKind,
      phase,
    });
  }

  private async finishStopped(): Promise<void> {
    await this.host.stopStream().catch(() => undefined);
    this.patchState({
      ...this.idleState(),
      phase: 'stopped',
      lastStopReason: this.stopReason,
    });
    this.stopRequested = false;
    this.disconnectRequested = false;
  }

  private patchState(next: ScenarioRuntimeState): void {
    this.state = next;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
