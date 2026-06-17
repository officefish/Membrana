import type { DeviceScenarioDocument, ScenarioGraphNode, ScenarioSubgraph } from '@membrana/core';

import { ALARM_LOOP_PAUSE_MS } from './alarm-constants.js';
import { isDetectionFrontEdge } from './detection-front.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import type { ScenarioRuntimeHost } from './host.js';
import {
  createIdleScenarioRuntimeState,
  type ScenarioDetectionResult,
  type ScenarioRuntimeBranch,
  type ScenarioRuntimeState,
  type ScenarioStopReason,
} from './types.js';

export type ScenarioRuntimeListener = (state: ScenarioRuntimeState) => void;

export interface ScenarioRuntimeOptions {
  readonly mainLoopChunkDurationMs?: number;
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scenario runtime v1 — initial + main + alarm + onStop + onDisconnect (H2b–H4, H3a–H3b).
 * Чистое ядро без React/DOM; host реализует I/O.
 */
export class ScenarioRuntime {
  private readonly host: ScenarioRuntimeHost;

  private readonly options: ScenarioRuntimeOptions;

  private document: DeviceScenarioDocument | null = null;

  private state: ScenarioRuntimeState = createIdleScenarioRuntimeState();

  private abortController: AbortController | null = null;

  private readonly listeners = new Set<ScenarioRuntimeListener>();

  private runPromise: Promise<void> | null = null;

  private stopRequested = false;

  private disconnectRequested = false;

  private stopReason: ScenarioStopReason | null = null;

  private wasRunningBeforeDisconnect = false;

  constructor(host: ScenarioRuntimeHost, options: ScenarioRuntimeOptions = {}) {
    this.host = host;
    this.options = options;
  }

  getState(): ScenarioRuntimeState {
    return this.state;
  }

  subscribe(listener: ScenarioRuntimeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  load(document: DeviceScenarioDocument): void {
    if (this.state.isRunning) {
      throw new Error('Cannot load scenario while runtime is running');
    }
    this.document = document;
    this.stopRequested = false;
    this.disconnectRequested = false;
    this.stopReason = null;
    this.wasRunningBeforeDisconnect = false;
    this.patchState(createIdleScenarioRuntimeState());
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
    this.abortController = new AbortController();
    this.patchState({
      ...createIdleScenarioRuntimeState(),
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

  private async runLoadedDocument(
    document: DeviceScenarioDocument,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      await runSubgraphOnce(document.scenario.initial, this.host, signal, {
        branch: 'initial',
        functions: document.scenario.functions,
      }, {
        onNodeEnter: (node) => this.onNodeEnter('initial', node),
      });

      if (signal.aborted) {
        await this.finalizeRun(document);
        return;
      }

      let mainIteration = 0;
      let previousMainDetection: ScenarioDetectionResult | null = null;

      while (!signal.aborted) {
        mainIteration += 1;
        this.patchState({
          ...this.state,
          phase: 'main',
          activeBranch: 'main',
          mainLoopIteration: mainIteration,
        });

        const lastDetection = await runSubgraphOnce(
          document.scenario.loops.main,
          this.host,
          signal,
          {
            branch: 'main',
            defaultChunkDurationMs: this.options.mainLoopChunkDurationMs,
            functions: document.scenario.functions,
          },
          {
            onNodeEnter: (node) => this.onNodeEnter('main', node),
          },
        );

        if (signal.aborted) {
          break;
        }

        if (isDetectionFrontEdge(previousMainDetection, lastDetection)) {
          this.host.log('main → alarm (detection front)', {
            templateId: lastDetection?.templateId,
          });
          await this.runAlarmLoop(document.scenario.loops.alarm, document.scenario.functions, signal);
        }

        previousMainDetection = lastDetection;
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

  private async runAlarmLoop(
    alarmSubgraph: ScenarioSubgraph,
    functions: DeviceScenarioDocument['scenario']['functions'],
    signal: AbortSignal,
  ): Promise<void> {
    let alarmIteration = 0;

    while (!signal.aborted) {
      alarmIteration += 1;
      this.patchState({
        ...this.state,
        phase: 'alarm',
        activeBranch: 'alarm',
        alarmLoopIteration: alarmIteration,
      });

      await runSubgraphOnce(alarmSubgraph, this.host, signal, {
        branch: 'alarm',
        functions,
      }, {
        onNodeEnter: (node) => this.onNodeEnter('alarm', node),
      });

      if (signal.aborted) {
        return;
      }

      const level = await this.host.evaluateSoundLevel();
      if (level.isQuietEnough) {
        this.host.log('alarm → main (quiet enough)', { rawLevel: level.rawLevel });
        return;
      }

      await waitMs(ALARM_LOOP_PAUSE_MS);
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
    await runSubgraphOnce(subgraph, this.host, teardownSignal, {
      branch,
      functions,
    }, {
      onNodeEnter: (node) => this.onNodeEnter(branch, node),
    });
  }

  private async finalizeRun(document: DeviceScenarioDocument): Promise<void> {
    if (this.disconnectRequested) {
      await this.runOnDisconnectTrigger(document.scenario.triggers.onDisconnect, document.scenario.functions);
    } else if (this.stopRequested) {
      await this.runOnStopTrigger(document.scenario.triggers.onStop, document.scenario.functions);
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
      ...createIdleScenarioRuntimeState(),
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
