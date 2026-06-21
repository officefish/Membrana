import type {
  DeviceScenarioDocument,
  ScenarioCommentGroup,
  ScenarioGraphNode,
  ScenarioSubgraph,
  ScenarioVariable,
} from '@membrana/core';

import {
  BOARD_ALIGN_GAP_PX,
  BOARD_LAYOUT_GRID_PX,
  snapBoardLayoutCoordinate,
} from './align-nodes.js';
import { COMMENT_GROUP_MIN_HEIGHT, COMMENT_GROUP_MIN_WIDTH, COMMENT_GROUP_PADDING_PX } from './comment-group.js';
import { computeExecChainLayoutFromEntry } from './layout-exec-chain.js';
import { BOARD_NODE_MARQUEE_HEIGHT, BOARD_NODE_MARQUEE_WIDTH } from './marquee-selection.js';
import { deserializeScenarioSubgraph } from './serialize-scenario-subgraph.js';
import { validateFunctionDepth } from './validate-function-depth.js';

/** Ветки, для которых verify проверяет monotonic exec-x. */
export const USERCASE_EXEC_LAYOUT_BRANCHES = ['main', 'alarm'] as const;

export type UserCaseExecLayoutBranch = (typeof USERCASE_EXEC_LAYOUT_BRANCHES)[number];

export type UserCaseLayoutIssueSeverity = 'error' | 'warning';

export interface UserCaseLayoutIssue {
  readonly severity: UserCaseLayoutIssueSeverity;
  readonly code: string;
  readonly message: string;
  readonly path: string;
}

export interface UserCaseLayoutVerifyResult {
  readonly ok: boolean;
  readonly errors: readonly UserCaseLayoutIssue[];
  readonly warnings: readonly UserCaseLayoutIssue[];
}

const DEFAULT_NODE_WIDTH = BOARD_NODE_MARQUEE_WIDTH;
const DEFAULT_NODE_HEIGHT = BOARD_NODE_MARQUEE_HEIGHT;
const RANK_BUCKET_PX = DEFAULT_NODE_WIDTH + BOARD_ALIGN_GAP_PX;

interface MainCommentGroupSpec {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly frameColor: ScenarioCommentGroup['frameColor'];
  readonly nodeKinds: readonly string[];
}

/** Semantic frames для MVP main (U9 L1). */
export const MVP_MAIN_COMMENT_GROUP_SPECS: readonly MainCommentGroupSpec[] = [
  {
    id: 'ucg-main-policy',
    title: 'Policy constructors',
    description: 'MakeRecordingPolicy и MakeFftTrendsPolicy',
    frameColor: { preset: 'primary' },
    nodeKinds: ['make-recording-policy', 'make-fft-trends-policy'],
  },
  {
    id: 'ucg-main-recording-gate',
    title: 'Recording gate',
    description: 'Start/stop recording, window gate, MakeTrack',
    frameColor: { preset: 'warning' },
    nodeKinds: [
      'start-recording',
      'stop-recording',
      'is-recording-window-full',
      'make-track',
      'get-recorder',
    ],
  },
  {
    id: 'ucg-main-trends-fft',
    title: 'Trends FFT',
    description: 'Spectral analyser, FFT frames, analysis',
    frameColor: { preset: 'info' },
    nodeKinds: [
      'get-spectral-analyser',
      'collect-fft-frames',
      'flush-spectral-analyser',
      'get-fft-frame',
      'get-sample',
      'make-fft-trends-analysis',
    ],
  },
  {
    id: 'ucg-main-journal',
    title: 'Journal',
    description: 'Reporter, track report, publish',
    frameColor: { preset: 'accent' },
    nodeKinds: [
      'get-journal',
      'get-reporter',
      'make-report-from-track',
      'make-report-from-analysis',
      'publish-report',
    ],
  },
];

function isGridAligned(value: number): boolean {
  const mod = value % BOARD_LAYOUT_GRID_PX;
  return mod === 0 || Object.is(mod, -0);
}

function nodeBounds(node: ScenarioGraphNode): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  return {
    x: node.position.x,
    y: node.position.y,
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
  };
}

function rectsOverlap(
  a: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  b: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function collectSubgraphs(
  document: DeviceScenarioDocument,
): readonly { readonly path: string; readonly subgraph: ScenarioSubgraph }[] {
  const { scenario } = document;
  const out: { path: string; subgraph: ScenarioSubgraph }[] = [
    { path: 'scenario.initial', subgraph: scenario.initial },
    { path: 'scenario.onConnect', subgraph: scenario.onConnect },
    { path: 'scenario.loops.main', subgraph: scenario.loops.main },
    { path: 'scenario.loops.alarm', subgraph: scenario.loops.alarm },
    { path: 'scenario.triggers.onStop', subgraph: scenario.triggers.onStop },
    { path: 'scenario.triggers.onDisconnect', subgraph: scenario.triggers.onDisconnect },
  ];
  for (const fn of scenario.functions) {
    out.push({ path: `scenario.functions.${fn.id}`, subgraph: fn });
  }
  return out;
}

function verifyGrid(subgraph: ScenarioSubgraph, path: string): UserCaseLayoutIssue[] {
  const issues: UserCaseLayoutIssue[] = [];
  for (const node of subgraph.nodes) {
    if (!isGridAligned(node.position.x) || !isGridAligned(node.position.y)) {
      issues.push({
        severity: 'error',
        code: 'grid-misaligned',
        message: `Node «${node.id}» not on ${BOARD_LAYOUT_GRID_PX}px grid`,
        path: `${path}.nodes/${node.id}`,
      });
    }
  }
  return issues;
}

function verifyExecMonotonicX(subgraph: ScenarioSubgraph, path: string): UserCaseLayoutIssue[] {
  const issues: UserCaseLayoutIssue[] = [];
  const nodeById = new Map(subgraph.nodes.map((node) => [node.id, node]));
  const execEdges = subgraph.edges.filter((edge) => edge.kind === 'exec');
  const visited = new Set<string>();
  const queue = [subgraph.entry];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined || visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);
    const source = nodeById.get(currentId);
    if (source === undefined) {
      continue;
    }
    for (const edge of execEdges) {
      if (edge.source !== currentId) {
        continue;
      }
      const target = nodeById.get(edge.target);
      if (target === undefined) {
        continue;
      }
      if (target.position.x < source.position.x) {
        issues.push({
          severity: 'error',
          code: 'exec-non-monotonic-x',
          message: `Exec edge ${edge.source} → ${edge.target} breaks LR monotonic x`,
          path: `${path}.edges/${edge.source}-${edge.target}`,
        });
      }
      queue.push(edge.target);
    }
  }
  return issues;
}

function verifySameRankOverlap(subgraph: ScenarioSubgraph, path: string): UserCaseLayoutIssue[] {
  const issues: UserCaseLayoutIssue[] = [];
  const buckets = new Map<number, ScenarioGraphNode[]>();
  for (const node of subgraph.nodes) {
    const bucket = Math.round(node.position.x / RANK_BUCKET_PX);
    const list = buckets.get(bucket) ?? [];
    list.push(node);
    buckets.set(bucket, list);
  }

  for (const [bucket, nodes] of buckets) {
    if (nodes.length < 2) {
      continue;
    }
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        if (a === undefined || b === undefined) {
          continue;
        }
        if (rectsOverlap(nodeBounds(a), nodeBounds(b))) {
          issues.push({
            severity: 'error',
            code: 'same-rank-overlap',
            message: `Nodes «${a.id}» and «${b.id}» overlap in rank bucket ${bucket}`,
            path: `${path}.nodes`,
          });
        }
      }
    }
  }
  return issues;
}

function branchPathIsExecLayoutBranch(path: string): path is `scenario.loops.${UserCaseExecLayoutBranch}` {
  return path === 'scenario.loops.main' || path === 'scenario.loops.alarm';
}

/** Pure layout verification for bundled UserCases (U9 L1). */
export function verifyUserCaseDocumentLayout(
  document: DeviceScenarioDocument,
): UserCaseLayoutVerifyResult {
  const errors: UserCaseLayoutIssue[] = [];
  const warnings: UserCaseLayoutIssue[] = [];

  for (const { path, subgraph } of collectSubgraphs(document)) {
    errors.push(...verifyGrid(subgraph, path));
    if (branchPathIsExecLayoutBranch(path)) {
      errors.push(...verifyExecMonotonicX(subgraph, path));
      errors.push(...verifySameRankOverlap(subgraph, path));
    }
  }

  const functionIssues = validateFunctionDepth(document.scenario.functions, [
    { path: 'scenario.initial', nodes: document.scenario.initial.nodes },
    { path: 'scenario.onConnect', nodes: document.scenario.onConnect.nodes },
    { path: 'scenario.loops.main', nodes: document.scenario.loops.main.nodes },
    { path: 'scenario.loops.alarm', nodes: document.scenario.loops.alarm.nodes },
    { path: 'scenario.triggers.onStop', nodes: document.scenario.triggers.onStop.nodes },
    {
      path: 'scenario.triggers.onDisconnect',
      nodes: document.scenario.triggers.onDisconnect.nodes,
    },
  ]);
  for (const issue of functionIssues) {
    errors.push({
      severity: 'error',
      code: issue.code,
      message: issue.message,
      path: issue.path ?? 'scenario',
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function computeGroupRect(nodes: readonly ScenarioGraphNode[]): ScenarioCommentGroup['rect'] | null {
  if (nodes.length === 0) {
    return null;
  }
  const boxes = nodes.map((node) => nodeBounds(node));
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  const padding = COMMENT_GROUP_PADDING_PX;
  const x = snapBoardLayoutCoordinate(minX - padding);
  const y = snapBoardLayoutCoordinate(minY - padding);
  const width = Math.max(
    COMMENT_GROUP_MIN_WIDTH,
    snapBoardLayoutCoordinate(maxX - minX + padding * 2),
  );
  const height = Math.max(
    COMMENT_GROUP_MIN_HEIGHT,
    snapBoardLayoutCoordinate(maxY - minY + padding * 2),
  );
  return { x, y, width, height };
}

/** Строит comment groups для main branch по semantic nodeKind specs. */
export function buildMvpMainCommentGroups(
  mainSubgraph: ScenarioSubgraph,
): readonly ScenarioCommentGroup[] {
  const groups: ScenarioCommentGroup[] = [];
  for (const spec of MVP_MAIN_COMMENT_GROUP_SPECS) {
    const matched = mainSubgraph.nodes.filter(
      (node) => node.nodeKind !== undefined && spec.nodeKinds.includes(node.nodeKind),
    );
    if (matched.length === 0) {
      continue;
    }
    const rect = computeGroupRect(matched);
    if (rect === null) {
      continue;
    }
    groups.push({
      id: spec.id,
      branch: 'main',
      title: spec.title,
      ...(spec.description !== undefined ? { description: spec.description } : {}),
      frameColor: spec.frameColor,
      rect,
      nodeIds: matched.map((node) => node.id),
    });
  }
  return groups;
}

function applyExecLayoutToSubgraph(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
): ScenarioSubgraph {
  const { nodes, edges } = deserializeScenarioSubgraph(subgraph, variables);
  const positions = computeExecChainLayoutFromEntry(nodes, edges, subgraph.entry);
  if (positions.size === 0) {
    return snapSubgraphToGrid(subgraph);
  }
  return snapSubgraphToGrid({
    ...subgraph,
    nodes: subgraph.nodes.map((node) => {
      const next = positions.get(node.id);
      if (next === undefined) {
        return node;
      }
      return {
        ...node,
        position: { x: next.x, y: next.y },
      };
    }),
  });
}

function snapSubgraphToGrid(subgraph: ScenarioSubgraph): ScenarioSubgraph {
  return {
    ...subgraph,
    nodes: subgraph.nodes.map((node) => ({
      ...node,
      position: {
        x: snapBoardLayoutCoordinate(node.position.x),
        y: snapBoardLayoutCoordinate(node.position.y),
      },
    })),
  };
}

/** Применяет exec-lr-v1 layout canon + MVP main comment groups (U9 L1). */
export function applyUserCaseLayoutCanon(document: DeviceScenarioDocument): DeviceScenarioDocument {
  const variables = document.scenario.variables;

  const initial = applyExecLayoutToSubgraph(document.scenario.initial, variables);
  const onConnect = applyExecLayoutToSubgraph(document.scenario.onConnect, variables);
  const main = applyExecLayoutToSubgraph(document.scenario.loops.main, variables);
  const alarm = applyExecLayoutToSubgraph(
    document.scenario.loops.alarm,
    variables,
  );
  const onStop = applyExecLayoutToSubgraph(document.scenario.triggers.onStop, variables);
  const onDisconnect = applyExecLayoutToSubgraph(document.scenario.triggers.onDisconnect, variables);

  const commentGroups = buildMvpMainCommentGroups(main);

  return {
    ...document,
    scenario: {
      ...document.scenario,
      initial,
      onConnect,
      loops: { main, alarm },
      triggers: {
        ...document.scenario.triggers,
        onStop,
        onDisconnect,
      },
      commentGroups,
    },
  };
}
