import type { ScenarioFunctionSubgraph, ScenarioGraphNode, ScenarioSubgraph } from '@membrana/core';

import { VARIABLE_VALUE_HANDLE } from '../graph/variable-node.js';
import { PALETTE_VALUE_HANDLE, IS_VALID_FALSE_HANDLE, IS_VALID_TRUE_HANDLE } from '../graph/palette-node.js';
import { parseSubgraphFunctionId } from '../graph/subgraph-ref.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import { formatVariableValueForPrintRuntime } from './format-reference.js';
import type { ScenarioRuntimeHost } from './host.js';
import { resolveInput, type ResolveInputContext } from './resolve-input.js';
import { isReferenceValid } from './reference-validity.js';
import type { ScenarioDetectionResult } from './types.js';
import type { ScenarioRuntimeBranch } from './types.js';
import type { ScenarioVariableStore } from './variable-store.js';

export interface BlockExecutionInput {
  readonly host: ScenarioRuntimeHost;
  readonly signal: AbortSignal;
  readonly branch: ScenarioRuntimeBranch;
  readonly subgraph: ScenarioSubgraph;
  readonly node: ScenarioGraphNode;
  readonly lastDetection: ScenarioDetectionResult | null;
  readonly defaultChunkDurationMs: number;
  readonly functions: readonly ScenarioFunctionSubgraph[];
  readonly variableStore?: ScenarioVariableStore;
  readonly resolveContext?: ResolveInputContext;
  /** Колбэк после успешного Print (для UI-инспектора). */
  readonly onPrintOutput?: (nodeId: string, message: string) => void;
}

export interface BlockExecutionResult {
  readonly lastDetection: ScenarioDetectionResult | null;
  readonly stopRequested: boolean;
  /** v0.4 DBR5: exec-выход для условных узлов (`is-valid`). */
  readonly execOutHandle?: string;
  /** Достигнут системный loop-repeat (∞) — завершить итерацию лупа. */
  readonly loopRepeatRequested?: boolean;
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Scenario aborted', 'AbortError');
  }
}

function journalPayload(
  branch: ScenarioRuntimeBranch,
  lastDetection: ScenarioDetectionResult | null,
  rawLevel?: number,
): Record<string, unknown> | undefined {
  if (branch === 'alarm') {
    return rawLevel !== undefined ? { rawLevel, phase: 'alarm' } : { phase: 'alarm' };
  }
  if (branch === 'onStop') {
    return { phase: 'onStop' };
  }
  if (branch === 'onDisconnect') {
    return { phase: 'onDisconnect' };
  }
  if (lastDetection === null) {
    return undefined;
  }
  return {
    detected: lastDetection.detected,
    confidence: lastDetection.confidence,
    templateId: lastDetection.templateId,
    rawLevel: lastDetection.rawLevel,
  };
}

/** Исполняет один блок scenario graph через host-порты. */
export async function executeScenarioBlock(input: BlockExecutionInput): Promise<BlockExecutionResult> {
  const {
    host,
    signal,
    branch,
    subgraph,
    node,
    lastDetection,
    defaultChunkDurationMs,
    functions,
    variableStore,
    resolveContext,
    onPrintOutput,
  } = input;

  assertNotAborted(signal);

  if (node.nodeKind === 'event') {
    host.log('event', { nodeId: node.id, branch });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'loop-repeat') {
    host.log('loop-repeat', { nodeId: node.id, branch });
    return { lastDetection, stopRequested: false, loopRepeatRequested: true };
  }

  if (node.nodeKind === 'variable-get') {
    host.log('variable-get', { nodeId: node.id, branch, variableId: node.variableId });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'variable-set') {
    const variableId = node.variableId;
    if (variableId === undefined) {
      throw new Error(`variable-set node "${node.id}" missing variableId`);
    }
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('variable-set requires variableStore and resolveContext');
    }

    const incoming = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      VARIABLE_VALUE_HANDLE,
      resolveContext,
    );
    variableStore.setValue(variableId, incoming);
    host.setScenarioVariable?.(variableId, variableStore.getValue(variableId));
    host.log('variable-set', { nodeId: node.id, branch, variableId, incoming });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'print') {
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('print requires variableStore and resolveContext');
    }
    const ref = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      PALETTE_VALUE_HANDLE,
      resolveContext,
    );
    const message = await formatVariableValueForPrintRuntime(ref, host);
    onPrintOutput?.(node.id, message);
    if (host.printLine !== undefined) {
      host.printLine(message);
    } else {
      host.log(`print: ${message}`, { nodeId: node.id, branch, ref });
    }
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'is-valid') {
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('is-valid requires variableStore and resolveContext');
    }
    const ref = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      PALETTE_VALUE_HANDLE,
      resolveContext,
    );
    const valid = isReferenceValid(ref);
    host.log('is-valid', { nodeId: node.id, branch, valid, ref });
    return {
      lastDetection,
      stopRequested: false,
      execOutHandle: valid ? IS_VALID_TRUE_HANDLE : IS_VALID_FALSE_HANDLE,
    };
  }

  if (node.nodeKind === 'get-microphone') {
    host.log('get-microphone', {
      nodeId: node.id,
      branch,
      microphoneId: (node as { microphoneId?: string }).microphoneId,
    });
    return { lastDetection, stopRequested: false };
  }

  switch (node.blockKind) {
    case 'select-microphone':
      await host.selectMicrophone();
      host.log('select-microphone', { nodeId: node.id, branch });
      return { lastDetection, stopRequested: false };

    case 'start-stream':
      await host.startStream();
      host.log('start-stream', { nodeId: node.id, branch });
      return { lastDetection, stopRequested: false };

    case 'write-journal': {
      let rawLevel: number | undefined;
      if (branch === 'alarm') {
        const level = await host.evaluateSoundLevel();
        rawLevel = level.rawLevel;
      }
      await host.writeJournal({
        branch,
        blockKind: node.blockKind,
        nodeId: node.id,
        message: `${branch}: ${node.label ?? node.blockKind}`,
        payload: journalPayload(branch, lastDetection, rawLevel),
      });
      return { lastDetection, stopRequested: false };
    }

    case 'record-chunk': {
      const chunk = await host.recordChunk({ durationMs: defaultChunkDurationMs });
      host.log('record-chunk', { nodeId: node.id, clipId: chunk.clipId, branch });
      return { lastDetection, stopRequested: false };
    }

    case 'trends-fft-detect': {
      const detection = await host.trendsFftDetect();
      host.log('trends-fft-detect', {
        nodeId: node.id,
        detected: detection.detected,
        confidence: detection.confidence,
        branch,
      });
      return { lastDetection: detection, stopRequested: false };
    }

    case 'evaluate-sound-level': {
      const level = await host.evaluateSoundLevel();
      host.log('evaluate-sound-level', {
        nodeId: node.id,
        rawLevel: level.rawLevel,
        isQuietEnough: level.isQuietEnough,
        branch,
      });
      return { lastDetection, stopRequested: false };
    }

    case 'branch-on-detection':
      host.log('branch-on-detection', {
        nodeId: node.id,
        detected: lastDetection?.detected ?? false,
        branch,
      });
      return { lastDetection, stopRequested: false };

    case 'stop-scenario':
      host.log('stop-scenario', { nodeId: node.id, branch });
      return { lastDetection, stopRequested: true };

    case 'handle-disconnect':
      await host.stopStream();
      host.log('handle-disconnect', { nodeId: node.id, branch });
      return { lastDetection, stopRequested: true };

    case 'subgraph': {
      const functionId = parseSubgraphFunctionId(node);
      const fn = functions.find((item) => item.id === functionId);
      if (fn === undefined) {
        throw new Error(`Unknown scenario function: ${functionId ?? '?'}`);
      }
      const detection = await runSubgraphOnce(fn, host, signal, {
        branch,
        defaultChunkDurationMs,
        functions: [],
        variableStore,
        resolveContext,
      });
      host.log('subgraph', { nodeId: node.id, functionId: fn.id, branch });
      return { lastDetection: detection, stopRequested: false };
    }

    default:
      throw new Error(`Unsupported scenario block: ${node.blockKind}`);
  }
}
