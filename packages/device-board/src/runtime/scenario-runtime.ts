import type { DeviceScenarioDocument, ScenarioGraphNode, ScenarioSubgraph, ScenarioVariable, ScenarioAsyncJobRecord } from '@membrana/core';
import { createStringValue } from '@membrana/core';

import { ALARM_LOOP_PAUSE_MS } from './alarm-constants.js';
import {
  advanceLoopTransition,
  DEFAULT_LOOP_TRANSITION_POLICY,
  INITIAL_LOOP_TRANSITION_STATE,
  type LoopTransitionPolicy,
  type LoopTransitionState,
} from './loop-transition-policy.js';
import {
  clampDetectionThreshold,
  isBranchOnDetectionNodeKind,
} from '../graph/branch-on-detection-node.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import { CollectRuntimeStore } from './collect-runtime-store.js';
import { ReporterRuntimeStore } from './reporter-runtime-store.js';
import { ReportRuntimeStore } from './report-runtime-store.js';
import { TrackRuntimeStore } from './track-runtime-store.js';
import { RecordingSliceRuntimeStore } from './recording-slice-runtime-store.js';
import { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import { DetectionFusionRuntimeStore } from './fusion-runtime-store.js';
import { EnsembleAnalysisRuntimeStore } from './ensemble-runtime-store.js';
import { ProximityRuntimeStore } from './proximity-runtime-store.js';
import { AsyncJobStore } from './async-job-store.js';
import { PromiseRuntimeStore } from './promise-runtime-store.js';
import { wireAsyncResolvedDispatch } from './async-resolved-dispatch.js';
import type { ScenarioRuntimeHost } from './host.js';
import { LOOP_TICK_PAUSE_MS, waitUntilNextLoopTick } from './runtime-timing.js';
import type { ResolveInputContext } from './resolve-input.js';
import { resolveCompetitionRunLimits } from '../graph/execution-policy.js';
import type { CompetitionRunLogPayload } from './competition-run-log.js';
import { isReferenceValid } from './reference-validity.js';
import {
  createIdleScenarioRuntimeState,
  runtimeBranchToHandlerBranch,
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

  private readonly reportStore = new ReportRuntimeStore();

  private readonly trackStore = new TrackRuntimeStore();

  private readonly recordingSliceStore = new RecordingSliceRuntimeStore();

  private readonly analysisStore = new FftTrendAnalysisRuntimeStore();
  private readonly fusionStore = new DetectionFusionRuntimeStore();
  private readonly ensembleStore = new EnsembleAnalysisRuntimeStore();
  private readonly proximityStore = new ProximityRuntimeStore();

  private readonly asyncJobStore = new AsyncJobStore();

  private readonly promiseRuntimeStore = new PromiseRuntimeStore();

  private asyncResolvedUnsubscribe: (() => void) | null = null;

  private runPromise: Promise<void> | null = null;

  private stopRequested = false;

  private disconnectRequested = false;

  private stopReason: ScenarioStopReason | null = null;

  private wasRunningBeforeDisconnect = false;

  /** Источник истины ручного режима (MP7b RT3). Переживает load/start. */
  private mode: RuntimeMode = 'normal';

  /**
   * Состояние политики входа main→alarm (консилиум detection-alarm-loop-switch, вариант A):
   * платформа владеет ВХОДОМ по combinedScore (гистерезис/debounce), выход — за узлами
   * alarm-лупа сценария (evaluate-sound-level / proximity). Сбрасывается в load().
   */
  private loopTransitionState: LoopTransitionState = INITIAL_LOOP_TRANSITION_STATE;

  private scenarioStartedAtMs: number | null = null;

  private lastMainTickAtMs: number | null = null;

  private lastAlarmTickAtMs: number | null = null;

  /** Correlation id for one scenario run (chain trace logging). */
  private runId: string | null = null;

  private readonly pauseResumeWaiters = new Set<() => void>();

  private runSignal: AbortSignal | null = null;

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

  /** Подписка на lifecycle async jobs → `ScenarioAsyncJobHub` в client (AP v1 R10). */
  subscribeAsyncJobs(listener: (record: ScenarioAsyncJobRecord) => void): () => void {
    return this.asyncJobStore.subscribe(listener);
  }

  /** Снимок pending jobs для hub seed при bind. */
  listPendingAsyncJobs(): readonly ScenarioAsyncJobRecord[] {
    return this.asyncJobStore.listPending();
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
    this.reportStore.resetAll();
    this.trackStore.resetAll();
    this.recordingSliceStore.resetAll();
    this.analysisStore.resetAll();
    this.fusionStore.resetAll();
    this.ensembleStore.resetAll();
    this.proximityStore.resetAll();
    this.asyncJobStore.clear();
    this.promiseRuntimeStore.resetAll();
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
    this.reportStore.resetAll();
    this.trackStore.resetAll();
    this.recordingSliceStore.resetAll();
    this.analysisStore.resetAll();
    this.fusionStore.resetAll();
    this.ensembleStore.resetAll();
    this.proximityStore.resetAll();
    this.asyncJobStore.clear();
    this.promiseRuntimeStore.resetAll();
    this.host.resetCollectorSessions?.();
    this.abortController = new AbortController();
    this.runSignal = this.abortController.signal;
    this.patchState({
      ...this.idleState(),
      isRunning: true,
      isPaused: false,
      phase: 'initial',
    });

    this.runPromise = this.runLoadedDocument(this.document, this.abortController.signal).finally(() => {
      this.runPromise = null;
      this.abortController = null;
      this.runSignal = null;
    });

    return this.runPromise;
  }

  /** Остановка сценария: UI-кнопка (`user`) или системное событие (`system`, T1). */
  stop(reason: ScenarioStopReason = 'user'): void {
    this.wakePauseWaiters();
    this.stopRequested = true;
    this.stopReason = reason;
    this.abortController?.abort();
    if (this.state.isRunning) {
      this.patchState({ ...this.state, isPaused: false, phase: 'stopping', lastStopReason: reason });
    }
  }

  /** Заморозить exec без onStop (DBP0). */
  pause(): void {
    if (!this.state.isRunning || this.state.isPaused) {
      return;
    }
    this.host.log('runtime pause', {});
    this.patchState({ ...this.state, isPaused: true });
  }

  /** Продолжить после pause(). */
  resume(): void {
    if (!this.state.isRunning || !this.state.isPaused) {
      return;
    }
    this.host.log('runtime resume', {});
    this.patchState({ ...this.state, isPaused: false });
    this.wakePauseWaiters();
  }

  private wakePauseWaiters(): void {
    for (const wake of this.pauseResumeWaiters) {
      wake();
    }
    this.pauseResumeWaiters.clear();
  }

  private async waitWhileUnpaused(signal: AbortSignal): Promise<void> {
    if (!this.state.isPaused || signal.aborted) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
        return;
      }
      const onAbort = (): void => {
        cleanup();
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      };
      const onResume = (): void => {
        cleanup();
        resolve();
      };
      const cleanup = (): void => {
        signal.removeEventListener('abort', onAbort);
        this.pauseResumeWaiters.delete(onResume);
      };
      signal.addEventListener('abort', onAbort, { once: true });
      this.pauseResumeWaiters.add(onResume);
    });
    if (this.state.isPaused && !signal.aborted) {
      await this.waitWhileUnpaused(signal);
    }
  }

  /** Потеря соединения с устройством (T3) — onDisconnect, не onStop. */
  handleDisconnect(): void {
    if (!this.state.isRunning) {
      return;
    }
    this.wakePauseWaiters();
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

  /**
   * onConnect seeds JournalRef (device scope when server is absent).
   * Paired runs need link; Studio autonomous needs only a stable local device handle.
   */
  private shouldRunOnConnectAtStart(): boolean {
    if (this.isDeviceLinked()) {
      return true;
    }
    const deviceHandle = this.host.getDeviceHandle?.() ?? null;
    return deviceHandle !== null && deviceHandle.length > 0;
  }

  private async runOnConnectIfLinked(
    document: DeviceScenarioDocument,
    signal: AbortSignal,
  ): Promise<void> {
    if (!this.shouldRunOnConnectAtStart()) {
      return;
    }
    const onConnect = document.scenario.onConnect;
    if (onConnect.nodes.length === 0) {
      return;
    }
    this.host.log('onConnect → onStart chain', {
      linked: this.isDeviceLinked(),
      device: this.host.getDeviceHandle?.() ?? null,
    });
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

  /**
   * Autonomous Studio: alpha onConnect bootstrap exits via function `exec-false-out`,
   * but parent variable-set may not run if exec propagation stops at the subgraph block.
   * Seed any unset JournalRef variables from host device scope before main loop.
   */
  private seedJournalRefVariablesIfNeeded(document: DeviceScenarioDocument): void {
    if (this.isDeviceLinked()) {
      return;
    }
    const deviceHandle = this.host.getDeviceHandle?.() ?? null;
    if (deviceHandle === null || deviceHandle.length === 0) {
      return;
    }
    const resolveJournalRef = this.host.getDeviceJournalRef;
    if (resolveJournalRef === undefined) {
      return;
    }
    const journalRef = resolveJournalRef(deviceHandle);
    if (journalRef === null || !isReferenceValid(journalRef)) {
      return;
    }
    const journalHandle = journalRef.handle;
    if (journalHandle === null) {
      return;
    }
    for (const variable of document.scenario.variables) {
      if (variable.type !== 'JournalRef') {
        continue;
      }
      const current = this.variableStore.getValue(variable.id);
      if (current !== null && isReferenceValid(current)) {
        continue;
      }
      this.variableStore.setValue(variable.id, journalRef);
      this.host.setScenarioVariable?.(variable.id, journalRef);
      this.host.log('journal-ref-seed', {
        variableId: variable.id,
        journal: journalHandle,
        device: deviceHandle,
        linked: false,
      });
    }
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
    const report: Pick<ResolveInputContext, 'getReportRef'> = {
      getReportRef: (nodeId) => this.reportStore.getReportRef(nodeId),
    };
    const track: Pick<ResolveInputContext, 'getTrackRef'> = {
      getTrackRef: (nodeId) => this.trackStore.getTrackRef(nodeId),
    };
    const recordingSlice: Pick<ResolveInputContext, 'getRecordingSliceRef'> = {
      getRecordingSliceRef: (nodeId) => this.recordingSliceStore.getSliceRef(nodeId),
    };
    const analysis: Pick<ResolveInputContext, 'getFftTrendAnalysisRef'> = {
      getFftTrendAnalysisRef: (nodeId) => this.analysisStore.getAnalysisRef(nodeId),
    };
    const fusion: Pick<ResolveInputContext, 'getDetectionFusionValue'> = {
      getDetectionFusionValue: (nodeId) => this.fusionStore.getFusionValue(nodeId),
    };
    const ensemble: Pick<ResolveInputContext, 'getEnsembleAnalysisRef'> = {
      getEnsembleAnalysisRef: (nodeId) => this.ensembleStore.getAnalysisRef(nodeId),
    };
    const proximity: Pick<ResolveInputContext, 'getProximityRef'> = {
      getProximityRef: (nodeId) => this.proximityStore.getProximityRef(nodeId),
    };
    const promise: Pick<ResolveInputContext, 'getPromiseRef'> = {
      getPromiseRef: (nodeId) => this.promiseRuntimeStore.getPromiseRef(nodeId),
    };
    const merged = { ...audio, ...print, ...collect, ...reporter, ...report, ...track, ...recordingSlice, ...analysis, ...fusion, ...ensemble, ...proximity, ...promise };
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
    const baseContext = this.augmentResolveContext(
      resolveContextOverride ?? this.buildResolveContext(branch),
    );
    const resolveContext =
      baseContext !== undefined
        ? { ...baseContext, scenarioFunctions: functions }
        : { scenarioFunctions: functions };
    return {
      branch,
      functions,
      defaultChunkDurationMs,
      variableStore: this.variableStore,
      resolveContext,
      onPrintOutput: (nodeId: string, message: string) => this.recordPrintOutput(nodeId, message),
      onStopRuntime: () => this.stop('user'),
      onPauseRuntime: () => this.pause(),
      collectStore: this.collectStore,
      reportStore: this.reportStore,
      trackStore: this.trackStore,
      analysisStore: this.analysisStore,
      fusionStore: this.fusionStore,
      ensembleStore: this.ensembleStore,
      proximityStore: this.proximityStore,
      recordingSliceStore: this.recordingSliceStore,
      asyncJobStore: this.asyncJobStore,
      promiseRuntimeStore: this.promiseRuntimeStore,
      runId: this.runId,
      loopTick:
        branch === 'main'
          ? this.state.mainLoopIteration
          : branch === 'alarm'
            ? this.state.alarmLoopIteration
            : undefined,
      awaitUnpaused:
        this.runSignal !== null ? () => this.waitWhileUnpaused(this.runSignal!) : undefined,
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
      this.scenarioStartedAtMs = Date.now();
      this.runId = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? `run-${Date.now()}`;
      this.patchState({
        ...this.state,
        runStartedAtMs: this.scenarioStartedAtMs,
      });

      await this.runOnConnectIfLinked(document, signal);
      if (signal.aborted) {
        await this.finalizeRun(document);
        return;
      }

      this.seedJournalRefVariablesIfNeeded(document);

      await runSubgraphOnce(document.scenario.initial, this.host, signal, this.execOptions('initial', document.scenario.functions), {
        onNodeEnter: (node) => this.onNodeEnter('initial', node),
      });

      if (signal.aborted) {
        await this.finalizeRun(document);
        return;
      }

      this.lastMainTickAtMs = null;
      this.lastAlarmTickAtMs = null;
      this.patchState({
        ...this.state,
        runStartedAtMs: this.scenarioStartedAtMs,
      });

      let mainIteration = 0;
      const loopEntryPolicy = this.resolveLoopEntryPolicy(document.scenario.loops.main);
      this.loopTransitionState = INITIAL_LOOP_TRANSITION_STATE;

      this.host.log('scenario-run-start', {
        runId: this.runId,
        linked: this.host.isDeviceLinked?.() ?? false,
        device: this.host.getDeviceHandle?.() ?? null,
        server: this.host.getServerHandle?.() ?? null,
      });

      this.asyncResolvedUnsubscribe?.();
      this.asyncResolvedUnsubscribe = wireAsyncResolvedDispatch({
        document,
        host: this.host,
        variableStore: this.variableStore,
        promiseRuntimeStore: this.promiseRuntimeStore,
        subscribe: (listener) => this.asyncJobStore.subscribe(listener),
        getSignal: () => this.runSignal,
        execOptions: (branch) =>
          this.execOptions(branch, document.scenario.functions, undefined, undefined),
        onNodeEnter: (branch, node) => this.onNodeEnter(branch, node),
      });

      while (!signal.aborted) {
        await this.waitWhileUnpaused(signal);
        if (signal.aborted) {
          break;
        }

        const competitionLimits = resolveCompetitionRunLimits(document);
        if (
          competitionLimits !== null &&
          this.scenarioStartedAtMs !== null &&
          Date.now() - this.scenarioStartedAtMs >= competitionLimits.timeoutMs
        ) {
          this.host.log('competition-timeout', {
            runId: this.runId,
            limitMs: competitionLimits.timeoutMs,
            elapsedMs: Date.now() - this.scenarioStartedAtMs,
          });
          this.stop('timeout');
          break;
        }

        // MP7b RT3: ручной режим alarm — приоритетный override, форсит alarm-loop.
        if (this.mode === 'alarm') {
          this.host.log('main → alarm (manual override)', {});
          await this.runAlarmLoop(
            document.scenario.loops.alarm,
            document.scenario.functions,
            signal,
            'manual',
          );
          // После снятия override — свежий старт политики входа (без залипания).
          this.loopTransitionState = INITIAL_LOOP_TRANSITION_STATE;
          continue;
        }

        mainIteration += 1;
        this.patchState({
          ...this.state,
          phase: 'main',
          activeBranch: 'main',
          mainLoopIteration: mainIteration,
        });

        this.host.log('main-tick-start', { runId: this.runId, tick: mainIteration, branch: 'main' });

        const mainResolveContext = this.buildLoopTickResolveContext('main');
        const mainTickStartedAt = performance.now();
        const { lastDetection } = await runSubgraphOnce(
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

        const mainTickElapsedMs = Math.round(performance.now() - mainTickStartedAt);
        this.host.log('main-tick-done', {
          runId: this.runId,
          tick: mainIteration,
          branch: 'main',
          detected: lastDetection?.detected ?? false,
          confidence: lastDetection?.confidence ?? null,
          templateId: lastDetection?.templateId ?? null,
          elapsedMs: mainTickElapsedMs,
        });
        this.host.log('main-tick-blocked-ms', {
          runId: this.runId,
          tick: mainIteration,
          branch: 'main',
          elapsedMs: mainTickElapsedMs,
        });

        // Вход в alarm — по loop-transition-policy (combinedScore + гистерезис/debounce),
        // а не по соло-templateId (консилиум detection-alarm-loop-switch, вариант A).
        // Выход из alarm остаётся за узлами alarm-лупа сценария.
        // `confidence` = combinedScore, когда в графе есть make-detection-fusion
        // (fusion — последний писатель lastDetection, #340/#341); без fusion — соло-confidence
        // (legacy fallback). В обоих случаях это метрика, по которой резолвится тот же порог.
        const wasInAlarm = this.loopTransitionState.inAlarm;
        this.loopTransitionState = advanceLoopTransition(
          this.loopTransitionState,
          {
            score: lastDetection?.confidence ?? 0,
            present: lastDetection !== null,
          },
          loopEntryPolicy,
        );
        if (this.mode === 'normal' && !wasInAlarm && this.loopTransitionState.inAlarm) {
          this.host.log('main → alarm (loop-transition-policy)', {
            combinedScore: lastDetection?.confidence ?? null,
            templateId: lastDetection?.templateId,
          });
          await this.runAlarmLoop(
            document.scenario.loops.alarm,
            document.scenario.functions,
            signal,
            'auto',
          );
          // Выход из alarm-лупа (по узлам сценария) → сброс политики: следующий
          // вход требует нового пересечения порога, без немедленного повторного входа.
          this.loopTransitionState = INITIAL_LOOP_TRANSITION_STATE;
        }

        if (this.loopTickPauseMs > 0) {
          try {
            await this.waitWhileUnpaused(signal);
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
      this.host.log('scenario-runtime error', {
        runId: this.runId,
        message,
        stack: error instanceof Error ? error.stack ?? null : null,
        branch: this.state.activeBranch,
        tick:
          this.state.activeBranch === 'main'
            ? this.state.mainLoopIteration
            : this.state.activeBranch === 'alarm'
              ? this.state.alarmLoopIteration
              : null,
        nodeId: this.state.activeNodeId,
      });
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
   * Порог входа loop-transition-policy = порог `branch-on-detection` main-графа
   * (единый источник и для ветвления, и для лупа; консилиум), дефолт 0.5 при отсутствии узла.
   */
  private resolveLoopEntryPolicy(mainSubgraph: ScenarioSubgraph): LoopTransitionPolicy {
    const branchNode = mainSubgraph.nodes.find((node) =>
      isBranchOnDetectionNodeKind(node.nodeKind),
    );
    if (branchNode === undefined) {
      return DEFAULT_LOOP_TRANSITION_POLICY;
    }
    return {
      ...DEFAULT_LOOP_TRANSITION_POLICY,
      enterThreshold: clampDetectionThreshold(branchNode.detectionThreshold),
    };
  }

  /**
   * Alarm-loop. `trigger`:
   *  - `auto` — вход по loop-transition-policy (combinedScore) в normal-режиме; выход по узлам
   *    alarm-лупа сценария (evaluate-sound-level / proximity — вариант A консилиума).
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
      await this.waitWhileUnpaused(signal);
      if (signal.aborted) {
        return;
      }

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
        await this.waitWhileUnpaused(signal);
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

      await this.waitWhileUnpaused(signal);
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
    const tick =
      branch === 'main'
        ? this.state.mainLoopIteration
        : branch === 'alarm'
          ? this.state.alarmLoopIteration
          : null;
    this.host.log('node-enter', {
      branch,
      tick,
      nodeId: node.id,
      nodeKind: node.nodeKind ?? node.blockKind,
      label: node.label ?? null,
    });
    this.patchState({
      ...this.state,
      activeBranch: branch,
      activeNodeId: node.id,
      activeBlockKind: node.blockKind,
      phase,
    });
  }

  private async finishStopped(): Promise<void> {
    this.host.log('scenario-run-stop', {
      runId: this.runId,
      reason: this.stopReason ?? 'system',
    });
    this.asyncResolvedUnsubscribe?.();
    this.asyncResolvedUnsubscribe = null;
    if (this.runId !== null) {
      const cancelled = this.asyncJobStore.cancelByRunId(this.runId);
      if (cancelled.length > 0) {
        this.host.log('async-job-cancelled-run', {
          runId: this.runId,
          count: cancelled.length,
        });
      }
    }
    const document = this.document;
    if (document !== null && this.scenarioStartedAtMs !== null) {
      const competitionLimits = resolveCompetitionRunLimits(document);
      if (competitionLimits !== null) {
        const payload: CompetitionRunLogPayload = {
          runId: this.runId,
          documentTitle: document.meta?.title,
          startedAtMs: this.scenarioStartedAtMs,
          endedAtMs: Date.now(),
          stopReason: this.stopReason ?? 'system',
          mainLoopIterations: this.state.mainLoopIteration,
        };
        try {
          await this.host.postCompetitionRunLog?.(payload);
        } catch {
          this.host.log('competition-run-log-failed', { runId: this.runId });
        }
      }
    }
    await this.host.stopStream().catch(() => undefined);
    this.patchState({
      ...this.idleState(),
      phase: 'stopped',
      lastStopReason: this.stopReason,
      runStartedAtMs: null,
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
