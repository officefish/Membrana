import type { ScenarioFunctionSubgraph, ScenarioGraphNode } from '@membrana/core';

import { parseSubgraphFunctionId } from '../graph/subgraph-ref.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import type { ScenarioRuntimeHost } from './host.js';
import type { ScenarioDetectionResult } from './types.js';
import type { ScenarioRuntimeBranch } from './types.js';

export interface BlockExecutionInput {
  readonly host: ScenarioRuntimeHost;
  readonly signal: AbortSignal;
  readonly branch: ScenarioRuntimeBranch;
  readonly node: ScenarioGraphNode;
  readonly lastDetection: ScenarioDetectionResult | null;
  readonly defaultChunkDurationMs: number;
  readonly functions: readonly ScenarioFunctionSubgraph[];
}

export interface BlockExecutionResult {
  readonly lastDetection: ScenarioDetectionResult | null;
  readonly stopRequested: boolean;
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
  const { host, signal, branch, node, lastDetection, defaultChunkDurationMs, functions } = input;

  assertNotAborted(signal);

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
      });
      host.log('subgraph', { nodeId: node.id, functionId: fn.id, branch });
      return { lastDetection: detection, stopRequested: false };
    }

    default:
      throw new Error(`Unsupported scenario block: ${node.blockKind}`);
  }
}
