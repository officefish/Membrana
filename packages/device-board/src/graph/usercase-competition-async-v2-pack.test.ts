import { describe, expect, it } from 'vitest';

import { DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT } from './default-usercase-mvp-microphone.generated.js';
import {
  computeTeamPackLayoutMetrics,
  packMvpUserCaseForTeam,
} from './usercase-competition-pack.js';
import { applyUserCaseLayoutCanon, verifyUserCaseDocumentLayout } from './usercase-layout-canon.js';

const ASYNC_V2_MAIN_NODE_KINDS = ['sequence', 'start-async-job', 'on-async-resolved'] as const;

describe('usercase-competition-async-v2-pack (Phase 2α)', () => {
  for (const team of ['alpha', 'beta', 'gamma'] as const) {
    it(`packs ${team} on v2.0-async base with async nodes visible and layout green`, () => {
      const packed = packMvpUserCaseForTeam(team, DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
      const main = packed.scenario.loops.main;
      const kinds = new Set(main.nodes.map((node) => node.nodeKind));

      for (const kind of ASYNC_V2_MAIN_NODE_KINDS) {
        expect(kinds.has(kind), `main must expose ${kind}`).toBe(true);
      }

      const canon = applyUserCaseLayoutCanon(packed);
      const verify = verifyUserCaseDocumentLayout(canon);
      expect(verify.ok, JSON.stringify(verify.errors)).toBe(true);
      expect(canon.scenario.commentGroups.length).toBeGreaterThanOrEqual(4);

      const metrics = computeTeamPackLayoutMetrics(canon);
      expect(metrics.functionCount).toBeGreaterThanOrEqual(2);
      expect(metrics.mainSubgraphBlockCount).toBeGreaterThanOrEqual(2);
    });
  }

  it('alpha has Act IIb async comment frames after layout canon', () => {
    const canon = applyUserCaseLayoutCanon(
      packMvpUserCaseForTeam('alpha', DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT),
    );
    const ids = new Set(canon.scenario.commentGroups.map((group) => group.id));
    expect(ids.has('ucg-alpha-async-iib-upload')).toBe(true);
    expect(ids.has('ucg-alpha-async-iib-detached')).toBe(true);
  });
});
