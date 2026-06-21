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
  const nodes = [
    ...document.scenario.initial.nodes,
    ...document.scenario.loops.main.nodes,
    ...document.scenario.loops.alarm.nodes,
  ];
  return nodes.some((node) => legacyBlockKinds.has(node.blockKind));
}

/**
 * v0.9 main без MakeFftTrendsPolicy, без policy→analysis data-edge,
 * с legacy exec-hop через policy constructors или без MakeTrack→restart exec —
 * подменяем bundled MVP.
 */
export function needsFftTrendsPolicyConstructorMigration(
  document: DeviceScenarioDocument,
): boolean {
  const main = document.scenario.loops.main;
  const recordingPolicy = main.nodes.find((node) => node.nodeKind === 'make-recording-policy');
  const policyNode = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-policy');
  const analysisNode = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-analysis');
  const makeTrack = main.nodes.find((node) => node.nodeKind === 'make-track');
  const restartRecording = main.nodes.find((node) => node.id === 'node-start-recording-mqv07-36');
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
  const policyIds = new Set(
    [recordingPolicy?.id, policyNode.id].filter((id): id is string => id !== undefined),
  );
  const hasExecThroughPolicies = main.edges.some(
    (edge) =>
      edge.kind === 'exec' &&
      (policyIds.has(edge.source) || policyIds.has(edge.target)),
  );
  if (hasExecThroughPolicies) {
    return true;
  }
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
 * v0.8 gate без bootstrap StartRecording перед IsRecordingWindowFull —
 * запись никогда не стартует (exec-false → ∞ каждый tick).
 */
export function needsRecordingGateBootstrapMigration(
  document: DeviceScenarioDocument,
): boolean {
  const main = document.scenario.loops.main;
  const gateNode = main.nodes.find((node) => node.nodeKind === 'is-recording-window-full');
  if (gateNode === undefined) {
    return false;
  }
  return main.edges.some(
    (edge) =>
      edge.kind === 'exec' &&
      edge.target === gateNode.id &&
      edge.targetHandle === 'exec-in' &&
      main.nodes.find((node) => node.id === edge.source)?.nodeKind === 'get-recorder',
  );
}
