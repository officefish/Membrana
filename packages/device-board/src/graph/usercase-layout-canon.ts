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
import { parseSubgraphFunctionId } from './subgraph-ref.js';
import { validateFunctionDepth } from './validate-function-depth.js';
import {
  MVP_MAIN_COMMENT_GROUP_SPECS,
  USERCASE_COMMENT_GROUP_PROFILES,
  USERCASE_AUXILIARY_COMMENT_GROUP_PROFILES,
  type MainCommentGroupSpec,
  type UserCaseCommentGroupProfileId,
} from './usercase-comment-group-profiles.js';

export {
  MVP_MAIN_COMMENT_GROUP_SPECS,
  USERCASE_COMMENT_GROUP_PROFILES,
  USERCASE_AUXILIARY_COMMENT_GROUP_PROFILES,
  type MainCommentGroupSpec,
  type UserCaseCommentGroupProfileId,
} from './usercase-comment-group-profiles.js';

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

function resolveCommentGroupProfile(document: DeviceScenarioDocument): UserCaseCommentGroupProfileId {
  const raw = (document.meta as { commentGroupProfile?: string } | undefined)?.commentGroupProfile;
  if (raw === 'alpha' || raw === 'beta' || raw === 'gamma' || raw === 'mvp') {
    return raw;
  }
  return 'mvp';
}

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

/** Строит comment groups для ветки по semantic specs. */
export function buildMainCommentGroupsFromSpecs(
  subgraph: ScenarioSubgraph,
  specs: readonly MainCommentGroupSpec[],
  branch: ScenarioCommentGroup['branch'] = 'main',
): readonly ScenarioCommentGroup[] {
  const groups: ScenarioCommentGroup[] = [];
  for (const spec of specs) {
    const matched: ScenarioGraphNode[] = [];
    const nodeKinds = spec.nodeKinds ?? [];
    for (const node of subgraph.nodes) {
      if (node.nodeKind !== undefined && nodeKinds.includes(node.nodeKind)) {
        matched.push(node);
      }
      if (node.blockKind === 'subgraph' && spec.functionIds !== undefined) {
        const fnId = parseSubgraphFunctionId(node);
        if (fnId !== null && spec.functionIds.includes(fnId)) {
          matched.push(node);
        }
      }
    }
    const unique = [...new Map(matched.map((node) => [node.id, node])).values()];
    if (unique.length === 0) {
      continue;
    }
    const rect = computeGroupRect(unique);
    if (rect === null) {
      continue;
    }
    groups.push({
      id: spec.id,
      branch: spec.branch ?? branch,
      title: spec.title,
      ...(spec.description !== undefined ? { description: spec.description } : {}),
      frameColor: spec.frameColor,
      rect,
      nodeIds: unique.map((node) => node.id),
    });
  }
  return groups;
}

/** Строит comment groups для main branch по semantic nodeKind specs (MVP default). */
export function buildMvpMainCommentGroups(
  mainSubgraph: ScenarioSubgraph,
): readonly ScenarioCommentGroup[] {
  return buildMainCommentGroupsFromSpecs(mainSubgraph, MVP_MAIN_COMMENT_GROUP_SPECS);
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

/** Разводит узлы в одном exec-rank по Y (auxiliary/data рядом с exec spine). */
function separateSameRankOverlaps(subgraph: ScenarioSubgraph): ScenarioSubgraph {
  const nodes = subgraph.nodes.map((node) => ({
    ...node,
    position: { x: node.position.x, y: node.position.y },
  }));

  const buckets = new Map<number, number[]>();
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node === undefined) {
      continue;
    }
    const bucket = Math.round(node.position.x / RANK_BUCKET_PX);
    const list = buckets.get(bucket) ?? [];
    list.push(index);
    buckets.set(bucket, list);
  }

  for (const indices of buckets.values()) {
    if (indices.length < 2) {
      continue;
    }
    const sorted = [...indices].sort((a, b) => {
      const nodeA = nodes[a];
      const nodeB = nodes[b];
      return (nodeA?.position.y ?? 0) - (nodeB?.position.y ?? 0);
    });
    for (let j = 1; j < sorted.length; j += 1) {
      const prevIndex = sorted[j - 1];
      const curIndex = sorted[j];
      if (prevIndex === undefined || curIndex === undefined) {
        continue;
      }
      const prev = nodes[prevIndex];
      const cur = nodes[curIndex];
      if (prev === undefined || cur === undefined) {
        continue;
      }
      if (rectsOverlap(nodeBounds(prev), nodeBounds(cur))) {
        const prevBox = nodeBounds(prev);
        nodes[curIndex] = {
          ...cur,
          position: {
            x: cur.position.x,
            y: snapBoardLayoutCoordinate(prevBox.y + prevBox.height + BOARD_ALIGN_GAP_PX),
          },
        };
      }
    }
  }

  return { ...subgraph, nodes };
}

function applyExecLayoutToSubgraphWithOverlapFix(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
): ScenarioSubgraph {
  return separateSameRankOverlaps(applyExecLayoutToSubgraph(subgraph, variables));
}

/** Применяет exec-lr-v1 layout canon + MVP main comment groups (U9 L1). */
export function applyUserCaseLayoutCanon(document: DeviceScenarioDocument): DeviceScenarioDocument {
  const variables = document.scenario.variables;

  const initial = applyExecLayoutToSubgraphWithOverlapFix(document.scenario.initial, variables);
  const onConnect = applyExecLayoutToSubgraphWithOverlapFix(document.scenario.onConnect, variables);
  const main = applyExecLayoutToSubgraphWithOverlapFix(document.scenario.loops.main, variables);
  const alarm = applyExecLayoutToSubgraphWithOverlapFix(document.scenario.loops.alarm, variables);
  const onStop = applyExecLayoutToSubgraphWithOverlapFix(document.scenario.triggers.onStop, variables);
  const onDisconnect = applyExecLayoutToSubgraphWithOverlapFix(
    document.scenario.triggers.onDisconnect,
    variables,
  );

  const commentGroupProfile = resolveCommentGroupProfile(document);
  const auxiliary = USERCASE_AUXILIARY_COMMENT_GROUP_PROFILES[commentGroupProfile];
  const commentGroups = [
    ...buildMainCommentGroupsFromSpecs(
      main,
      USERCASE_COMMENT_GROUP_PROFILES[commentGroupProfile],
      'main',
    ),
    ...(auxiliary?.onConnect !== undefined
      ? buildMainCommentGroupsFromSpecs(onConnect, auxiliary.onConnect, 'onConnect')
      : []),
    ...(auxiliary?.initial !== undefined
      ? buildMainCommentGroupsFromSpecs(initial, auxiliary.initial, 'initial')
      : []),
  ];

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
      functions: document.scenario.functions.map((fn) => ({
        ...fn,
        ...applyExecLayoutToSubgraphWithOverlapFix(fn, variables),
      })),
      commentGroups,
    },
  };
}
