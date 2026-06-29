import { applyNodeChanges, type Node, type NodeChange } from '@xyflow/react';
import type {
  ScenarioCommentGroup,
  ScenarioCommentGroupBranch,
  ScenarioCommentGroupFrameColor,
} from '@membrana/core';
import {
  DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR,
  resolveScenarioCommentGroupFrameColor,
} from '@membrana/core';

import { nodeFlowBounds } from './marquee-selection.js';
import { isSystemNode, isEventNode } from './event-node.js';
import { isFunctionIoNode } from './function-io-node.js';
import { BOARD_LAYOUT_GRID_PX } from './align-nodes.js';

export const BOARD_GROUP_NODE_TYPE = 'boardGroup' as const;

/** Отступ рамки группы от bbox узлов (кратно 8 px). */
export const COMMENT_GROUP_PADDING_PX = 24;

export const COMMENT_GROUP_MIN_WIDTH = 160;
export const COMMENT_GROUP_MIN_HEIGHT = 120;

/** Максимальная длина описания comment group (CGF G1). */
export const COMMENT_GROUP_DESCRIPTION_MAX_LENGTH = 500;

/**
 * XYFlow требует, чтобы parent-нода шла раньше детей в массиве nodes.
 */
export function sortBoardNodesParentsBeforeChildren(nodes: readonly Node[]): Node[] {
  const groups = nodes.filter((node) => isBoardGroupNode(node));
  if (groups.length === 0) {
    return [...nodes];
  }
  const rest = nodes.filter((node) => !isBoardGroupNode(node));
  return [...groups, ...rest];
}

export interface BoardGroupNodeData extends Record<string, unknown> {
  readonly title: string;
  readonly description?: string;
  readonly frameColor?: ScenarioCommentGroupFrameColor;
  readonly layer: 'signal' | 'scenario';
}

export function isBoardGroupNode(node: Pick<Node, 'type'>): boolean {
  return node.type === BOARD_GROUP_NODE_TYPE;
}

function snapToGrid(value: number): number {
  return Math.round(value / BOARD_LAYOUT_GRID_PX) * BOARD_LAYOUT_GRID_PX;
}

/** Создаёт XYFlow-ноду рамки comment group. */
export function createCommentGroupBoardNode(input: {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly frameColor?: ScenarioCommentGroupFrameColor;
  readonly rect: ScenarioCommentGroup['rect'];
  readonly layer?: 'signal' | 'scenario';
}): Node {
  const frameColor = resolveScenarioCommentGroupFrameColor(
    input.frameColor ?? DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR,
  );
  return {
    id: input.id,
    type: BOARD_GROUP_NODE_TYPE,
    position: { x: input.rect.x, y: input.rect.y },
    className: 'overflow-visible',
    data: {
      title: input.title,
      ...(input.description !== undefined ? { description: input.description } : {}),
      frameColor,
      layer: input.layer ?? 'scenario',
    } satisfies BoardGroupNodeData,
    style: {
      width: input.rect.width,
      height: input.rect.height,
      zIndex: -1,
    },
    draggable: true,
    selectable: true,
    connectable: false,
    deletable: true,
  };
}

/** Bounding box selection + padding → rect на сетке 8 px. */
export function selectionBoundsToGroupRect(
  nodes: readonly Node[],
  selectedIds: ReadonlySet<string>,
  padding = COMMENT_GROUP_PADDING_PX,
): ScenarioCommentGroup['rect'] | null {
  const picked = nodes.filter((node) => selectedIds.has(node.id) && !isBoardGroupNode(node));
  if (picked.length === 0) {
    return null;
  }
  const boxes = picked.map((node) => nodeFlowBounds(node));
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  const x = snapToGrid(minX - padding);
  const y = snapToGrid(minY - padding);
  const width = Math.max(COMMENT_GROUP_MIN_WIDTH, snapToGrid(maxX - minX + padding * 2));
  const height = Math.max(COMMENT_GROUP_MIN_HEIGHT, snapToGrid(maxY - minY + padding * 2));
  return { x, y, width, height };
}

function nextGroupId(existing: ReadonlySet<string>): string {
  let seq = 1;
  while (existing.has(`group-${seq}`)) {
    seq += 1;
  }
  return `group-${seq}`;
}

export interface CollapseToCommentGroupInput {
  readonly branch: ScenarioCommentGroupBranch;
  readonly selectedNodeIds: readonly string[];
  readonly branchNodes: readonly Node[];
  readonly groupId?: string;
  readonly title?: string;
  /** ID групп на других ветках — резервируются при генерации group-N. */
  readonly reservedGroupIds?: readonly string[];
}

export interface CollapseToCommentGroupResult {
  readonly ok: true;
  readonly branchNodes: Node[];
  readonly group: ScenarioCommentGroup;
}

export interface CollapseToCommentGroupError {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
}

export type CollapseToCommentGroupOutcome =
  | CollapseToCommentGroupResult
  | CollapseToCommentGroupError;

/**
 * Упаковывает выделение в comment group: рамка + parentId на детях (CGF G1).
 */
export function collapseSelectionToCommentGroup(
  input: CollapseToCommentGroupInput,
): CollapseToCommentGroupOutcome {
  const selected = new Set(input.selectedNodeIds);
  if (selected.size < 2) {
    return { ok: false, code: 'selection-too-small', message: 'Выберите минимум 2 узла' };
  }

  for (const nodeId of selected) {
    const node = input.branchNodes.find((item) => item.id === nodeId);
    if (node === undefined) {
      return { ok: false, code: 'missing-node', message: `Узел «${nodeId}» не найден` };
    }
    if (isBoardGroupNode(node)) {
      return { ok: false, code: 'group-selected', message: 'Нельзя группировать рамки' };
    }
    if (isSystemNode(node) || isEventNode(node) || isFunctionIoNode(node)) {
      return {
        ok: false,
        code: 'system-node-selected',
        message: 'Системные узлы нельзя объединять в группу',
      };
    }
    if (node.parentId !== undefined) {
      return {
        ok: false,
        code: 'already-grouped',
        message: 'Узел уже внутри группы',
      };
    }
  }

  const rect = selectionBoundsToGroupRect(input.branchNodes, selected);
  if (rect === null) {
    return { ok: false, code: 'empty-bounds', message: 'Не удалось вычислить рамку' };
  }

  const existingIds = new Set(
    input.branchNodes.filter((node) => isBoardGroupNode(node)).map((node) => node.id),
  );
  for (const id of input.reservedGroupIds ?? []) {
    existingIds.add(id);
  }
  const groupId = input.groupId ?? nextGroupId(existingIds);
  const title = input.title ?? 'Группа';

  const groupNode = createCommentGroupBoardNode({
    id: groupId,
    title,
    rect,
    layer: input.branch === 'signal' ? 'signal' : 'scenario',
  });

  const branchNodes = input.branchNodes.map((node) => {
    if (!selected.has(node.id)) {
      return node;
    }
    return {
      ...node,
      parentId: groupId,
      extent: 'parent' as const,
      position: {
        x: node.position.x - rect.x,
        y: node.position.y - rect.y,
      },
    };
  });

  return {
    ok: true,
    branchNodes: sortBoardNodesParentsBeforeChildren([...branchNodes, groupNode]),
    group: {
      id: groupId,
      branch: input.branch,
      title,
      frameColor: DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR,
      rect,
      nodeIds: [...selected],
    },
  };
}

/** Извлекает comment groups из XYFlow nodes ветки (для serialize). */
export function extractCommentGroupsFromNodes(
  branch: ScenarioCommentGroupBranch,
  nodes: readonly Node[],
): ScenarioCommentGroup[] {
  return nodes
    .filter((node) => isBoardGroupNode(node))
    .map((groupNode) => {
      const data = groupNode.data as BoardGroupNodeData;
      const width =
        typeof groupNode.style?.width === 'number'
          ? groupNode.style.width
          : COMMENT_GROUP_MIN_WIDTH;
      const height =
        typeof groupNode.style?.height === 'number'
          ? groupNode.style.height
          : COMMENT_GROUP_MIN_HEIGHT;
      return {
        id: groupNode.id,
        branch,
        title: typeof data.title === 'string' ? data.title : 'Группа',
        ...(typeof data.description === 'string' && data.description.length > 0
          ? { description: data.description }
          : {}),
        frameColor: resolveScenarioCommentGroupFrameColor(data.frameColor),
        rect: {
          x: groupNode.position.x,
          y: groupNode.position.y,
          width,
          height,
        },
        nodeIds: nodes.filter((node) => node.parentId === groupNode.id).map((node) => node.id),
      };
    });
}

/** Убирает group-ноды перед сериализацией scenario subgraph. */
export function stripCommentGroupNodes(nodes: readonly Node[]): Node[] {
  return nodes.filter((node) => !isBoardGroupNode(node));
}

/** ID `boardGroup` среди кандидатов на удаление. */
export function pickDissolvableCommentGroupIds(
  nodes: readonly Node[],
  candidateIds: readonly string[],
): readonly string[] {
  const candidates = new Set(candidateIds);
  return nodes
    .filter((node) => candidates.has(node.id) && isBoardGroupNode(node))
    .map((node) => node.id);
}

/** Member nodes, которые нельзя удалять вместе с рамкой группы. */
export function commentGroupMemberIdsProtectedFromRemoval(
  nodes: readonly Node[],
  dissolvingGroupIds: readonly string[],
): ReadonlySet<string> {
  const dissolveSet = new Set(dissolvingGroupIds);
  const protectedIds = new Set<string>();
  for (const node of nodes) {
    if (node.parentId !== undefined && dissolveSet.has(node.parentId)) {
      protectedIds.add(node.id);
    }
  }
  return protectedIds;
}

/**
 * XYFlow при Delete на parent шлёт `remove` и для детей — отбрасываем удаление member nodes.
 */
export function rejectCommentGroupMemberRemovals(
  changes: readonly NodeChange[],
  nodes: readonly Node[],
): NodeChange[] {
  const dissolvingGroupIds = changes
    .filter((change): change is NodeChange & { type: 'remove'; id: string } => change.type === 'remove')
    .map((change) => change.id)
    .filter((id) => {
      const node = nodes.find((item) => item.id === id);
      return node !== undefined && isBoardGroupNode(node);
    });
  if (dissolvingGroupIds.length === 0) {
    return [...changes];
  }
  const protectedIds = commentGroupMemberIdsProtectedFromRemoval(nodes, dissolvingGroupIds);
  return changes.filter(
    (change) => !(change.type === 'remove' && protectedIds.has(change.id)),
  );
}

/**
 * Снимает рамки групп: member nodes остаются с absolute position, без parentId/extent.
 */
export function dissolveCommentGroups(
  nodes: readonly Node[],
  groupIds: readonly string[],
): Node[] {
  const dissolveSet = new Set(
    groupIds.filter((id) => {
      const node = nodes.find((item) => item.id === id);
      return node !== undefined && isBoardGroupNode(node);
    }),
  );
  if (dissolveSet.size === 0) {
    return [...nodes];
  }

  const groupPositions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    if (dissolveSet.has(node.id)) {
      groupPositions.set(node.id, node.position);
    }
  }

  return nodes
    .filter((node) => !dissolveSet.has(node.id))
    .map((node) => {
      const parentId = node.parentId;
      if (parentId === undefined || !dissolveSet.has(parentId)) {
        return node;
      }
      const parentPos = groupPositions.get(parentId) ?? { x: 0, y: 0 };
      const { parentId: _parentId, extent: _extent, ...rest } = node;
      return {
        ...rest,
        position: {
          x: node.position.x + parentPos.x,
          y: node.position.y + parentPos.y,
        },
      };
    });
}

/** Применяет NodeChange с dissolve comment group вместо каскадного удаления детей. */
export function applyBoardNodeChangesWithCommentGroupDissolve(
  changes: readonly NodeChange[],
  nodes: readonly Node[],
): Node[] {
  const filtered = rejectCommentGroupMemberRemovals(changes, nodes);
  const dissolvingGroupIds = filtered
    .filter((change): change is NodeChange & { type: 'remove'; id: string } => change.type === 'remove')
    .map((change) => change.id)
    .filter((id) => {
      const node = nodes.find((item) => item.id === id);
      return node !== undefined && isBoardGroupNode(node);
    });
  const afterApply = applyNodeChanges(filtered, [...nodes]);
  return dissolveCommentGroups(afterApply, dissolvingGroupIds);
}

export interface BranchNodeRemovalResult {
  readonly nodes: Node[];
  readonly removedNodeIds: readonly string[];
  readonly dissolvedGroupIds: readonly string[];
}

/**
 * Удаляет узлы ветки: comment group → dissolve (дети сохраняются), остальное — hard delete.
 */
export function applyBranchNodeRemovals(
  nodes: readonly Node[],
  candidateIds: readonly string[],
  isRemovable: (node: Node) => boolean,
): BranchNodeRemovalResult | null {
  const removableIds = candidateIds.filter((id) => {
    const node = nodes.find((item) => item.id === id);
    return node !== undefined && isRemovable(node);
  });
  if (removableIds.length === 0) {
    return null;
  }

  const dissolvedGroupIds = pickDissolvableCommentGroupIds(nodes, removableIds);
  const protectedMemberIds = commentGroupMemberIdsProtectedFromRemoval(nodes, dissolvedGroupIds);
  const removedNodeIds = removableIds.filter(
    (id) => !dissolvedGroupIds.includes(id) && !protectedMemberIds.has(id),
  );

  let nextNodes = nodes.filter(
    (node) => !removedNodeIds.includes(node.id) && !dissolvedGroupIds.includes(node.id),
  );
  nextNodes = dissolveCommentGroups(nextNodes, dissolvedGroupIds);

  return {
    nodes: nextNodes,
    removedNodeIds,
    dissolvedGroupIds,
  };
}

/**
 * Подготовка nodes к serializeScenarioSubgraph: без рамок, absolute positions.
 */
export function nodesForScenarioSubgraphSerialize(nodes: readonly Node[]): Node[] {
  const withoutGroups = stripCommentGroupNodes(nodes);
  return withoutGroups.map((node) => {
    if (node.parentId === undefined) {
      return node;
    }
    const parent = nodes.find((item) => item.id === node.parentId);
    if (parent === undefined) {
      const { parentId: _p, extent: _e, ...rest } = node;
      return rest;
    }
    const { parentId: _p, extent: _e, ...rest } = node;
    return {
      ...rest,
      position: {
        x: node.position.x + parent.position.x,
        y: node.position.y + parent.position.y,
      },
    };
  });
}

/** Применяет сохранённые groups к nodes ветки (hydrate). */
export function applyCommentGroupsToBranchNodes(
  nodes: readonly Node[],
  groups: readonly ScenarioCommentGroup[],
  branch: ScenarioCommentGroupBranch,
): Node[] {
  const branchGroups = groups.filter((group) => group.branch === branch);
  if (branchGroups.length === 0) {
    return [...nodes];
  }

  let next = nodes.filter((node) => !isBoardGroupNode(node));
  for (const group of branchGroups) {
    const groupNode = createCommentGroupBoardNode({
      id: group.id,
      title: group.title,
      description: group.description,
      frameColor: group.frameColor,
      rect: group.rect,
      layer: branch === 'signal' ? 'signal' : 'scenario',
    });
    const memberIds = new Set(group.nodeIds);
    next = next.map((node) => {
      if (!memberIds.has(node.id)) {
        return node;
      }
      return {
        ...node,
        parentId: group.id,
        extent: 'parent' as const,
        position: {
          x: node.position.x - group.rect.x,
          y: node.position.y - group.rect.y,
        },
      };
    });
    next.push(groupNode);
  }
  return sortBoardNodesParentsBeforeChildren(next);
}

/** Собирает comment groups со всех веток канваса. */
export function collectCommentGroupsFromBoard(input: {
  readonly signalNodes: readonly Node[];
  readonly scenarioInitialNodes: readonly Node[];
  readonly scenarioOnConnectNodes: readonly Node[];
  readonly scenarioMainNodes: readonly Node[];
  readonly scenarioAlarmNodes: readonly Node[];
  readonly scenarioOnStopNodes: readonly Node[];
  readonly scenarioOnDisconnectNodes: readonly Node[];
  readonly scenarioFunctionNodes: readonly Node[];
}): ScenarioCommentGroup[] {
  return [
    ...extractCommentGroupsFromNodes('signal', input.signalNodes),
    ...extractCommentGroupsFromNodes('initial', input.scenarioInitialNodes),
    ...extractCommentGroupsFromNodes('onConnect', input.scenarioOnConnectNodes),
    ...extractCommentGroupsFromNodes('main', input.scenarioMainNodes),
    ...extractCommentGroupsFromNodes('alarm', input.scenarioAlarmNodes),
    ...extractCommentGroupsFromNodes('onStop', input.scenarioOnStopNodes),
    ...extractCommentGroupsFromNodes('onDisconnect', input.scenarioOnDisconnectNodes),
    ...extractCommentGroupsFromNodes('function', input.scenarioFunctionNodes),
  ];
}

/** ID boardGroup-нод со всех веток (для уникальности group-N при collapse). */
export function collectCommentGroupNodeIdsFromBoard(input: {
  readonly signalNodes: readonly Node[];
  readonly scenarioInitialNodes: readonly Node[];
  readonly scenarioOnConnectNodes: readonly Node[];
  readonly scenarioMainNodes: readonly Node[];
  readonly scenarioAlarmNodes: readonly Node[];
  readonly scenarioOnStopNodes: readonly Node[];
  readonly scenarioOnDisconnectNodes: readonly Node[];
  readonly scenarioFunctionNodes: readonly Node[];
}): readonly string[] {
  const ids: string[] = [];
  const collect = (nodes: readonly Node[]) => {
    for (const node of nodes) {
      if (isBoardGroupNode(node)) {
        ids.push(node.id);
      }
    }
  };
  collect(input.signalNodes);
  collect(input.scenarioInitialNodes);
  collect(input.scenarioOnConnectNodes);
  collect(input.scenarioMainNodes);
  collect(input.scenarioAlarmNodes);
  collect(input.scenarioOnStopNodes);
  collect(input.scenarioOnDisconnectNodes);
  collect(input.scenarioFunctionNodes);
  return ids;
}

/** Убирает дубликаты comment groups по id (первый выигрывает). */
export function dedupeCommentGroupIds(
  groups: readonly ScenarioCommentGroup[],
): ScenarioCommentGroup[] {
  const seen = new Set<string>();
  const out: ScenarioCommentGroup[] = [];
  for (const group of groups) {
    if (seen.has(group.id)) {
      continue;
    }
    seen.add(group.id);
    out.push(group);
  }
  return out;
}

/** Патч data boardGroup-ноды из инспектора метаданных. */
export function buildCommentGroupDataPatch(patch: {
  readonly title?: string;
  readonly description?: string;
  readonly frameColor?: ScenarioCommentGroupFrameColor;
}): Partial<BoardGroupNodeData> {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.frameColor !== undefined
      ? { frameColor: resolveScenarioCommentGroupFrameColor(patch.frameColor) }
      : {}),
  };
}

/** Обновляет data boardGroup-ноды на ветке; null если узел не найден. */
export function patchCommentGroupNodeData(
  nodes: readonly Node[],
  nodeId: string,
  dataPatch: Partial<BoardGroupNodeData>,
): Node[] | null {
  const index = nodes.findIndex((node) => node.id === nodeId && isBoardGroupNode(node));
  if (index < 0) {
    return null;
  }
  const node = nodes[index]!;
  const next = [...nodes];
  next[index] = {
    ...node,
    data: { ...(node.data as BoardGroupNodeData), ...dataPatch } as BoardGroupNodeData,
  };
  return next;
}
