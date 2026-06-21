import type { DeviceScenarioDocument } from '@membrana/core';

import { collapseSelectionToFunction } from './collapse-to-function.js';
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

const GATE_NODE_IDS = [
  'node-get-recorder-mqmo3mba-31',
  'node-start-recording-bootstrap-v08-2',
  'node-is-recording-window-full-mqmo40ie-32',
  'node-stop-recording-mqmod4yf-35',
  'node-make-track-mqmcipn5-28',
  'node-start-recording-mqv07-36',
] as const;

const TRENDS_PUBLISH_NODE_IDS = [
  'node-flush-spectral-analyser-mqmoa8o7-34',
  'node-make-fft-trends-analysis-mqmo96xz-33',
  'node-get-reporter-mqm9yfmy-29',
  'node-make-report-from-analysis-mqma356z-34',
  'node-publish-report-mqma49xv-35',
] as const;

const TEAM_COLLAPSES: Readonly<Record<CompetitionTeamId, readonly CollapseSpec[]>> = {
  alpha: [
    {
      functionId: 'fn-alpha-observation-tick',
      functionName: 'Observation tick',
      description: 'Trends classify + publish (Phase 2α partial)',
      nodeIds: TRENDS_PUBLISH_NODE_IDS,
    },
  ],
  beta: [
    {
      functionId: 'fn-beta-recording-gate',
      functionName: 'Recording gate',
      description: '5 s window gate + MakeTrack',
      nodeIds: GATE_NODE_IDS,
    },
  ],
  gamma: [
    {
      functionId: 'fn-gamma-recording-gate',
      functionName: 'Захват · окно записи',
      description: '5 s WAV gate + MakeTrack',
      nodeIds: GATE_NODE_IDS,
    },
    {
      functionId: 'fn-gamma-trends-publish',
      functionName: 'Анализ · публикация',
      description: 'FFT trends classify + PublishReport',
      nodeIds: TRENDS_PUBLISH_NODE_IDS,
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
      'Team Alpha: operator journey — три акта, observation function, RU comment groups.',
    commentGroupProfile: 'alpha',
  },
  beta: {
    title: 'MVP microphone · Beta (Measured modular UserCase)',
    description: 'Team Beta: modular recording-gate function, verify-layout metrics.',
    commentGroupProfile: 'beta',
  },
  gamma: {
    title: 'MVP microphone · Gamma (Poster UserCase)',
    description: 'Team Gamma: poster layout ①–⑤, live observation mega-function.',
    commentGroupProfile: 'gamma',
  },
};

function applyMainBranchCollapse(
  document: DeviceScenarioDocument,
  collapse: CollapseSpec,
): DeviceScenarioDocument {
  const variables = document.scenario.variables;
  const main = document.scenario.loops.main;
  const { nodes, edges } = deserializeScenarioSubgraph(main, variables);

  const result = collapseSelectionToFunction({
    selectedNodeIds: [...collapse.nodeIds],
    branchNodes: nodes,
    branchEdges: edges,
    functionId: collapse.functionId,
    functionName: collapse.functionName,
  });

  if (!result.ok) {
    throw new Error(`Collapse ${collapse.functionId} failed: ${result.message}`);
  }

  const newMain = serializeScenarioSubgraph(main.entry, result.branchNodes, result.branchEdges);
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

  return {
    ...document,
    meta: document.meta,
    scenario: {
      ...document.scenario,
      loops: {
        ...document.scenario.loops,
        main: newMain,
      },
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
  let document: DeviceScenarioDocument = {
    ...structuredClone(baseDocument),
    meta: {
      ...baseDocument.meta,
      title: meta.title,
      exportedAt: new Date().toISOString(),
      commentGroupProfile: meta.commentGroupProfile,
    } as DeviceScenarioDocument['meta'],
    scenario: {
      ...structuredClone(baseDocument.scenario),
      functions: [],
      commentGroups: [],
    },
  };

  for (const collapse of TEAM_COLLAPSES[team]) {
    document = applyMainBranchCollapse(document, collapse);
  }

  return document;
}

export function competitionUserCaseId(team: CompetitionTeamId): string {
  return `usercase-mvp-microphone-${team}`;
}
