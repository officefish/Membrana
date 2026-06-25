import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
} from '@membrana/core';

import { DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT } from './default-usercase-mvp-microphone.generated.js';
import {
  hydrateBoardFromDocument,
  type HydratedBoardState,
} from './hydrate-board-from-document.js';

let cachedDocument: DeviceScenarioDocument | null = null;

/** Разбирает embedded MVP document (fail-fast при поломке codegen). */
export function resolveDefaultMvpMicrophoneDocument(): DeviceScenarioDocument {
  if (cachedDocument !== null) {
    return cachedDocument;
  }
  const parsed = parseDeviceScenarioDocument(DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
  if (!parsed.ok) {
    throw new Error(`default MVP microphone document invalid: ${parsed.error.message}`);
  }
  cachedDocument = parsed.value;
  return cachedDocument;
}

/** Полный `device-scenario` для persist / seed first-time users. */
export function getDefaultMvpMicrophoneDocument(): DeviceScenarioDocument {
  return resolveDefaultMvpMicrophoneDocument();
}

/** Гидратация канонического MVP usercase (все 6 обработчиков + variables). */
export function createDefaultMvpMicrophoneHydratedState(): HydratedBoardState {
  return hydrateBoardFromDocument(resolveDefaultMvpMicrophoneDocument());
}

/** D0 hackathon stubs в persist/localStorage — заменяем на bundled MVP. */
export function isLegacyHackathonDefaultScenario(document: DeviceScenarioDocument): boolean {
  const legacyBlockKinds = new Set([
    'select-microphone',
    'start-stream',
    'write-journal',
    'record-chunk',
    'trends-fft-detect',
    'evaluate-sound-level',
    'subgraph',
    'handle-disconnect',
  ]);
  const isUserFunctionBlock = (node: {
    readonly id: string;
    readonly blockKind: string;
    readonly label?: string;
  }): boolean =>
    node.blockKind === 'subgraph' &&
    (node.id.includes('fn-') || node.label?.includes('::fn-') === true);
  const nodes = [
    ...document.scenario.initial.nodes,
    ...document.scenario.loops.main.nodes,
    ...document.scenario.loops.alarm.nodes,
  ];
  return nodes.some(
    (node) => legacyBlockKinds.has(node.blockKind) && !isUserFunctionBlock(node),
  );
}

/**
 * v0.9 main без MakeFftTrendsPolicy, без policy→analysis data-edge,
 * с legacy exec-hop через policy constructors или без MakeTrack→restart exec —
 * подменяем bundled MVP.
 */
function isStartRecordingFunctionBlock(node: { readonly id: string; readonly blockKind: string; readonly label?: string }): boolean {
  return (
    node.blockKind === 'subgraph' &&
    (node.id === 'fn-1-block' || node.label?.includes('StartRecording') === true)
  );
}

function hasV09UserFunctions(document: DeviceScenarioDocument): boolean {
  return (document.scenario.functions?.length ?? 0) > 0;
}

/** Flat v0.8 без `scenario.functions[]` — подменяем bundled v0.9-functions (BD5). */
export function needsBundledV09FunctionsMigration(document: DeviceScenarioDocument): boolean {
  if (document.meta?.bundledGraphVersion === 'v2.0-async') {
    return false;
  }
  if (hasV09UserFunctions(document)) {
    return false;
  }
  const main = document.scenario.loops.main;
  const hasFlatRecordingPolicy = main.nodes.some((node) => node.nodeKind === 'make-recording-policy');
  const hasFunctionBlocks = main.nodes.some((node) => isStartRecordingFunctionBlock(node));
  return hasFlatRecordingPolicy && !hasFunctionBlocks;
}

/**
 * v0.9-functions без async pipeline (Sequence latent + start-async-job) —
 * подменяем bundled v2.0-async (DB-AP-R9).
 */
export function needsBundledV20AsyncMigration(document: DeviceScenarioDocument): boolean {
  if (document.meta?.bundledGraphVersion === 'v2.0-async') {
    return false;
  }
  if (!hasV09UserFunctions(document)) {
    return false;
  }
  const main = document.scenario.loops.main;
  const hasStartAsyncJob = main.nodes.some((node) => node.nodeKind === 'start-async-job');
  const hasLatentSequence = main.nodes.some(
    (node) =>
      node.nodeKind === 'sequence' &&
      node.sequenceConfig?.latentThen === true,
  );
  return !(hasStartAsyncJob && hasLatentSequence);
}

export function needsFftTrendsPolicyConstructorMigration(
  document: DeviceScenarioDocument,
): boolean {
  const main = document.scenario.loops.main;
  const policyNode = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-policy');
  const analysisNode = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-analysis');
  const makeTrack = main.nodes.find((node) => node.nodeKind === 'make-track');
  if (policyNode === undefined || analysisNode === undefined) {
    return policyNode === undefined;
  }
  const hasFftPolicyDataEdge = main.edges.some(
    (edge) =>
      edge.kind === 'data' &&
      edge.source === policyNode.id &&
      edge.target === analysisNode.id &&
      edge.targetHandle === 'policy' &&
      edge.dataType === 'FftTrendsPolicy',
  );
  if (!hasFftPolicyDataEdge) {
    return true;
  }
  const policyIds = new Set([policyNode.id]);
  const recordingPolicy = main.nodes.find((node) => node.nodeKind === 'make-recording-policy');
  if (recordingPolicy !== undefined) {
    policyIds.add(recordingPolicy.id);
  }
  const hasExecThroughPolicies = main.edges.some(
    (edge) =>
      edge.kind === 'exec' &&
      (policyIds.has(edge.source) || policyIds.has(edge.target)),
  );
  if (hasExecThroughPolicies) {
    return true;
  }

  if (hasV09UserFunctions(document)) {
    if (makeTrack === undefined) {
      return true;
    }
    const restartBlock = main.nodes.find((node) => isStartRecordingFunctionBlock(node));
    const fn3Blocks = main.nodes.filter(
      (node) => node.blockKind === 'subgraph' && node.id.includes('fn-3'),
    );
    const sequenceNode = main.nodes.find((node) => node.nodeKind === 'sequence');
    const hasMakeTrackToFn3 = main.edges.some(
      (edge) =>
        edge.kind === 'exec' &&
        edge.source === makeTrack.id &&
        fn3Blocks.some((block) => block.id === edge.target),
    );
    const hasSequenceThen3ToFn3 =
      sequenceNode !== undefined &&
      main.edges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === sequenceNode.id &&
          edge.sourceHandle === 'then-3' &&
          fn3Blocks.some((block) => block.id === edge.target),
      );
    const hasFn3ToRestart =
      restartBlock !== undefined &&
      main.edges.some(
        (edge) =>
          edge.kind === 'exec' &&
          fn3Blocks.some((block) => block.id === edge.source) &&
          edge.target === restartBlock.id,
      );
    return !((hasMakeTrackToFn3 || hasSequenceThen3ToFn3) && hasFn3ToRestart);
  }

  const restartRecording = main.nodes.find((node) => node.id === 'node-start-recording-mqv07-36');
  if (recordingPolicy === undefined || restartRecording === undefined || makeTrack === undefined) {
    return recordingPolicy === undefined;
  }
  const hasRecordingPolicyDataToRestart = main.edges.some(
    (edge) =>
      edge.kind === 'data' &&
      edge.source === recordingPolicy.id &&
      edge.target === restartRecording.id &&
      edge.targetHandle === 'policy' &&
      edge.dataType === 'RecordingPolicy',
  );
  if (!hasRecordingPolicyDataToRestart) {
    return true;
  }
  const hasMakeTrackExecToRestart = main.edges.some(
    (edge) =>
      edge.kind === 'exec' &&
      edge.source === makeTrack.id &&
      edge.target === restartRecording.id,
  );
  return !hasMakeTrackExecToRestart;
}
/**
 * Main loop: GetRecorder → gate без bootstrap на onStart — запись не стартует.
 * Канон после RGC2: bootstrap в `scenario.initial`, main — прямой exec к gate.
 */
export function needsRecordingGateBootstrapMigration(
  document: DeviceScenarioDocument,
): boolean {
  if (hasV09UserFunctions(document)) {
    const hasFn1Bootstrap = document.scenario.initial.nodes.some((node) =>
      isStartRecordingFunctionBlock(node),
    );
    return !hasFn1Bootstrap;
  }

  const main = document.scenario.loops.main;
  const gateNode = main.nodes.find((node) => node.nodeKind === 'is-recording-window-full');
  if (gateNode === undefined) {
    return false;
  }
  const hasDirectRecorderToGate = main.edges.some(
    (edge) =>
      edge.kind === 'exec' &&
      edge.target === gateNode.id &&
      edge.targetHandle === 'exec-in' &&
      main.nodes.find((node) => node.id === edge.source)?.nodeKind === 'get-recorder',
  );
  if (!hasDirectRecorderToGate) {
    return false;
  }
  const hasInitialBootstrap = document.scenario.initial.nodes.some(
    (node) => node.id === 'node-start-recording-bootstrap-v08-2',
  );
  return !hasInitialBootstrap;
}
