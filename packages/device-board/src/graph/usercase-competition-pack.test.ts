import { describe, expect, it } from 'vitest';

import { DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT } from './default-usercase-mvp-microphone.generated.js';
import { packMvpUserCaseForTeam } from './usercase-competition-pack.js';
import { applyUserCaseLayoutCanon, verifyUserCaseDocumentLayout } from './usercase-layout-canon.js';

describe('usercase-competition-pack', () => {
  for (const team of ['alpha', 'beta', 'gamma'] as const) {
    it(`packs ${team} with user functions and passes verify-layout`, () => {
      const packed = packMvpUserCaseForTeam(team, DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
      expect(packed.scenario.functions.length).toBeGreaterThanOrEqual(1);
      const canon = applyUserCaseLayoutCanon(packed);
      const verify = verifyUserCaseDocumentLayout(canon);
      expect(verify.ok, JSON.stringify(verify.errors)).toBe(true);
      expect(canon.scenario.commentGroups.length).toBeGreaterThanOrEqual(4);
    });
  }
});
