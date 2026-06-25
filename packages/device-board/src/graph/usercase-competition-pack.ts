import type { DeviceScenarioDocument, ScenarioSubgraph } from '@membrana/core';
import { DEFAULT_COMPETITION_TIMEOUT_SEC } from '@membrana/core';

import { collapseSelectionToFunction } from './collapse-to-function.js';
import { stampCompetitionDocumentMeta } from './execution-policy.js';
import { serializeScenarioFunction } from './serialize-scenario-function.js';
import {
  deserializeScenarioSubgraph,
  serializeScenarioSubgraph,
} from './serialize-scenario-subgraph.js';
import type { UserCaseCommentGroupProfileId } from './usercase-comment-group-profiles.js';

export type CompetitionTeamId = 'alpha' | 'beta' | 'gamma';

type PackedScenarioFunction = DeviceScenarioDocument['scenario']['functions'][number];

interface CollapseSpec {
  readonly functionId: string;
  readonly functionName: string;
  readonly description?: string;
  readonly nodeIds: readonly string[];
}

type PackBranch = 'main' | 'onConnect';

const GATE_NODE_IDS = [
  'node-get-recorder-mqs3ir02-168',
  'node-is-recording-window-full-mqmo40ie-32',
  'node-stop-recording-mqmod4yf-35',
  'node-make-track-mqmcipn5-28',
] as const;

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

/** Bundled v2.0-async helpers that competition pack must keep (main tick GetAudioStream). */
const BUNDLED_ASYNC_V2_AUX_FUNCTION_IDS = ['fn-1', 'fn-3'] as const;

/** Bundled subgraph blocks kept on initial/main (StartRecording bootstrap + tick entry). */
const BUNDLED_ASYNC_V2_PRESERVE_BLOCK_IDS = [
  'fn-1-block',
  'fn-3-block',
  'fn-3-block-2',
] as const;

const RECORDING_WINDOW_FULL_NODE_ID = 'node-is-recording-window-full-mqmo40ie-32';
const STOP_RECORDING_NODE_ID = 'node-stop-recording-mqmod4yf-35';
const MAKE_TRACK_NODE_ID = 'node-make-track-mqmcipn5-28';
/** Main-loop collect-samples + external GetRecorder (outside collapsed gate). */
const COLLECT_SAMPLES_NODE_ID = 'node-collect-samples-mqs2lopv-164';
const MAIN_LOOP_GET_RECORDER_NODE_ID = 'node-get-recorder-mqs6hyo6-171';
const INITIAL_START_STREAMING_NODE_ID = 'node-start-streaming-mql556hh-49';
const FN1_BLOCK_ID = 'fn-1-block';
const FN3_BLOCK_2_ID = 'fn-3-block-2';
const MAIN_DEVICE_GLOBAL_FOR_FN1_ID = 'node-device-global-mqs5ibg8-126';
const START_ASYNC_JOB_NODE_ID = 'node-start-async-job-v20';

/** Collapsed async exec on main (Beta upload-pipeline, Gamma live-bundle). */
function isCollapsedAsyncExecBlock(node: { readonly blockKind?: string; readonly id: string }): boolean {
  return (
    node.blockKind === 'subgraph' &&
    (node.id.includes('async-upload-pipeline') || node.id.includes('async-live-bundle'))
  );
}

function findCollapsedAsyncExecTarget(
  main: DeviceScenarioDocument['scenario']['loops']['main'],
): { readonly id: string } | undefined {
  return (
    main.nodes.find((node) => node.id === START_ASYNC_JOB_NODE_ID) ??
    main.nodes.find(isCollapsedAsyncExecBlock)
  );
}

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

function getMainTickExecTargets(subgraph: ScenarioSubgraph): ReadonlySet<string> {
  return new Set(
    subgraph.edges
      .filter((edge) => edge.kind === 'exec' && edge.source === subgraph.entry)
      .map((edge) => edge.target),
  );
}

function preservedBundledAsyncV2Functions(
  baseDocument: DeviceScenarioDocument,
  competitionBase?: string,
): readonly PackedScenarioFunction[] {
  if (competitionBase !== 'v2.0-async') {
    return [];
  }
  const keep = new Set<string>(BUNDLED_ASYNC_V2_AUX_FUNCTION_IDS);
  return baseDocument.scenario.functions.filter((fn) => keep.has(fn.id));
}

function hasScenarioEdge(
  edges: ScenarioSubgraph['edges'],
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
): boolean {
  return edges.some(
    (edge) =>
      edge.source === source &&
      edge.sourceHandle === sourceHandle &&
      edge.target === target &&
      edge.targetHandle === targetHandle,
  );
}

function repairRecordingGateFunctionExecSpurious(fn: PackedScenarioFunction): PackedScenarioFunction {
  if (!fn.id.endsWith('-recording-gate')) {
    return fn;
  }
  const inputNodeId = `${fn.id}-input`;
  const edges = fn.edges.filter(
    (edge) =>
      !(
        edge.kind === 'exec' &&
        edge.source === inputNodeId &&
        edge.sourceHandle === 'exec-in' &&
        edge.target !== RECORDING_WINDOW_FULL_NODE_ID
      ),
  );
  return { ...fn, edges };
}

function repairRecordingGateFunctionExecTrue(fn: PackedScenarioFunction): PackedScenarioFunction {
  if (!fn.id.endsWith('-recording-gate')) {
    return fn;
  }
  const outputNodeId = `${fn.id}-output`;
  const edges = [...fn.edges];

  const addExec = (source: string, sourceHandle: string, target: string, targetHandle: string): void => {
    if (!hasScenarioEdge(edges, source, sourceHandle, target, targetHandle)) {
      edges.push({
        kind: 'exec',
        source,
        sourceHandle,
        target,
        targetHandle,
      });
    }
  };

  addExec(
    RECORDING_WINDOW_FULL_NODE_ID,
    'exec-true-out',
    STOP_RECORDING_NODE_ID,
    'exec-in',
  );
  addExec(STOP_RECORDING_NODE_ID, 'exec-out', MAKE_TRACK_NODE_ID, 'exec-in');
  addExec(MAKE_TRACK_NODE_ID, 'exec-out', outputNodeId, 'exec-out');

  const outputPins = [...fn.outputPins];
  for (const pin of [
    { id: 'exec-out', name: 'exec-out', kind: 'exec' as const },
    { id: 'exec-true-out', name: 'exec-true-out', kind: 'exec' as const },
  ]) {
    if (!outputPins.some((existing) => existing.id === pin.id)) {
      outputPins.push(pin);
    }
  }

  addExec(RECORDING_WINDOW_FULL_NODE_ID, 'exec-true-out', outputNodeId, 'exec-true-out');

  return { ...fn, edges, outputPins };
}

function repairAsyncV2InitialStartRecording(document: DeviceScenarioDocument): DeviceScenarioDocument {
  const initial = document.scenario.initial;
  const fn1Block = initial.nodes.find((node) => node.id === FN1_BLOCK_ID);
  const startStreaming = initial.nodes.find((node) => node.id === INITIAL_START_STREAMING_NODE_ID);
  if (!fn1Block || !startStreaming) {
    return document;
  }

  const edges = [...initial.edges];
  const addExec = (source: string, sourceHandle: string, target: string, targetHandle: string): void => {
    if (!hasScenarioEdge(edges, source, sourceHandle, target, targetHandle)) {
      edges.push({ kind: 'exec', source, sourceHandle, target, targetHandle });
    }
  };

  addExec(INITIAL_START_STREAMING_NODE_ID, 'exec-out', FN1_BLOCK_ID, 'exec-in');
  if (!hasScenarioEdge(edges, 'initial-event', 'device', FN1_BLOCK_ID, 'device')) {
    edges.push({
      kind: 'data',
      source: 'initial-event',
      sourceHandle: 'device',
      target: FN1_BLOCK_ID,
      targetHandle: 'device',
      dataType: 'DeviceRef',
    });
  }
  if (
    !hasScenarioEdge(
      edges,
      INITIAL_START_STREAMING_NODE_ID,
      'stream',
      FN1_BLOCK_ID,
      'stream',
    )
  ) {
    edges.push({
      kind: 'data',
      source: INITIAL_START_STREAMING_NODE_ID,
      sourceHandle: 'stream',
      target: FN1_BLOCK_ID,
      targetHandle: 'stream',
      dataType: 'AudioStreamRef',
    });
  }

  return {
    ...document,
    scenario: {
      ...document.scenario,
      initial: { ...initial, edges },
    },
  };
}

function repairAsyncV2MainLoopWiring(document: DeviceScenarioDocument): DeviceScenarioDocument {
  const main = document.scenario.loops.main;
  const sequenceNode = main.nodes.find((node) => node.nodeKind === 'sequence');
  const gateBlock = main.nodes.find(
    (node) => node.blockKind === 'subgraph' && node.id.includes('recording-gate-block'),
  );
  if (!sequenceNode || !gateBlock) {
    return document;
  }

  const collectSamples = main.nodes.find((node) => node.id === COLLECT_SAMPLES_NODE_ID);
  const mainGetRecorder = main.nodes.find((node) => node.id === MAIN_LOOP_GET_RECORDER_NODE_ID);

  let edges = [...main.edges].filter(
    (edge) =>
      !(
        edge.kind === 'exec' &&
        edge.source === sequenceNode.id &&
        (edge.sourceHandle === 'then-0' || edge.sourceHandle === 'then-1') &&
        edge.target === gateBlock.id
      ),
  );

  // Collapse rewires internal GetRecorder → gate output pin; collect-samples runs before
  // the gate subgraph and must pull RecorderRef from main-loop GetRecorder instead.
  if (collectSamples) {
    edges = edges.filter(
      (edge) =>
        !(
          edge.kind === 'data' &&
          edge.source === gateBlock.id &&
          edge.sourceHandle === 'recorder' &&
          edge.target === collectSamples.id &&
          edge.targetHandle === 'recorder'
        ),
    );
    if (
      mainGetRecorder &&
      !hasScenarioEdge(
        edges,
        mainGetRecorder.id,
        'recorder',
        collectSamples.id,
        'recorder',
      )
    ) {
      edges.push({
        kind: 'data',
        source: mainGetRecorder.id,
        sourceHandle: 'recorder',
        target: collectSamples.id,
        targetHandle: 'recorder',
        dataType: 'RecorderRef',
      });
    }
  }

  const asyncUploadExecTarget = findCollapsedAsyncExecTarget(main);

  // Collapsed gate returns exec-out (make-track path), not exec-true-out. Flat MVP wired
  // window-full → sequence; async-v2 must use gate exec-out → sequence → then-0 async upload.
  // Beta/Gamma collapse upload into fn-*-async-*-block — strip direct gate→upload exec
  // (first-match successor would skip sequence, trends publish, and then-3 restart).
  edges = edges.filter(
    (edge) =>
      !(
        edge.kind === 'exec' &&
        edge.source === gateBlock.id &&
        ((edge.sourceHandle === 'exec-true-out' && edge.target === sequenceNode.id) ||
          (asyncUploadExecTarget !== undefined &&
            edge.sourceHandle === 'exec-out' &&
            edge.target === asyncUploadExecTarget.id))
      ),
  );

  if (!hasScenarioEdge(edges, gateBlock.id, 'exec-out', sequenceNode.id, 'exec-in')) {
    edges.push({
      kind: 'exec',
      source: gateBlock.id,
      sourceHandle: 'exec-out',
      target: sequenceNode.id,
      targetHandle: 'exec-in',
    });
  }

  if (
    asyncUploadExecTarget !== undefined &&
    !hasScenarioEdge(
      edges,
      sequenceNode.id,
      'then-0',
      asyncUploadExecTarget.id,
      'exec-in',
    )
  ) {
    edges.push({
      kind: 'exec',
      source: sequenceNode.id,
      sourceHandle: 'then-0',
      target: asyncUploadExecTarget.id,
      targetHandle: 'exec-in',
    });
  }

  const fn3Block2 = main.nodes.find((node) => node.id === FN3_BLOCK_2_ID);
  const fn1MainBlock = main.nodes.find((node) => node.id === FN1_BLOCK_ID);
  if (fn3Block2 && sequenceNode) {
    if (!hasScenarioEdge(edges, sequenceNode.id, 'then-3', fn3Block2.id, 'exec-in')) {
      edges.push({
        kind: 'exec',
        source: sequenceNode.id,
        sourceHandle: 'then-3',
        target: fn3Block2.id,
        targetHandle: 'exec-in',
      });
    }
  }
  if (fn3Block2 && fn1MainBlock) {
    if (!hasScenarioEdge(edges, fn3Block2.id, 'exec-out', fn1MainBlock.id, 'exec-in')) {
      edges.push({
        kind: 'exec',
        source: fn3Block2.id,
        sourceHandle: 'exec-out',
        target: fn1MainBlock.id,
        targetHandle: 'exec-in',
      });
    }
    if (
      !hasScenarioEdge(edges, fn3Block2.id, 'data-out', fn1MainBlock.id, 'stream')
    ) {
      edges.push({
        kind: 'data',
        source: fn3Block2.id,
        sourceHandle: 'data-out',
        target: fn1MainBlock.id,
        targetHandle: 'stream',
        dataType: 'AudioStreamRef',
      });
    }
    if (
      !hasScenarioEdge(
        edges,
        MAIN_DEVICE_GLOBAL_FOR_FN1_ID,
        'device',
        fn1MainBlock.id,
        'device',
      )
    ) {
      edges.push({
        kind: 'data',
        source: MAIN_DEVICE_GLOBAL_FOR_FN1_ID,
        sourceHandle: 'device',
        target: fn1MainBlock.id,
        targetHandle: 'device',
        dataType: 'DeviceRef',
      });
    }
  }

  const functions = document.scenario.functions
    .map(repairRecordingGateFunctionExecSpurious)
    .map(repairRecordingGateFunctionExecTrue);

  return {
    ...document,
    scenario: {
      ...document.scenario,
      functions,
      loops: {
        ...document.scenario.loops,
        main: { ...main, edges },
      },
    },
  };
}

function stripBundledUserFunctionBlocks(
  document: DeviceScenarioDocument,
  options?: {
    preserveMainTickEntryTargets?: ReadonlySet<string>;
    preserveBundledBlockIds?: ReadonlySet<string>;
  },
): DeviceScenarioDocument {
  const pruneSubgraph = (subgraph: ScenarioSubgraph): ScenarioSubgraph => {
    const preserve = new Set<string>([
      ...(options?.preserveBundledBlockIds ?? []),
      ...(options?.preserveMainTickEntryTargets ?? []),
    ]);
    const removed = new Set(
      subgraph.nodes
        .filter(
          (node) =>
            node.blockKind === 'subgraph' &&
            (node.id.includes('fn-') || node.label?.includes('::fn-') === true) &&
            !preserve.has(node.id),
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
}

function packMvpUserCaseForTeamInternal(
  team: CompetitionTeamId,
  baseDocument: DeviceScenarioDocument,
  options: PackTeamOptions = {},
): DeviceScenarioDocument {
  const meta = (options.metaProfile ?? TEAM_META)[team];
  const preserveMainTick =
    options.competitionBase === 'v2.0-async'
      ? getMainTickExecTargets(baseDocument.scenario.loops.main)
      : undefined;
  const preserveBundledBlocks =
    options.competitionBase === 'v2.0-async'
      ? new Set<string>(BUNDLED_ASYNC_V2_PRESERVE_BLOCK_IDS)
      : undefined;
  const strippedBase = stripBundledUserFunctionBlocks(baseDocument, {
    preserveMainTickEntryTargets: preserveMainTick,
    preserveBundledBlockIds: preserveBundledBlocks,
  });
  const bundledHelpers = preservedBundledAsyncV2Functions(baseDocument, options.competitionBase);
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
      functions: [...bundledHelpers],
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

  if (options.competitionBase === 'v2.0-async') {
    document = repairAsyncV2InitialStartRecording(document);
    document = repairAsyncV2MainLoopWiring(document);
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
