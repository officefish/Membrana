import { describe, expect, it } from 'vitest';

import { createDefaultMvpMicrophoneHydratedState } from './default-usercase-mvp-microphone.js';
import { createLoopTickEventBoardNode } from './event-node.js';
import { createPaletteBoardNode } from './palette-node.js';
import {
  findStartRecordingUnconditionalLoopIssues,
  START_RECORDING_UNCONDITIONAL_LOOP_MESSAGE,
} from './validate-start-recording-loop.js';
import { SCENARIO_MAIN_ENTRY } from './initial-board-state.js';
import { hydratedFunctionInputs, isPreRunValid, validatePreRun } from './index.js';

function execEdge(id: string, source: string, target: string) {
  return {
    id,
    source,
    sourceHandle: 'exec-out',
    target,
    targetHandle: 'exec-in',
  };
}

describe('findStartRecordingUnconditionalLoopIssues', () => {
  it('warns when start-recording is reachable from onTick without prior stop-recording', () => {
    const entry = createLoopTickEventBoardNode({
      id: SCENARIO_MAIN_ENTRY,
      position: { x: 0, y: 0 },
    });
    const start = createPaletteBoardNode('start-recording', {
      id: 'start-1',
      position: { x: 200, y: 0 },
    });
    const nodes = [entry, start];
    const edges = [execEdge('e1', entry.id, start.id)];

    const issues = findStartRecordingUnconditionalLoopIssues(
      nodes,
      edges,
      SCENARIO_MAIN_ENTRY,
      'scenario.loops.main',
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('start-recording-unconditional-loop-path');
    expect(issues[0]?.severity).toBe('warning');
    expect(issues[0]?.message).toBe(START_RECORDING_UNCONDITIONAL_LOOP_MESSAGE);
    expect(issues[0]?.path).toBe('scenario.loops.main/start-1');
  });

  it('does not warn when stop-recording precedes start-recording on the exec path', () => {
    const entry = createLoopTickEventBoardNode({
      id: SCENARIO_MAIN_ENTRY,
      position: { x: 0, y: 0 },
    });
    const stop = createPaletteBoardNode('stop-recording', {
      id: 'stop-1',
      position: { x: 200, y: 0 },
    });
    const start = createPaletteBoardNode('start-recording', {
      id: 'start-1',
      position: { x: 400, y: 0 },
    });
    const nodes = [entry, stop, start];
    const edges = [
      execEdge('e1', entry.id, stop.id),
      execEdge('e2', stop.id, start.id),
    ];

    const issues = findStartRecordingUnconditionalLoopIssues(
      nodes,
      edges,
      SCENARIO_MAIN_ENTRY,
      'scenario.loops.main',
    );

    expect(issues).toHaveLength(0);
  });

  it('does not warn on canonical MVP main loop after bootstrap moved to onStart', () => {
    const hydrated = createDefaultMvpMicrophoneHydratedState();
    const issues = findStartRecordingUnconditionalLoopIssues(
      hydrated.scenarioMainNodes,
      hydrated.scenarioMainEdges,
      SCENARIO_MAIN_ENTRY,
      'scenario.loops.main',
    );

    expect(issues).toHaveLength(0);
  });

  it('validatePreRun has no loop-path warning on canonical MVP', () => {
    const hydrated = createDefaultMvpMicrophoneHydratedState();
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

    expect(
      preRunIssues.some((issue) => issue.code === 'start-recording-unconditional-loop-path'),
    ).toBe(false);
    expect(isPreRunValid(preRunIssues)).toBe(true);
  });
});
