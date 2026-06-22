import { describe, expect, it } from 'vitest';

import type { HydratedBoardState } from './hydrate-board-from-document.js';
import { EditUndoControllerCore } from './edit-undo-controller.js';

function minimalHydratedState(): HydratedBoardState {
  return {
    deviceKind: 'microphone',
    signalNodes: [],
    signalEdges: [],
    scenarioInitialNodes: [],
    scenarioInitialEdges: [],
    scenarioOnConnectNodes: [],
    scenarioOnConnectEdges: [],
    scenarioMainNodes: [],
    scenarioMainEdges: [],
    scenarioAlarmNodes: [],
    scenarioAlarmEdges: [],
    scenarioOnStopNodes: [],
    scenarioOnStopEdges: [],
    scenarioOnDisconnectNodes: [],
    scenarioOnDisconnectEdges: [],
    scenarioFunctionNodes: [],
    scenarioFunctionEdges: [],
    scenarioFunctionMeta: { name: 'fn', description: '' },
    scenarioFunctionDrafts: [],
    activeFunctionId: '',
    variables: [],
  };
}

describe('EditUndoControllerCore', () => {
  it('starts empty', () => {
    const core = new EditUndoControllerCore();
    expect(core.hasPending()).toBe(false);
    expect(core.takeForRestore()).toBeNull();
  });

  it('capture and takeForRestore clears pending', () => {
    const core = new EditUndoControllerCore();
    const state = minimalHydratedState();
    core.capture(state, 'align-layout');
    expect(core.hasPending()).toBe(true);
    expect(core.getLastAction()).toBe('align-layout');

    const taken = core.takeForRestore();
    expect(taken?.snapshot).toEqual(state);
    expect(taken?.action).toBe('align-layout');
    expect(core.hasPending()).toBe(false);
  });

  it('clear drops pending snapshot', () => {
    const core = new EditUndoControllerCore();
    core.capture(minimalHydratedState(), 'clear-branch');
    core.clear();
    expect(core.hasPending()).toBe(false);
    expect(core.getLastAction()).toBeNull();
  });
});
