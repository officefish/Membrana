import { describe, expect, it } from 'vitest';

import {
  createDefaultMvpMicrophoneHydratedState,
  getDefaultMvpMicrophoneDocument,
  isLegacyHackathonDefaultScenario,
  needsRecordingGateBootstrapMigration,
  needsFftTrendsPolicyConstructorMigration,
} from './default-usercase-mvp-microphone.js';
import { createDefaultHydratedBoardState } from './hydrate-board-from-document.js';

describe('default-usercase-mvp-microphone', () => {
  it('embedded document includes all MVP branches', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    expect(doc.scenario.initial.nodes.length).toBeGreaterThan(0);
    expect(doc.scenario.onConnect.nodes.length).toBeGreaterThan(0);
    expect(doc.scenario.loops.main.nodes.some((node) => node.nodeKind === 'make-recording-policy')).toBe(
      true,
    );
    expect(doc.scenario.loops.main.nodes.some((node) => node.nodeKind === 'make-fft-trends-policy')).toBe(
      true,
    );
    expect(
      doc.scenario.initial.nodes.some((node) => node.id === 'node-start-recording-bootstrap-v08-2'),
    ).toBe(true);
    expect(
      doc.scenario.loops.main.nodes.some((node) => node.id === 'node-start-recording-bootstrap-v08-2'),
    ).toBe(false);
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
    expect(state.scenarioMainNodes.some((node) => node.data.nodeKind === 'make-recording-policy')).toBe(
      true,
    );
    expect(state.scenarioInitialNodes.some((node) => node.data.nodeKind === 'start-streaming')).toBe(
      true,
    );
    expect(state.scenarioOnConnectNodes.some((node) => node.data.nodeKind === 'get-journal')).toBe(true);
    expect(state.scenarioMainNodes.some((node) => node.data.nodeKind === 'get-microphone')).toBe(true);
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

  it('detects broken gate topology without onStart bootstrap StartRecording', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    expect(needsRecordingGateBootstrapMigration(doc)).toBe(false);
    const gateNode = doc.scenario.loops.main.nodes.find(
      (node) => node.nodeKind === 'is-recording-window-full',
    );
    expect(gateNode).toBeDefined();
    if (gateNode === undefined) {
      return;
    }
    const broken = {
      ...doc,
      scenario: {
        ...doc.scenario,
        initial: {
          ...doc.scenario.initial,
          nodes: doc.scenario.initial.nodes.filter(
            (node) => node.id !== 'node-start-recording-bootstrap-v08-2',
          ),
          edges: doc.scenario.initial.edges.filter(
            (edge) =>
              edge.source !== 'node-start-recording-bootstrap-v08-2' &&
              edge.target !== 'node-start-recording-bootstrap-v08-2' &&
              edge.source !== 'node-get-recorder-mvp-initial-bootstrap-1' &&
              edge.target !== 'node-get-recorder-mvp-initial-bootstrap-1' &&
              edge.source !== 'node-make-recording-policy-mvp-initial-1' &&
              edge.target !== 'node-make-recording-policy-mvp-initial-1',
          ),
        },
      },
    };
    expect(needsRecordingGateBootstrapMigration(broken)).toBe(true);
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
              (edge) => edge.source !== 'node-make-fft-trends-policy-v08-1',
            ),
          },
        },
      },
    };
    expect(needsFftTrendsPolicyConstructorMigration(withoutPolicy)).toBe(true);
  });

  it('main loop wires policy constructors via data-only (pure G3)', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    const main = doc.scenario.loops.main;
    const recordingPolicy = main.nodes.find((node) => node.nodeKind === 'make-recording-policy');
    const trendsPolicy = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-policy');
    const analysisNode = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-analysis');
    const makeTrack = main.nodes.find((node) => node.nodeKind === 'make-track');
    const restartRecording = main.nodes.find((node) => node.id === 'node-start-recording-mqv07-36');
    expect(recordingPolicy).toBeDefined();
    expect(trendsPolicy).toBeDefined();
    expect(analysisNode).toBeDefined();
    expect(makeTrack).toBeDefined();
    expect(restartRecording).toBeDefined();
    if (
      recordingPolicy === undefined ||
      trendsPolicy === undefined ||
      analysisNode === undefined ||
      makeTrack === undefined ||
      restartRecording === undefined
    ) {
      return;
    }
    const policyIds = new Set([recordingPolicy.id, trendsPolicy.id]);
    expect(
      main.edges.some(
        (edge) =>
          edge.kind === 'exec' &&
          (policyIds.has(edge.source) || policyIds.has(edge.target)),
      ),
    ).toBe(false);
    expect(
      main.edges.some(
        (edge) =>
          edge.kind === 'data' &&
          edge.source === recordingPolicy.id &&
          edge.target === restartRecording.id &&
          edge.targetHandle === 'policy' &&
          edge.dataType === 'RecordingPolicy',
      ),
    ).toBe(true);
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
          edge.target === restartRecording.id,
      ),
    ).toBe(true);
  });

  it('detects legacy exec-hop through policy constructors', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    const main = doc.scenario.loops.main;
    const recordingPolicy = main.nodes.find((node) => node.nodeKind === 'make-recording-policy');
    const trendsPolicy = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-policy');
    const makeTrack = main.nodes.find((node) => node.nodeKind === 'make-track');
    expect(recordingPolicy).toBeDefined();
    expect(trendsPolicy).toBeDefined();
    expect(makeTrack).toBeDefined();
    if (recordingPolicy === undefined || trendsPolicy === undefined || makeTrack === undefined) {
      return;
    }
    const legacyExecHop = {
      ...doc,
      scenario: {
        ...doc.scenario,
        loops: {
          ...doc.scenario.loops,
          main: {
            ...main,
            edges: [
              ...main.edges.filter(
                (edge) =>
                  !(
                    edge.kind === 'exec' &&
                    edge.source === makeTrack.id &&
                    edge.target === 'node-start-recording-mqv07-36'
                  ),
              ),
              {
                source: recordingPolicy.id,
                sourceHandle: 'exec-out',
                target: trendsPolicy.id,
                targetHandle: 'exec-in',
                kind: 'exec' as const,
              },
            ],
          },
        },
      },
    };
    expect(needsFftTrendsPolicyConstructorMigration(legacyExecHop)).toBe(true);
  });
});
