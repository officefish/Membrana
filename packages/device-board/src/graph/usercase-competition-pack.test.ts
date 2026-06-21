import { describe, expect, it } from 'vitest';

import { DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT } from './default-usercase-mvp-microphone.generated.js';
import {
  computeTeamPackLayoutMetrics,
  packMvpUserCaseForTeam,
} from './usercase-competition-pack.js';
import { applyUserCaseLayoutCanon, verifyUserCaseDocumentLayout } from './usercase-layout-canon.js';

const EXPECTED_FUNCTIONS: Record<'alpha' | 'beta' | 'gamma', number> = {
  alpha: 3,
  beta: 3,
  gamma: 2,
};

describe('usercase-competition-pack', () => {
  for (const team of ['alpha', 'beta', 'gamma'] as const) {
    it(`packs ${team} with full Phase 2β functions and passes verify-layout`, () => {
      const packed = packMvpUserCaseForTeam(team, DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
      expect(packed.scenario.functions.length).toBe(EXPECTED_FUNCTIONS[team]);
      const canon = applyUserCaseLayoutCanon(packed);
      const verify = verifyUserCaseDocumentLayout(canon);
      expect(verify.ok, JSON.stringify(verify.errors)).toBe(true);
      expect(canon.scenario.commentGroups.length).toBeGreaterThanOrEqual(4);
      const metrics = computeTeamPackLayoutMetrics(canon);
      expect(metrics.functionCount).toBe(EXPECTED_FUNCTIONS[team]);
      expect(metrics.mainSubgraphBlockCount).toBeGreaterThanOrEqual(2);
    });
  }

  it('beta main orchestrator has 3 function blocks', () => {
    const canon = applyUserCaseLayoutCanon(
      packMvpUserCaseForTeam('beta', DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT),
    );
    const metrics = computeTeamPackLayoutMetrics(canon);
    expect(metrics.mainSubgraphBlockCount).toBe(3);
    expect(metrics.mainScenarioNodeCount).toBeLessThanOrEqual(16);
  });
});
