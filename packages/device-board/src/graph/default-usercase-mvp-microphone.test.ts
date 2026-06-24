import { describe, expect, it } from 'vitest';

import {
  createDefaultMvpMicrophoneHydratedState,
  getDefaultMvpMicrophoneDocument,
  isLegacyHackathonDefaultScenario,
  needsBundledV09FunctionsMigration,
  needsRecordingGateBootstrapMigration,
  needsFftTrendsPolicyConstructorMigration,
} from './default-usercase-mvp-microphone.js';
import { createDefaultHydratedBoardState } from './hydrate-board-from-document.js';

describe('default-usercase-mvp-microphone', () => {
  it('embedded document includes all MVP branches and user functions', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    expect(doc.scenario.initial.nodes.length).toBeGreaterThan(0);
    expect(doc.scenario.onConnect.nodes.length).toBeGreaterThan(0);
    expect(doc.scenario.loops.main.nodes.some((node) => node.nodeKind === 'make-fft-trends-policy')).toBe(
      true,
    );
    expect(doc.scenario.initial.nodes.some((node) => node.id === 'fn-1-block')).toBe(true);
    expect(
      doc.scenario.initial.nodes.some((node) => node.id === 'node-start-recording-bootstrap-v08-2'),
    ).toBe(false);
    expect(doc.scenario.functions.length).toBe(2);
    expect(doc.scenario.functions.map((fn) => fn.name).sort()).toEqual(['GetAudioStream', 'StartRecording']);
    expect(doc.scenario.loops.alarm.nodes.some((node) => node.id === 'alarm-infinity')).toBe(true);
    expect(doc.scenario.triggers.onStop.nodes.some((node) => node.nodeKind === 'stop-streaming')).toBe(
      true,
    );
    expect(doc.scenario.variables).toEqual([
      expect.objectContaining({ name: 'journal1', type: 'JournalRef' }),
    ]);
    expect(doc.scenario.variables.some((variable) => variable.name === 'device1')).toBe(false);
    expect(doc.scenario.variables.some((variable) => variable.name === 'microphone1')).toBe(false);
  });

  it('createDefaultHydratedBoardState(microphone) hydrates MVP usercase', () => {
    const state = createDefaultHydratedBoardState('microphone');
    expect(state.scenarioMainNodes.some((node) => node.data.nodeKind === 'make-fft-trends-policy')).toBe(
      true,
    );
    expect(state.scenarioInitialNodes.some((node) => node.data.nodeKind === 'start-streaming')).toBe(
      true,
    );
    expect(state.scenarioOnConnectNodes.some((node) => node.data.nodeKind === 'get-journal')).toBe(true);
    expect(state.scenarioMainNodes.some((node) => node.id === 'fn-1-block')).toBe(true);
    expect(state.variables.some((variable) => variable.name === 'journal1')).toBe(true);
    expect(state.variables.some((variable) => variable.name === 'microphone1')).toBe(false);
  });

  it('matches dedicated MVP hydrator', () => {
    const fromDefault = createDefaultHydratedBoardState('microphone');
    const fromMvp = createDefaultMvpMicrophoneHydratedState();
    expect(fromDefault.scenarioMainNodes.length).toBe(fromMvp.scenarioMainNodes.length);
    expect(fromDefault.variables.length).toBe(fromMvp.variables.length);
  });

  it('detects legacy hackathon default document', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    expect(isLegacyHackathonDefaultScenario(doc)).toBe(false);
    const legacy = {
      ...doc,
      scenario: {
        ...doc.scenario,
        loops: {
          ...doc.scenario.loops,
          main: {
            entry: 'main-on-tick',
            nodes: [{ id: 'main-fn', blockKind: 'subgraph', position: { x: 0, y: 0 } }],
            edges: [],
          },
        },
      },
    };
    expect(isLegacyHackathonDefaultScenario(legacy)).toBe(true);
  });

  it('does not flag v0.9-functions for flat bootstrap migration', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    expect(needsRecordingGateBootstrapMigration(doc)).toBe(false);
    expect(needsBundledV09FunctionsMigration(doc)).toBe(false);
  });

  it('detects broken gate topology without onStart fn-1 bootstrap', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    const broken = {
      ...doc,
      scenario: {
        ...doc.scenario,
        initial: {
          ...doc.scenario.initial,
          nodes: doc.scenario.initial.nodes.filter((node) => node.id !== 'fn-1-block'),
          edges: doc.scenario.initial.edges.filter(
            (edge) => edge.source !== 'fn-1-block' && edge.target !== 'fn-1-block',
          ),
        },
      },
    };
    expect(needsRecordingGateBootstrapMigration(broken)).toBe(true);
  });

  it('detects flat v0.8 without functions for bundled v0.9 migration', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    const flat = {
      ...doc,
      scenario: {
        ...doc.scenario,
        functions: [],
        initial: {
          ...doc.scenario.initial,
          nodes: doc.scenario.initial.nodes.filter((node) => node.id !== 'fn-1-block'),
          edges: doc.scenario.initial.edges.filter(
            (edge) => edge.source !== 'fn-1-block' && edge.target !== 'fn-1-block',
          ),
        },
        loops: {
          ...doc.scenario.loops,
          main: {
            ...doc.scenario.loops.main,
            nodes: [
              ...doc.scenario.loops.main.nodes.filter(
                (node) => node.blockKind !== 'subgraph' || !node.id.includes('fn-'),
              ),
              {
                id: 'node-make-recording-policy-flat',
                blockKind: 'custom',
                position: { x: 0, y: 0 },
                label: 'MakeRecordingPolicy',
                nodeKind: 'make-recording-policy',
              },
            ],
            edges: doc.scenario.loops.main.edges.filter(
              (edge) =>
                !edge.source.includes('fn-') &&
                !edge.target.includes('fn-') &&
                edge.source !== 'fn-1-block' &&
                edge.target !== 'fn-1-block',
            ),
          },
        },
      },
    };
    expect(needsBundledV09FunctionsMigration(flat)).toBe(true);
  });

  it('detects main loop without MakeFftTrendsPolicy wiring', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    expect(needsFftTrendsPolicyConstructorMigration(doc)).toBe(false);
    const withoutPolicy = {
      ...doc,
      scenario: {
        ...doc.scenario,
        loops: {
          ...doc.scenario.loops,
          main: {
            ...doc.scenario.loops.main,
            nodes: doc.scenario.loops.main.nodes.filter(
              (node) => node.nodeKind !== 'make-fft-trends-policy',
            ),
            edges: doc.scenario.loops.main.edges.filter(
              (edge) => !edge.source.includes('make-fft-trends-policy'),
            ),
          },
        },
      },
    };
    expect(needsFftTrendsPolicyConstructorMigration(withoutPolicy)).toBe(true);
  });

  it('main loop wires fft policy via data-only and makeTrack restarts via fn-3 → fn-1', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    const main = doc.scenario.loops.main;
    const trendsPolicy = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-policy');
    const analysisNode = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-analysis');
    const makeTrack = main.nodes.find((node) => node.nodeKind === 'make-track');
    const restartBlock = main.nodes.find((node) => node.id === 'fn-1-block');
    const fn3Block = main.nodes.find((node) => node.id === 'fn-3-block-2');
    expect(trendsPolicy).toBeDefined();
    expect(analysisNode).toBeDefined();
    expect(makeTrack).toBeDefined();
    expect(restartBlock).toBeDefined();
    expect(fn3Block).toBeDefined();
    if (
      trendsPolicy === undefined ||
      analysisNode === undefined ||
      makeTrack === undefined ||
      restartBlock === undefined ||
      fn3Block === undefined
    ) {
      return;
    }
    expect(
      main.edges.some(
        (edge) =>
          edge.kind === 'data' &&
          edge.source === trendsPolicy.id &&
          edge.target === analysisNode.id &&
          edge.targetHandle === 'policy' &&
          edge.dataType === 'FftTrendsPolicy',
      ),
    ).toBe(true);
    expect(
      main.edges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === makeTrack.id &&
          edge.target === fn3Block.id,
      ),
    ).toBe(true);
    expect(
      main.edges.some(
        (edge) =>
          edge.kind === 'exec' &&
          edge.source === fn3Block.id &&
          edge.target === restartBlock.id,
      ),
    ).toBe(true);
    expect(main.nodes.filter((node) => node.nodeKind === 'publish-report').length).toBe(2);
  });

  it('detects legacy exec-hop through fft policy constructors in flat main', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    const main = doc.scenario.loops.main;
    const trendsPolicy = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-policy');
    const makeTrack = main.nodes.find((node) => node.nodeKind === 'make-track');
    expect(trendsPolicy).toBeDefined();
    expect(makeTrack).toBeDefined();
    if (trendsPolicy === undefined || makeTrack === undefined) {
      return;
    }
    const flatMain = {
      ...main,
      nodes: [
        ...main.nodes,
        {
          id: 'node-make-recording-policy-flat',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          label: 'MakeRecordingPolicy',
          nodeKind: 'make-recording-policy',
        },
        {
          id: 'node-start-recording-mqv07-36',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          label: 'StartRecording',
          nodeKind: 'start-recording',
        },
      ],
      edges: [
        ...main.edges,
        {
          source: 'node-make-recording-policy-flat',
          sourceHandle: 'exec-out',
          target: trendsPolicy.id,
          targetHandle: 'exec-in',
          kind: 'exec' as const,
        },
      ],
    };
    const legacyExecHop = {
      ...doc,
      scenario: {
        ...doc.scenario,
        functions: [],
        loops: {
          ...doc.scenario.loops,
          main: flatMain,
        },
      },
    };
    expect(needsFftTrendsPolicyConstructorMigration(legacyExecHop)).toBe(true);
  });
});
