import { describe, expect, it } from 'vitest';

import { DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT } from './default-usercase-mvp-microphone.generated.js';
import { hydrateBoardFromDocument, hydratedFunctionInputs, isPreRunValid, validatePreRun } from './index.js';
import {
  computeTeamPackLayoutMetrics,
  packMvpUserCaseForTeamAsyncV2,
} from './usercase-competition-pack.js';
import { applyUserCaseLayoutCanon, verifyUserCaseDocumentLayout } from './usercase-layout-canon.js';

const EXPECTED_ASYNC_V2_FUNCTIONS: Record<'alpha' | 'beta' | 'gamma', number> = {
  alpha: 4,
  beta: 3,
  gamma: 3,
};

describe('usercase-competition-async-v2-pack (Phase 2β)', () => {
  for (const team of ['alpha', 'beta', 'gamma'] as const) {
    it(`packs ${team} async v2 with team-specific functions and pre-run valid`, () => {
      const packed = packMvpUserCaseForTeamAsyncV2(team, DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
      expect(packed.meta?.competitionBase).toBe('v2.0-async');
      expect(packed.scenario.functions.length).toBe(EXPECTED_ASYNC_V2_FUNCTIONS[team]);

      const mainKinds = new Set(packed.scenario.loops.main.nodes.map((node) => node.nodeKind));
      expect(mainKinds.has('sequence')).toBe(true);

      const canon = applyUserCaseLayoutCanon(packed);
      const verify = verifyUserCaseDocumentLayout(canon);
      expect(verify.ok, JSON.stringify(verify.errors)).toBe(true);
      expect(canon.scenario.commentGroups.length).toBeGreaterThanOrEqual(4);

      const hydrated = hydrateBoardFromDocument(canon);
      const preRunIssues = validatePreRun({
        deviceKind: hydrated.deviceKind,
        signalNodes: hydrated.signalNodes,
        signalEdges: hydrated.signalEdges,
        scenarioInitialNodes: hydrated.scenarioInitialNodes,
        scenarioInitialEdges: hydrated.scenarioInitialEdges,
        scenarioOnConnectNodes: hydrated.scenarioOnConnectNodes,
        scenarioOnConnectEdges: hydrated.scenarioOnConnectEdges,
        scenarioMainNodes: hydrated.scenarioMainNodes,
        scenarioMainEdges: hydrated.scenarioMainEdges,
        scenarioAlarmNodes: hydrated.scenarioAlarmNodes,
        scenarioAlarmEdges: hydrated.scenarioAlarmEdges,
        scenarioOnStopNodes: hydrated.scenarioOnStopNodes,
        scenarioOnStopEdges: hydrated.scenarioOnStopEdges,
        scenarioOnDisconnectNodes: hydrated.scenarioOnDisconnectNodes,
        scenarioOnDisconnectEdges: hydrated.scenarioOnDisconnectEdges,
        scenarioFunctions: hydratedFunctionInputs(hydrated),
        variables: hydrated.variables,
      });
      expect(isPreRunValid(preRunIssues), JSON.stringify(preRunIssues)).toBe(true);

      const metrics = computeTeamPackLayoutMetrics(canon);
      expect(metrics.functionCount).toBe(EXPECTED_ASYNC_V2_FUNCTIONS[team]);
    });
  }

  it('alpha keeps StartAsyncJob visible on main (Act IIb narrative)', () => {
    const canon = applyUserCaseLayoutCanon(
      packMvpUserCaseForTeamAsyncV2('alpha', DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT),
    );
    const kinds = new Set(canon.scenario.loops.main.nodes.map((node) => node.nodeKind));
    expect(kinds.has('start-async-job')).toBe(true);
    expect(kinds.has('on-async-resolved')).toBe(false);
  });

  it('beta collapses upload pipeline into one function block', () => {
    const packed = packMvpUserCaseForTeamAsyncV2('beta', DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
    expect(
      packed.scenario.functions.some((fn) => fn.id === 'fn-beta-async-upload-pipeline'),
    ).toBe(true);
    const kinds = new Set(packed.scenario.loops.main.nodes.map((node) => node.nodeKind));
    expect(kinds.has('start-async-job')).toBe(false);
  });
});
