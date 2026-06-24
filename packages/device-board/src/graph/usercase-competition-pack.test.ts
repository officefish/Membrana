import { describe, expect, it } from 'vitest';

import { DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT } from './default-usercase-mvp-microphone.generated.js';
import {
  computeTeamPackLayoutMetrics,
  packMvpUserCaseForTeam,
} from './usercase-competition-pack.js';
import { applyUserCaseLayoutCanon, verifyUserCaseDocumentLayout } from './usercase-layout-canon.js';
import { hydrateBoardFromDocument, hydratedFunctionInputs, isPreRunValid, validatePreRun } from './index.js';

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
      expect(canon.meta?.executionPolicy).toBe('competition');
      expect(canon.meta?.isCompetitionTemplate).toBe(true);
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

  it('alpha observation block keeps parent data edges after multi-collapse pack', () => {
    const packed = packMvpUserCaseForTeam('alpha', DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
    const dataEdges = packed.scenario.loops.main.edges.filter(
      (edge) =>
        edge.kind === 'data' &&
        edge.target === 'fn-alpha-observation-tick-block' &&
        (edge.targetHandle === 'analyser' ||
          edge.targetHandle === 'policy' ||
          edge.targetHandle === 'journal'),
    );
    expect(dataEdges).toHaveLength(3);
  });
});
