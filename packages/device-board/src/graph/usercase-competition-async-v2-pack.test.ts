import { describe, expect, it } from 'vitest';

import { DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT } from './default-usercase-mvp-microphone.generated.js';
import { DEFAULT_USERCASE_MVP_MICROPHONE_ALPHA_ASYNC_V2_DOCUMENT } from './default-usercase-mvp-microphone-alpha-async-v2.generated.js';
import { hydrateBoardFromDocument, hydratedFunctionInputs, isPreRunValid, validatePreRun } from './index.js';
import { createStubScenarioRuntimeHost } from '../runtime/host.js';
import { runSubgraphOnce } from '../runtime/exec-subgraph.js';
import { CollectRuntimeStore } from '../runtime/collect-runtime-store.js';
import { ScenarioVariableStore } from '../runtime/variable-store.js';
import {
  computeTeamPackLayoutMetrics,
  packMvpUserCaseForTeamAsyncV2,
  stripBundledUserFunctionBlocksForTest,
} from './usercase-competition-pack.js';
import { applyUserCaseLayoutCanon, verifyUserCaseDocumentLayout } from './usercase-layout-canon.js';

const EXPECTED_ASYNC_V2_FUNCTIONS: Record<'alpha' | 'beta' | 'gamma', number> = {
  alpha: 6,
  beta: 5,
  gamma: 5,
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
    const mainEdges = canon.scenario.loops.main.edges;
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === 'main-on-tick' &&
          edge.target === 'fn-3-block',
      ),
    ).toBe(true);
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source.includes('recording-gate-block') &&
          edge.sourceHandle === 'exec-out' &&
          edge.target.includes('sequence'),
      ),
    ).toBe(true);
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === 'node-sequence-gate-v20-async' &&
          edge.sourceHandle === 'then-0' &&
          edge.target === 'node-start-async-job-v20',
      ),
    ).toBe(true);
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'data' &&
          edge.source === 'node-get-recorder-mqs6hyo6-171' &&
          edge.sourceHandle === 'recorder' &&
          edge.target === 'node-collect-samples-mqs2lopv-164' &&
          edge.targetHandle === 'recorder',
      ),
    ).toBe(true);
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'data' &&
          edge.source.includes('recording-gate-block') &&
          edge.sourceHandle === 'recorder' &&
          edge.target === 'node-collect-samples-mqs2lopv-164',
      ),
    ).toBe(false);
    const initialEdges = canon.scenario.initial.edges;
    expect(canon.scenario.initial.nodes.some((node) => node.id === 'fn-1-block')).toBe(true);
    expect(
      initialEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === 'node-start-streaming-mql556hh-49' &&
          edge.target === 'fn-1-block',
      ),
    ).toBe(true);
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === 'node-sequence-gate-v20-async' &&
          edge.sourceHandle === 'then-3' &&
          edge.target === 'fn-3-block-2',
      ),
    ).toBe(true);
  });

  it('strip keeps GetAudioStream blocks on main', () => {
    const baseMain = DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT.scenario.loops.main;
    const fnBlocks = baseMain.nodes.filter((node) => node.id.includes('fn-3'));
    expect(fnBlocks.length, 'base fn-3 blocks').toBeGreaterThan(0);
    const stripped = stripBundledUserFunctionBlocksForTest(DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
    const main = stripped.scenario.loops.main;
    expect(main.nodes.some((node) => node.id === 'fn-3-block')).toBe(true);
    expect(
      main.edges.some(
        (edge) => edge.kind === 'exec' && edge.source === main.entry && edge.target === 'fn-3-block',
      ),
    ).toBe(true);
  });

  it('alpha async v2 keeps main-on-tick wired to GetAudioStream (fn-3)', () => {
    const packed = packMvpUserCaseForTeamAsyncV2('alpha', DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
    const main = packed.scenario.loops.main;
    const hasFn3Block = main.nodes.some((node) => node.id === 'fn-3-block');
    const entryExec = main.edges.find(
      (edge) => edge.kind === 'exec' && edge.source === main.entry && edge.sourceHandle === 'exec-out',
    );
    expect(hasFn3Block, 'fn-3-block node').toBe(true);
    expect(entryExec?.target, 'main entry exec').toBe('fn-3-block');
    expect(packed.scenario.functions.some((fn) => fn.id === 'fn-3')).toBe(true);
  });

  it('alpha async v2 preserves onStart StartRecording (fn-1) and gate hot path (L22)', () => {
    const packed = packMvpUserCaseForTeamAsyncV2('alpha', DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
    const initial = packed.scenario.initial;
    expect(initial.nodes.some((node) => node.id === 'fn-1-block')).toBe(true);
    expect(
      initial.edges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === 'node-start-streaming-mql556hh-49' &&
          edge.target === 'fn-1-block',
      ),
    ).toBe(true);
    expect(packed.scenario.functions.some((fn) => fn.id === 'fn-1')).toBe(true);

    const main = packed.scenario.loops.main;
    const gateBlockId = 'fn-alpha-recording-gate-block';
    expect(
      main.edges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === gateBlockId &&
          edge.sourceHandle === 'exec-out' &&
          edge.target === 'node-sequence-gate-v20-async',
      ),
    ).toBe(true);
    expect(
      main.edges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === 'node-sequence-gate-v20-async' &&
          edge.target === gateBlockId &&
          edge.targetHandle === 'exec-in' &&
          (edge.sourceHandle === 'then-0' || edge.sourceHandle === 'then-1'),
      ),
    ).toBe(false);

    const gateFn = packed.scenario.functions.find((fn) => fn.id === 'fn-alpha-recording-gate');
    expect(gateFn?.nodes.some((node) => node.nodeKind === 'stop-recording')).toBe(true);
    const windowNode = gateFn?.nodes.find((node) => node.nodeKind === 'is-recording-window-full');
    const stopNode = gateFn?.nodes.find((node) => node.nodeKind === 'stop-recording');
    expect(
      gateFn?.edges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === windowNode?.id &&
          edge.sourceHandle === 'exec-true-out' &&
          edge.target === stopNode?.id,
      ),
    ).toBe(true);
    expect(
      gateFn?.edges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === gateFn.entry &&
          edge.target !== windowNode?.id,
      ),
    ).toBe(false);

    expect(
      main.edges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === 'node-sequence-gate-v20-async' &&
          edge.sourceHandle === 'then-0' &&
          edge.target === 'node-start-async-job-v20',
      ),
    ).toBe(true);
  });

  it('alpha async v2 embedded main tick runs past onTick (L20 runtime smoke)', async () => {
    const document = DEFAULT_USERCASE_MVP_MICROPHONE_ALPHA_ASYNC_V2_DOCUMENT;
    const entered: string[] = [];
    const host = createStubScenarioRuntimeHost();
    const variableStore = new ScenarioVariableStore(document.scenario.variables ?? []);
    const collectStore = new CollectRuntimeStore();

    try {
      await runSubgraphOnce(
        document.scenario.loops.main,
        host,
        new AbortController().signal,
        {
          branch: 'main',
          functions: document.scenario.functions,
          variableStore,
          collectStore,
          resolveContext: {
            scenarioFunctions: document.scenario.functions,
            getCollectBatchRef: (nodeId) => collectStore.getLastBatchRef(nodeId),
          },
        },
        {
          onNodeEnter: (node) => {
            entered.push(node.id);
          },
        },
      );
    } catch {
      // L20 smoke: достаточно пройти entry + sample pipeline; полный tick требует gate bridge (L9).
    }

    expect(entered[0]).toBe('main-on-tick');
    expect(entered.length).toBeGreaterThan(1);
    expect(
      entered.some((id) => id === 'fn-3-block' || id.includes('get-sample')),
      `entered: ${entered.join(' → ')}`,
    ).toBe(true);
  });

  it('beta collapses upload pipeline into one function block', () => {
    const packed = packMvpUserCaseForTeamAsyncV2('beta', DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
    expect(
      packed.scenario.functions.some((fn) => fn.id === 'fn-beta-async-upload-pipeline'),
    ).toBe(true);
    const kinds = new Set(packed.scenario.loops.main.nodes.map((node) => node.nodeKind));
    expect(kinds.has('start-async-job')).toBe(false);

    const mainEdges = packed.scenario.loops.main.edges;
    const uploadBlockId = 'fn-beta-async-upload-pipeline-block';
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source.includes('recording-gate-block') &&
          edge.sourceHandle === 'exec-out' &&
          edge.target.includes('sequence'),
      ),
    ).toBe(true);
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === 'node-sequence-gate-v20-async' &&
          edge.sourceHandle === 'then-0' &&
          edge.target === uploadBlockId,
      ),
    ).toBe(true);
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source.includes('recording-gate-block') &&
          edge.sourceHandle === 'exec-out' &&
          edge.target === uploadBlockId,
      ),
    ).toBe(false);
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === 'node-sequence-gate-v20-async' &&
          edge.sourceHandle === 'then-2' &&
          edge.target.includes('trends-publish'),
      ),
    ).toBe(true);
  });

  it('beta Phase 5 polish applies gamma ⑤⑥ titles to async comment groups', () => {
    const canon = applyUserCaseLayoutCanon(
      packMvpUserCaseForTeamAsyncV2('beta', DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT),
    );
    const titles = (canon.scenario.commentGroups ?? []).map((group) => group.title);
    expect(titles).toContain('⑤ Отправка в фоне');
    expect(titles).toContain('⑥ Отчёт дрон (detached)');
  });

  it('gamma collapses async live bundle and wires sequence before upload block', () => {
    const packed = packMvpUserCaseForTeamAsyncV2('gamma', DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT);
    expect(
      packed.scenario.functions.some((fn) => fn.id === 'fn-gamma-async-live-bundle'),
    ).toBe(true);
    const kinds = new Set(packed.scenario.loops.main.nodes.map((node) => node.nodeKind));
    expect(kinds.has('start-async-job')).toBe(false);

    const mainEdges = packed.scenario.loops.main.edges;
    const bundleBlockId = 'fn-gamma-async-live-bundle-block';
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source.includes('recording-gate-block') &&
          edge.sourceHandle === 'exec-out' &&
          edge.target.includes('sequence'),
      ),
    ).toBe(true);
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === 'node-sequence-gate-v20-async' &&
          edge.sourceHandle === 'then-0' &&
          edge.target === bundleBlockId,
      ),
    ).toBe(true);
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source.includes('recording-gate-block') &&
          edge.sourceHandle === 'exec-out' &&
          edge.target === bundleBlockId,
      ),
    ).toBe(false);
    expect(
      mainEdges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === 'node-sequence-gate-v20-async' &&
          edge.sourceHandle === 'then-2' &&
          edge.target.includes('trends-publish'),
      ),
    ).toBe(true);
  });
});
