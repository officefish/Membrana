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

function stripBundledUserFunctionBlocks(document: DeviceScenarioDocument): DeviceScenarioDocument {
  const pruneSubgraph = (subgraph: ScenarioSubgraph): ScenarioSubgraph => {
    const removed = new Set(
      subgraph.nodes
        .filter(
          (node) =>
            node.blockKind === 'subgraph' &&
            (node.id.includes('fn-') || node.label?.includes('::fn-') === true),
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

/**
 * Fork bundled MVP document with team-specific user functions (competition sprint).
 * Layout canon + comment groups применяются отдельно через `applyUserCaseLayoutCanon`.
 */
export function packMvpUserCaseForTeam(
  team: CompetitionTeamId,
  baseDocument: DeviceScenarioDocument,
): DeviceScenarioDocument {
  const meta = TEAM_META[team];
  const strippedBase = stripBundledUserFunctionBlocks(baseDocument);
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
    },
    scenario: {
      ...structuredClone(strippedBase.scenario),
      functions: [],
      commentGroups: [],
    },
  });

  for (const collapse of TEAM_MAIN_COLLAPSES[team]) {
    document = applyBranchCollapse(document, 'main', collapse);
  }

  for (const collapse of TEAM_ONCONNECT_COLLAPSES[team] ?? []) {
    document = applyBranchCollapse(document, 'onConnect', collapse);
  }

  return document;
}

export function competitionUserCaseId(team: CompetitionTeamId): string {
  return `usercase-mvp-microphone-${team}`;
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
