import { describe, expect, it } from 'vitest';

import { createScenarioBoardNode } from './board-node-factory.js';
import { createEventBoardNode } from './event-node.js';
import {
  collapseSelectionToCommentGroup,
  extractCommentGroupsFromNodes,
  sortBoardNodesParentsBeforeChildren,
  stripCommentGroupNodes,
} from './comment-group.js';

describe('comment-group', () => {
  it('collapseSelectionToCommentGroup creates frame and parentId', () => {
    const a = createScenarioBoardNode('write-journal', { id: 'a', position: { x: 100, y: 100 } });
    const b = createScenarioBoardNode('record-chunk', { id: 'b', position: { x: 300, y: 120 } });
    const result = collapseSelectionToCommentGroup({
      branch: 'main',
      selectedNodeIds: ['a', 'b'],
      branchNodes: [a, b],
      groupId: 'group-test',
      title: 'My group',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.branchNodes.some((node) => node.type === 'boardGroup')).toBe(true);
      const groupIndex = result.branchNodes.findIndex((node) => node.id === 'group-test');
      const childIndex = result.branchNodes.findIndex((node) => node.id === 'a');
      expect(groupIndex).toBeGreaterThanOrEqual(0);
      expect(childIndex).toBeGreaterThan(groupIndex);
      const child = result.branchNodes.find((node) => node.id === 'a');
      expect(child?.parentId).toBe('group-test');
      expect(result.group.nodeIds).toEqual(['a', 'b']);
    }
  });

  it('rejects system nodes', () => {
    const event = createEventBoardNode({ id: 'ev', position: { x: 0, y: 0 } });
    const a = createScenarioBoardNode('write-journal', { id: 'a', position: { x: 100, y: 0 } });
    const result = collapseSelectionToCommentGroup({
      branch: 'main',
      selectedNodeIds: [event.id, a.id],
      branchNodes: [event, a],
    });
    expect(result.ok).toBe(false);
  });

  it('extract and strip round-trip', () => {
    const a = createScenarioBoardNode('write-journal', { id: 'a', position: { x: 120, y: 120 } });
    const b = createScenarioBoardNode('record-chunk', { id: 'b', position: { x: 320, y: 140 } });
    const collapsed = collapseSelectionToCommentGroup({
      branch: 'main',
      selectedNodeIds: ['a', 'b'],
      branchNodes: [a, b],
    });
    expect(collapsed.ok).toBe(true);
    if (!collapsed.ok) {
      return;
    }
    const groups = extractCommentGroupsFromNodes('main', collapsed.branchNodes);
    expect(groups).toHaveLength(1);
    expect(stripCommentGroupNodes(collapsed.branchNodes)).toHaveLength(2);
  });

  it('sortBoardNodesParentsBeforeChildren places group nodes before children', () => {
    const a = createScenarioBoardNode('write-journal', { id: 'a', position: { x: 100, y: 100 } });
    const b = createScenarioBoardNode('record-chunk', { id: 'b', position: { x: 300, y: 120 } });
    const collapsed = collapseSelectionToCommentGroup({
      branch: 'main',
      selectedNodeIds: ['a', 'b'],
      branchNodes: [a, b],
    });
    expect(collapsed.ok).toBe(true);
    if (!collapsed.ok) {
      return;
    }
    const shuffled = [...collapsed.branchNodes].reverse();
    const sorted = sortBoardNodesParentsBeforeChildren(shuffled);
    const groupIndex = sorted.findIndex((node) => node.type === 'boardGroup');
    const childIndex = sorted.findIndex((node) => node.id === 'a');
    expect(groupIndex).toBeLessThan(childIndex);
  });
});
