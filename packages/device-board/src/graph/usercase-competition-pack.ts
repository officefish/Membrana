import type { DeviceScenarioDocument, ScenarioGraphEdge, ScenarioGraphNode, ScenarioSubgraph } from '@membrana/core';
import { DEFAULT_COMPETITION_TIMEOUT_SEC } from '@membrana/core';

import { parseSubgraphFunctionId } from './subgraph-ref.js';
import { collapseSelectionToFunction } from './collapse-to-function.js';
import { stampCompetitionDocumentMeta } from './execution-policy.js';
import { serializeScenarioFunction } from './serialize-scenario-function.js';
import {
  deserializeScenarioSubgraph,
  serializeScenarioSubgraph,
} from './serialize-scenario-subgraph.js';
import type { UserCaseCommentGroupProfileId } from './usercase-comment-group-profiles.js';

export type CompetitionTeamId = 'alpha' | 'beta' | 'gamma';

interface CollapseSpec {
  readonly functionId: string;
  readonly functionName: string;
  readonly description?: string;
  readonly nodeIds: readonly string[];
}

type PackBranch = 'main' | 'onConnect';

const GATE_CHECK_NODE_IDS = [
  'node-get-recorder-mqs3ir02-168',
  'node-is-recording-window-full-mqmo40ie-32',
] as const;

const GATE_NODE_IDS = [
  ...GATE_CHECK_NODE_IDS,
  'node-stop-recording-mqmod4yf-35',
  'node-make-track-mqmcipn5-28',
] as const;

const RECORDING_WINDOW_FULL_NODE_ID = 'node-is-recording-window-full-mqmo40ie-32';
const ASYNC_V2_SEQUENCE_NODE_ID = 'node-sequence-gate-v20-async';
const ASYNC_V2_START_ASYNC_JOB_NODE_ID = 'node-start-async-job-v20';

const TRENDS_PUBLISH_NODE_IDS = [
  'node-flush-spectral-analyser-mqs6tcs6-172',
  'node-make-fft-trends-analysis-mqs6vdme-174',
  'node-get-reporter-mqs5wkzi-169',
  'node-make-report-from-analysis-mqma356z-34',
  'node-publish-report-mqma49xv-35',
] as const;

const ONCONNECT_BOOTSTRAP_NODE_IDS = [
  'node-is-valid-mqm97w5v-17',
  'node-get-journal-mqm98hvn-18',
  'node-variable-set-var-JournalRef-mqm9dl4a-6-mqm9du8z-8',
] as const;

/** Порядок: leaf → root (tail collapse first). */
const TEAM_MAIN_COLLAPSES: Readonly<Record<CompetitionTeamId, readonly CollapseSpec[]>> = {
  alpha: [
    {
      functionId: 'fn-alpha-observation-tick',
      functionName: 'Observation tick',
      description: 'Trends classify + PublishReport (trends-fft/v0.1)',
      nodeIds: TRENDS_PUBLISH_NODE_IDS,
    },
    {
      functionId: 'fn-alpha-recording-gate',
      functionName: 'Recording gate',
      description: '5 s WAV window → MakeTrack → restart',
      nodeIds: GATE_NODE_IDS,
    },
  ],
  beta: [
    {
      functionId: 'fn-beta-trends-publish',
      functionName: 'Trends publish',
      description: 'Flush FFT → classify → MakeReportFromAnalysis → PublishReport',
      nodeIds: TRENDS_PUBLISH_NODE_IDS,
    },
    {
      functionId: 'fn-beta-recording-gate',
      functionName: 'Recording gate',
      description: '5 s window gate + MakeTrack',
      nodeIds: GATE_NODE_IDS,
    },
  ],
  gamma: [
    {
      functionId: 'fn-gamma-trends-publish',
      functionName: 'Анализ · публикация',
      description: 'FFT trends classify + PublishReport',
      nodeIds: TRENDS_PUBLISH_NODE_IDS,
    },
    {
      functionId: 'fn-gamma-recording-gate',
      functionName: 'Захват · окно записи',
      description: '5 s WAV gate + MakeTrack',
      nodeIds: GATE_NODE_IDS,
    },
  ],
};

const TEAM_ONCONNECT_COLLAPSES: Readonly<Partial<Record<CompetitionTeamId, readonly CollapseSpec[]>>> =
  {
    alpha: [
      {
        functionId: 'fn-alpha-bootstrap',
        functionName: 'Bootstrap journal',
        description: 'onConnect: server → journal1 ref',
        nodeIds: ONCONNECT_BOOTSTRAP_NODE_IDS,
      },
    ],
  };

const TEAM_META: Readonly<
  Record<
    CompetitionTeamId,
    { readonly title: string; readonly description: string; readonly commentGroupProfile: UserCaseCommentGroupProfileId }
  >
> = {
  alpha: {
    title: 'MVP microphone · Alpha (Live Observation Pipeline)',
    description:
      'Team Alpha: operator journey — три акта, observation + gate functions, RU comment groups.',
    commentGroupProfile: 'alpha',
  },
  beta: {
    title: 'MVP microphone · Beta (Measured modular UserCase)',
    description: 'Team Beta: 3 modular functions, verify-layout metrics.',
    commentGroupProfile: 'beta',
  },
  gamma: {
    title: 'MVP microphone · Gamma (Poster UserCase)',
    description: 'Team Gamma: poster layout ①–⑤, gate + trends functions.',
    commentGroupProfile: 'gamma',
  },
};

export interface TeamPackLayoutMetrics {
  readonly mainScenarioNodeCount: number;
  readonly mainSubgraphBlockCount: number;
  readonly functionCount: number;
  readonly commentGroupCount: number;
  readonly execSpanPx: number;
}

/**
 * Bundled MVP user functions kept on main after team pack (not replaced by team collapses).
 * `fn-3` GetAudioStream wires `main-on-tick` → sample/FFT pipeline — stripping it orphans the loop entry.
 * `fn-1` StartRecording bootstrap on onStart + gate restart on main — without it recorder window never fills.
 */
const PRESERVED_BUNDLED_FUNCTION_IDS = new Set(['fn-3', 'fn-1']);

function isBundledUserFunctionSubgraphBlock(node: ScenarioGraphNode): boolean {
  return (
    node.blockKind === 'subgraph' &&
    (node.id.includes('fn-') || node.label?.includes('::fn-') === true)
  );
}

function isPreservedBundledUserFunctionBlock(node: ScenarioGraphNode): boolean {
  if (!isBundledUserFunctionSubgraphBlock(node)) {
    return false;
  }
  const functionId = parseSubgraphFunctionId(node);
  return functionId !== null && PRESERVED_BUNDLED_FUNCTION_IDS.has(functionId);
}

function preservedBundledFunctions(document: DeviceScenarioDocument) {
  return document.scenario.functions.filter((fn) => PRESERVED_BUNDLED_FUNCTION_IDS.has(fn.id));
}

function stripBundledUserFunctionBlocks(document: DeviceScenarioDocument): DeviceScenarioDocument {
  const pruneSubgraph = (subgraph: ScenarioSubgraph): ScenarioSubgraph => {
    const removed = new Set(
      subgraph.nodes
        .filter(
          (node) => isBundledUserFunctionSubgraphBlock(node) && !isPreservedBundledUserFunctionBlock(node),
        )
        .map((node) => node.id),
    );
    if (removed.size === 0) {
      return subgraph;
    }
    return {
      ...subgraph,
      nodes: subgraph.nodes.filter((node) => !removed.has(node.id)),
      edges: subgraph.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)),
    };
  };

  return {
    ...document,
    scenario: {
      ...document.scenario,
      initial: pruneSubgraph(document.scenario.initial),
      loops: {
        ...document.scenario.loops,
        main: pruneSubgraph(document.scenario.loops.main),
      },
    },
  };
}

/** @internal Exported for pack regression tests (main loop entry wiring). */
export function stripBundledUserFunctionBlocksForTest(
  document: DeviceScenarioDocument,
): DeviceScenarioDocument {
  return stripBundledUserFunctionBlocks(document);
}

function readSubgraph(document: DeviceScenarioDocument, branch: PackBranch): ScenarioSubgraph {
  return branch === 'main' ? document.scenario.loops.main : document.scenario.onConnect;
}

function writeSubgraph(
  document: DeviceScenarioDocument,
  branch: PackBranch,
  subgraph: ScenarioSubgraph,
): DeviceScenarioDocument {
  if (branch === 'main') {
    return {
      ...document,
      scenario: {
        ...document.scenario,
        loops: { ...document.scenario.loops, main: subgraph },
      },
    };
  }
  return {
    ...document,
    scenario: { ...document.scenario, onConnect: subgraph },
  };
}

function applyBranchCollapse(
  document: DeviceScenarioDocument,
  branch: PackBranch,
  collapse: CollapseSpec,
): DeviceScenarioDocument {
  const variables = document.scenario.variables;
  const subgraph = readSubgraph(document, branch);
  const { nodes, edges } = deserializeScenarioSubgraph(subgraph, variables, document.scenario.functions);

  const result = collapseSelectionToFunction({
    selectedNodeIds: [...collapse.nodeIds],
    branchNodes: nodes,
    branchEdges: edges,
    functionId: collapse.functionId,
    functionName: collapse.functionName,
  });

  if (!result.ok) {
    throw new Error(`Collapse ${collapse.functionId} on ${branch} failed: ${result.message}`);
  }

  const newSubgraph = serializeScenarioSubgraph(subgraph.entry, result.branchNodes, result.branchEdges);
  const fn = serializeScenarioFunction({
    id: result.functionDraft.id,
    name: result.functionDraft.name,
    entry: result.functionDraft.entry,
    description: collapse.description,
    inputPins: result.functionDraft.inputPins,
    outputPins: result.functionDraft.outputPins,
    nodes: result.functionDraft.nodes,
    edges: result.functionDraft.edges,
  });

  const updated = writeSubgraph(document, branch, newSubgraph);
  return {
    ...updated,
    scenario: {
      ...updated.scenario,
      functions: [...document.scenario.functions, fn],
    },
  };
}

/** Subgraph function blocks в latent Then требуют `supportsAsync: true` (AP v1). */
function scenarioGraphEdgeKey(edge: ScenarioGraphEdge): string {
  return `${edge.source}:${edge.sourceHandle}->${edge.target}:${edge.targetHandle}`;
}

type PreservedWiringBranch = 'initial' | 'main';

function readPreservedWiringSubgraph(
  document: DeviceScenarioDocument,
  branch: PreservedWiringBranch,
): ScenarioSubgraph {
  return branch === 'initial' ? document.scenario.initial : document.scenario.loops.main;
}

function writePreservedWiringSubgraph(
  document: DeviceScenarioDocument,
  branch: PreservedWiringBranch,
  subgraph: ScenarioSubgraph,
): DeviceScenarioDocument {
  if (branch === 'initial') {
    return {
      ...document,
      scenario: { ...document.scenario, initial: subgraph },
    };
  }
  return {
    ...document,
    scenario: {
      ...document.scenario,
      loops: { ...document.scenario.loops, main: subgraph },
    },
  };
}

/** Team collapses can drop preserved bundled blocks — restore nodes/edges from pre-collapse graph. */
function restorePreservedBranchWiring(
  document: DeviceScenarioDocument,
  strippedBase: DeviceScenarioDocument,
  branch: PreservedWiringBranch,
): DeviceScenarioDocument {
  const sourceSubgraph = readPreservedWiringSubgraph(strippedBase, branch);
  const packedSubgraph = readPreservedWiringSubgraph(document, branch);
  const sourceNodesById = new Map(sourceSubgraph.nodes.map((node) => [node.id, node]));

  const touchesPreservedBlock = (edge: ScenarioGraphEdge): boolean => {
    const sourceNode = sourceNodesById.get(edge.source);
    const targetNode = sourceNodesById.get(edge.target);
    return (
      (sourceNode !== undefined && isPreservedBundledUserFunctionBlock(sourceNode)) ||
      (targetNode !== undefined && isPreservedBundledUserFunctionBlock(targetNode))
    );
  };

  const missingNodes = sourceSubgraph.nodes.filter(
    (node) =>
      isPreservedBundledUserFunctionBlock(node) &&
      !packedSubgraph.nodes.some((packedNode) => packedNode.id === node.id),
  );

  const packedEdgeKeys = new Set(packedSubgraph.edges.map(scenarioGraphEdgeKey));
  const missingEdges = sourceSubgraph.edges.filter((edge) => {
    if (packedEdgeKeys.has(scenarioGraphEdgeKey(edge))) {
      return false;
    }
    return edge.source === sourceSubgraph.entry || touchesPreservedBlock(edge);
  });

  if (missingNodes.length === 0 && missingEdges.length === 0) {
    return document;
  }

  return writePreservedWiringSubgraph(document, branch, {
    ...packedSubgraph,
    nodes: [...packedSubgraph.nodes, ...missingNodes],
    edges: [...packedSubgraph.edges, ...missingEdges],
  });
}

function restorePreservedBundledWiring(
  document: DeviceScenarioDocument,
  strippedBase: DeviceScenarioDocument,
): DeviceScenarioDocument {
  let updated = restorePreservedBranchWiring(document, strippedBase, 'initial');
  updated = restorePreservedBranchWiring(updated, strippedBase, 'main');
  return updated;
}

function findRecordingGateBlockId(main: ScenarioSubgraph): string | null {
  const block = main.nodes.find(
    (node) => node.blockKind === 'subgraph' && node.id.includes('recording-gate-block'),
  );
  return block?.id ?? null;
}

/**
 * Collapsed recording-gate functions can fan `exec-in` to stop/make-track in parallel with the
 * window check. Repair to: check → (true) stop → make-track → exec-out | (false) exec-false-out.
 */
function repairCollapsedRecordingGateFunctions(
  document: DeviceScenarioDocument,
): DeviceScenarioDocument {
  const gateFunctionIds = new Set(
    document.scenario.functions
      .filter((fn) => fn.id.endsWith('-recording-gate'))
      .map((fn) => fn.id),
  );
  if (gateFunctionIds.size === 0) {
    return document;
  }

  const functions = document.scenario.functions.map((fn) => {
    if (!gateFunctionIds.has(fn.id)) {
      return fn;
    }

    const inputId = fn.entry;
    const outputNode = fn.nodes.find((node) => node.nodeKind === 'function-output');
    const windowNode = fn.nodes.find((node) => node.nodeKind === 'is-recording-window-full');
    const stopNode = fn.nodes.find((node) => node.nodeKind === 'stop-recording');
    const makeTrackNode = fn.nodes.find((node) => node.nodeKind === 'make-track');
    if (
      outputNode === undefined ||
      windowNode === undefined ||
      stopNode === undefined ||
      makeTrackNode === undefined
    ) {
      return fn;
    }

    const keepEdge = (edge: (typeof fn.edges)[number]): boolean => {
      if (edge.kind !== 'exec') {
        return true;
      }
      if (edge.source === inputId && edge.target !== windowNode.id) {
        return false;
      }
      if (edge.source === windowNode.id && edge.sourceHandle === 'exec-true-out') {
        return edge.target === stopNode.id;
      }
      return true;
    };

    const edges = fn.edges.filter(keepEdge);
    const edgeKey = (edge: (typeof fn.edges)[number]): string =>
      `${edge.kind}:${edge.source}:${edge.sourceHandle}->${edge.target}:${edge.targetHandle}`;

    const addEdge = (edge: (typeof fn.edges)[number]): void => {
      const key = edgeKey(edge);
      if (!edges.some((item) => edgeKey(item) === key)) {
        edges.push(edge);
      }
    };

    addEdge({
      kind: 'exec',
      source: inputId,
      sourceHandle: 'exec-in',
      target: windowNode.id,
      targetHandle: 'exec-in',
    });
    addEdge({
      kind: 'exec',
      source: windowNode.id,
      sourceHandle: 'exec-true-out',
      target: stopNode.id,
      targetHandle: 'exec-in',
    });
    addEdge({
      kind: 'exec',
      source: stopNode.id,
      sourceHandle: 'exec-out',
      target: makeTrackNode.id,
      targetHandle: 'exec-in',
    });
    addEdge({
      kind: 'exec',
      source: makeTrackNode.id,
      sourceHandle: 'exec-out',
      target: outputNode.id,
      targetHandle: 'exec-out',
    });

    return { ...fn, edges };
  });

  return {
    ...document,
    scenario: { ...document.scenario, functions },
  };
}

/**
 * v2.0-async: wire gate block exec-out → Sequence; drop mistaken then-0/1 → gate exec-in.
 */
function restoreAsyncV2RecordingGateHotPath(
  document: DeviceScenarioDocument,
  strippedBase: DeviceScenarioDocument,
): DeviceScenarioDocument {
  const packedMain = document.scenario.loops.main;
  const gateBlockId = findRecordingGateBlockId(packedMain);
  if (gateBlockId === null) {
    return document;
  }

  const hotPathEdge: ScenarioGraphEdge = {
    kind: 'exec',
    source: gateBlockId,
    sourceHandle: 'exec-out',
    target: ASYNC_V2_SEQUENCE_NODE_ID,
    targetHandle: 'exec-in',
  };

  const filteredEdges = packedMain.edges.filter(
    (edge) =>
      !(
        (edge.kind === 'exec' &&
          edge.target === gateBlockId &&
          edge.targetHandle === 'exec-in' &&
          edge.source === ASYNC_V2_SEQUENCE_NODE_ID &&
          (edge.sourceHandle === 'then-0' || edge.sourceHandle === 'then-1')) ||
        (edge.kind === 'exec' &&
          edge.source === gateBlockId &&
          edge.sourceHandle === 'exec-out' &&
          edge.target === 'node-start-async-job-v20') ||
        scenarioGraphEdgeKey(edge) === scenarioGraphEdgeKey(hotPathEdge)
      ),
  );

  const sourceMain = strippedBase.scenario.loops.main;
  const hadFlatHotPath = sourceMain.edges.some(
    (edge) =>
      edge.kind === 'exec' &&
      edge.source === RECORDING_WINDOW_FULL_NODE_ID &&
      edge.sourceHandle === 'exec-true-out' &&
      edge.target === ASYNC_V2_SEQUENCE_NODE_ID,
  );
  if (!hadFlatHotPath) {
    return {
      ...document,
      scenario: {
        ...document.scenario,
        loops: {
          ...document.scenario.loops,
          main: { ...packedMain, edges: filteredEdges },
        },
      },
    };
  }

  return {
    ...document,
    scenario: {
      ...document.scenario,
      loops: {
        ...document.scenario.loops,
        main: {
          ...packedMain,
          edges: [...filteredEdges, hotPathEdge],
        },
      },
    },
  };
}

/**
 * v2.0-async: stop/make-track live inside collapsed gate; flat Sequence then-0/1 orphans.
 * Wire then-0 → StartAsyncJob (track data pin already on gate-block → async job).
 */
function restoreAsyncV2SequenceUploadWiring(document: DeviceScenarioDocument): DeviceScenarioDocument {
  const packedMain = document.scenario.loops.main;
  const hasAsyncJob = packedMain.nodes.some((node) => node.id === ASYNC_V2_START_ASYNC_JOB_NODE_ID);
  if (!hasAsyncJob) {
    return document;
  }

  const uploadThenEdge: ScenarioGraphEdge = {
    kind: 'exec',
    source: ASYNC_V2_SEQUENCE_NODE_ID,
    sourceHandle: 'then-0',
    target: ASYNC_V2_START_ASYNC_JOB_NODE_ID,
    targetHandle: 'exec-in',
  };

  const filteredEdges = packedMain.edges.filter(
    (edge) =>
      !(
        edge.kind === 'exec' &&
        edge.source === ASYNC_V2_SEQUENCE_NODE_ID &&
        (edge.sourceHandle === 'then-0' || edge.sourceHandle === 'then-1') &&
        edge.target !== ASYNC_V2_START_ASYNC_JOB_NODE_ID
      ),
  );

  const packedEdgeKeys = new Set(filteredEdges.map(scenarioGraphEdgeKey));
  if (packedEdgeKeys.has(scenarioGraphEdgeKey(uploadThenEdge))) {
    if (filteredEdges.length === packedMain.edges.length) {
      return document;
    }
    return {
      ...document,
      scenario: {
        ...document.scenario,
        loops: {
          ...document.scenario.loops,
          main: { ...packedMain, edges: filteredEdges },
        },
      },
    };
  }

  return {
    ...document,
    scenario: {
      ...document.scenario,
      loops: {
        ...document.scenario.loops,
        main: {
          ...packedMain,
          edges: [...filteredEdges, uploadThenEdge],
        },
      },
    },
  };
}

function markMainSubgraphBlocksSupportsAsync(
  document: DeviceScenarioDocument,
): DeviceScenarioDocument {
  const main = document.scenario.loops.main;
  const nodes = main.nodes.map((node) =>
    node.blockKind === 'subgraph' ? { ...node, supportsAsync: true as const } : node,
  );
  if (nodes === main.nodes) {
    return document;
  }
  return {
    ...document,
    scenario: {
      ...document.scenario,
      loops: { ...document.scenario.loops, main: { ...main, nodes } },
    },
  };
}

const TEAM_ASYNC_V2_PRE_COLLAPSES: Readonly<Record<CompetitionTeamId, readonly CollapseSpec[]>> = {
  alpha: [
    {
      functionId: 'fn-alpha-async-detached-report',
      functionName: 'Detached drone report',
      description: 'on-async-resolved → MakeReportFromTrack (detached path)',
      nodeIds: ['node-on-async-resolved-v20', 'node-make-report-from-track-mqs54kgw-177'],
    },
  ],
  beta: [
    {
      functionId: 'fn-beta-async-upload-pipeline',
      functionName: 'Upload pipeline',
      description: 'StartAsyncJob → detached MakeReportFromTrack',
      nodeIds: [
        'node-start-async-job-v20',
        'node-on-async-resolved-v20',
        'node-make-report-from-track-mqs54kgw-177',
      ],
    },
  ],
  gamma: [
    {
      functionId: 'fn-gamma-async-live-bundle',
      functionName: 'Async upload bundle',
      description: 'Upload job + detached track report (poster strip)',
      nodeIds: [
        'node-start-async-job-v20',
        'node-on-async-resolved-v20',
        'node-make-report-from-track-mqs54kgw-177',
      ],
    },
  ],
};

const TEAM_ASYNC_V2_META: Readonly<
  Record<
    CompetitionTeamId,
    { readonly title: string; readonly description: string; readonly commentGroupProfile: UserCaseCommentGroupProfileId }
  >
> = {
  alpha: {
    title: 'MVP microphone · Alpha (Live Observation Pipeline, async v2)',
    description:
      'Team Alpha async v2: operator journey + Act IIb async narrative; latent Sequence visible.',
    commentGroupProfile: 'alpha',
  },
  beta: {
    title: 'MVP microphone · Beta (Measured modular UserCase, async v2)',
    description: 'Team Beta async v2: modular upload pipeline function + orchestrator.',
    commentGroupProfile: 'beta',
  },
  gamma: {
    title: 'MVP microphone · Gamma (Poster UserCase, async v2)',
    description: 'Team Gamma async v2: poster ①–⑥, async bundle collapsed.',
    commentGroupProfile: 'gamma',
  },
};

interface PackTeamOptions {
  readonly preMainCollapses?: readonly CollapseSpec[];
  readonly metaProfile?: typeof TEAM_META;
  readonly competitionBase?: string;
  readonly asyncV2?: boolean;
}

function packMvpUserCaseForTeamInternal(
  team: CompetitionTeamId,
  baseDocument: DeviceScenarioDocument,
  options: PackTeamOptions = {},
): DeviceScenarioDocument {
  const meta = (options.metaProfile ?? TEAM_META)[team];
  const strippedBase = stripBundledUserFunctionBlocks(baseDocument);
  const keptBundledFunctions = preservedBundledFunctions(strippedBase);
  let document: DeviceScenarioDocument = stampCompetitionDocumentMeta({
    ...structuredClone(strippedBase),
    meta: {
      ...strippedBase.meta,
      title: meta.title,
      exportedAt: new Date().toISOString(),
      commentGroupProfile: meta.commentGroupProfile,
      isCompetitionTemplate: true,
      executionPolicy: 'competition',
      competitionTimeoutSec: DEFAULT_COMPETITION_TIMEOUT_SEC,
      ...(options.competitionBase !== undefined ? { competitionBase: options.competitionBase } : {}),
    },
    scenario: {
      ...structuredClone(strippedBase.scenario),
      functions: keptBundledFunctions,
      commentGroups: [],
    },
  });

  for (const collapse of options.preMainCollapses ?? []) {
    document = applyBranchCollapse(document, 'main', collapse);
  }

  for (const collapse of TEAM_MAIN_COLLAPSES[team]) {
    document = applyBranchCollapse(document, 'main', collapse);
  }

  for (const collapse of TEAM_ONCONNECT_COLLAPSES[team] ?? []) {
    document = applyBranchCollapse(document, 'onConnect', collapse);
  }

  document = restorePreservedBundledWiring(document, strippedBase);
  document = repairCollapsedRecordingGateFunctions(document);
  if (options.asyncV2 === true) {
    document = restoreAsyncV2RecordingGateHotPath(document, strippedBase);
    document = restoreAsyncV2SequenceUploadWiring(document);
  }

  return markMainSubgraphBlocksSupportsAsync(document);
}

/**
 * Fork bundled MVP document with team-specific user functions (competition sprint).
 * Layout canon + comment groups применяются отдельно через `applyUserCaseLayoutCanon`.
 */
export function packMvpUserCaseForTeam(
  team: CompetitionTeamId,
  baseDocument: DeviceScenarioDocument,
): DeviceScenarioDocument {
  return packMvpUserCaseForTeamInternal(team, baseDocument);
}

/**
 * Async v2 competition pack: team-specific pre-collapses + `competitionBase: v2.0-async`.
 */
export function packMvpUserCaseForTeamAsyncV2(
  team: CompetitionTeamId,
  baseDocument: DeviceScenarioDocument,
): DeviceScenarioDocument {
  return packMvpUserCaseForTeamInternal(team, baseDocument, {
    preMainCollapses: TEAM_ASYNC_V2_PRE_COLLAPSES[team],
    metaProfile: TEAM_ASYNC_V2_META,
    competitionBase: 'v2.0-async',
    asyncV2: true,
  });
}

export function competitionUserCaseId(team: CompetitionTeamId): string {
  return `usercase-mvp-microphone-${team}`;
}

/** UserCase id for `comp-mvp-async-v2-2026-06-25` forks. */
export function competitionUserCaseIdAsyncV2(team: CompetitionTeamId): string {
  return `usercase-mvp-microphone-${team}-async-v2`;
}

/** Layout metrics для CONCEPT §Implementation (Team Beta). */
export function computeTeamPackLayoutMetrics(
  document: DeviceScenarioDocument,
): TeamPackLayoutMetrics {
  const main = document.scenario.loops.main;
  const scenarioNodes = main.nodes.filter(
    (node) => node.system !== true && node.nodeKind !== 'event' && node.nodeKind !== 'loop-repeat',
  );
  const subgraphBlocks = main.nodes.filter((node) => node.blockKind === 'subgraph');
  const xs = main.nodes.map((node) => node.position.x);
  return {
    mainScenarioNodeCount: scenarioNodes.length,
    mainSubgraphBlockCount: subgraphBlocks.length,
    functionCount: document.scenario.functions.length,
    commentGroupCount: document.scenario.commentGroups?.length ?? 0,
    execSpanPx: xs.length === 0 ? 0 : Math.max(...xs) - Math.min(...xs),
  };
}
