import { describe, expect, it } from 'vitest';

import { DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT } from './default-usercase-mvp-microphone.generated.js';
import {
  applyUserCaseLayoutCanon,
  buildMvpMainCommentGroups,
  verifyUserCaseDocumentLayout,
} from './usercase-layout-canon.js';

describe('usercase-layout-canon', () => {
  it('applyUserCaseLayoutCanon yields grid-aligned main nodes', () => {
    const canon = applyUserCaseLayoutCanon(DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
    for (const node of canon.scenario.loops.main.nodes) {
      expect(node.position.x % 8 === 0 || Object.is(node.position.x % 8, -0)).toBe(true);
      expect(node.position.y % 8 === 0 || Object.is(node.position.y % 8, -0)).toBe(true);
    }
  });

  it('verifyUserCaseDocumentLayout passes after layout canon', () => {
    const canon = applyUserCaseLayoutCanon(DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
    const result = verifyUserCaseDocumentLayout(canon);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
  });

  it('buildMvpMainCommentGroups creates semantic frames on laid-out main', () => {
    const canon = applyUserCaseLayoutCanon(DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
    const groups = buildMvpMainCommentGroups(canon.scenario.loops.main);
    expect(groups.length).toBeGreaterThanOrEqual(3);
    expect(groups.some((group) => group.id === 'ucg-main-recording-gate')).toBe(true);
    expect(canon.scenario.commentGroups.length).toBeGreaterThanOrEqual(3);
  });

  it('verify detects off-grid positions', () => {
    const doc = structuredClone(DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
    const nodes = doc.scenario.loops.main.nodes.map((node, index) =>
      index === 0
        ? { ...node, position: { x: 13, y: 27 } }
        : node,
    );
    const bad = {
      ...doc,
      scenario: {
        ...doc.scenario,
        loops: {
          ...doc.scenario.loops,
          main: { ...doc.scenario.loops.main, nodes },
        },
      },
    };
    const result = verifyUserCaseDocumentLayout(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'grid-misaligned')).toBe(true);
  });
});
