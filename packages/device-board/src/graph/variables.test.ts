import { describe, expect, it } from 'vitest';
import { createScenarioVariable, parseDeviceScenarioDocument } from '@membrana/core';

import {
  buildDemoFunctionInput,
  buildDeviceScenarioDocument,
  createVariableBoardNode,
  hydrateBoardFromDocument,
  INITIAL_SCENARIO_ALARM_EDGES,
  INITIAL_SCENARIO_ALARM_NODES,
  INITIAL_SCENARIO_MAIN_EDGES,
  INITIAL_SCENARIO_MAIN_NODES,
  INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
  INITIAL_SCENARIO_ON_DISCONNECT_NODES,
  INITIAL_SCENARIO_ON_STOP_EDGES,
  INITIAL_SCENARIO_ON_STOP_NODES,
  INITIAL_SIGNAL_EDGES,
  INITIAL_SIGNAL_NODES,
  isValidBoardConnection,
  variableNodePins,
  VARIABLE_VALUE_HANDLE,
} from './index.js';
import type { BoardFlowNodeData } from './board-node-data.js';

const deviceVar = createScenarioVariable('var-device-1', 'device1', 'DeviceRef');
const micVar = createScenarioVariable('var-mic-1', 'microphone1', 'MicrophoneRef');

function buildDocWith(nodes: ReturnType<typeof createVariableBoardNode>[], variables = [deviceVar]) {
  return buildDeviceScenarioDocument({
    deviceKind: 'microphone',
    signalNodes: INITIAL_SIGNAL_NODES,
    signalEdges: INITIAL_SIGNAL_EDGES,
    scenarioInitialNodes: nodes,
    scenarioInitialEdges: [],
    scenarioMainNodes: INITIAL_SCENARIO_MAIN_NODES,
    scenarioMainEdges: INITIAL_SCENARIO_MAIN_EDGES,
    scenarioAlarmNodes: INITIAL_SCENARIO_ALARM_NODES,
    scenarioAlarmEdges: INITIAL_SCENARIO_ALARM_EDGES,
    scenarioOnStopNodes: INITIAL_SCENARIO_ON_STOP_NODES,
    scenarioOnStopEdges: INITIAL_SCENARIO_ON_STOP_EDGES,
    scenarioOnDisconnectNodes: INITIAL_SCENARIO_ON_DISCONNECT_NODES,
    scenarioOnDisconnectEdges: INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
    scenarioFunctions: [buildDemoFunctionInput()],
    variables,
  });
}

describe('device-board variables (DBR2)', () => {
  it('serializes scenario variables into a parseable document', () => {
    const doc = buildDocWith([], [deviceVar, micVar]);
    expect(doc.scenario.variables).toHaveLength(2);
    const parsed = parseDeviceScenarioDocument(doc);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.scenario.variables).toEqual([deviceVar, micVar]);
  });

  it('round-trips variable get/set nodes through build → parse → hydrate', () => {
    const getNode = createVariableBoardNode('variable-get', deviceVar, { id: 'n-get' });
    const setNode = createVariableBoardNode('variable-set', deviceVar, { id: 'n-set' });
    const doc = buildDocWith([getNode, setNode]);

    const parsed = parseDeviceScenarioDocument(doc);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const initial = parsed.value.scenario.initial.nodes;
    expect(initial.find((node) => node.id === 'n-get')).toMatchObject({
      nodeKind: 'variable-get',
      variableId: 'var-device-1',
    });
    expect(initial.find((node) => node.id === 'n-set')).toMatchObject({
      nodeKind: 'variable-set',
      variableId: 'var-device-1',
    });

    const state = hydrateBoardFromDocument(parsed.value);
    const hydratedGet = state.scenarioInitialNodes.find((node) => node.id === 'n-get');
    expect(hydratedGet).toBeDefined();
    const getData = hydratedGet?.data as BoardFlowNodeData;
    expect(getData.nodeKind).toBe('variable-get');
    expect(getData.variableId).toBe('var-device-1');
    expect(getData.outputs?.[0]).toMatchObject({ name: VARIABLE_VALUE_HANDLE, socketType: 'DeviceRef' });

    const hydratedSet = state.scenarioInitialNodes.find((node) => node.id === 'n-set');
    const setData = hydratedSet?.data as BoardFlowNodeData;
    expect(setData.nodeKind).toBe('variable-set');
    expect(setData.inputs?.some((pin) => pin.name === VARIABLE_VALUE_HANDLE && pin.socketType === 'DeviceRef')).toBe(true);
  });

  it('drops variable nodes whose variable no longer exists on hydrate', () => {
    const getNode = createVariableBoardNode('variable-get', deviceVar, { id: 'n-orphan' });
    const doc = buildDocWith([getNode], []); // variables stripped
    const parsed = parseDeviceScenarioDocument(doc);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const state = hydrateBoardFromDocument(parsed.value);
    expect(state.scenarioInitialNodes.find((node) => node.id === 'n-orphan')).toBeUndefined();
  });

  it('produces pins typed by the reference SocketType', () => {
    expect(variableNodePins('variable-get', 'DeviceRef')).toMatchObject({
      outputs: [{ name: 'value', kind: 'data', socketType: 'DeviceRef' }],
    });
    expect(variableNodePins('variable-get', 'DeviceRef', false).inputs).toEqual([
      expect.objectContaining({ name: 'exec-in', kind: 'exec' }),
    ]);
    const setPins = variableNodePins('variable-set', 'MicrophoneRef');
    expect(setPins.inputs.some((pin) => pin.kind === 'exec')).toBe(true);
    expect(setPins.inputs.some((pin) => pin.socketType === 'MicrophoneRef')).toBe(true);
    expect(setPins.outputs.some((pin) => pin.name === VARIABLE_VALUE_HANDLE && pin.socketType === 'MicrophoneRef')).toBe(
      true,
    );
  });
});

describe('device-board variable connection validation (DBR2)', () => {
  const getDevice = createVariableBoardNode('variable-get', deviceVar, { id: 'get-device' });
  const setDevice = createVariableBoardNode('variable-set', deviceVar, { id: 'set-device' });
  const setMic = createVariableBoardNode('variable-set', micVar, { id: 'set-mic' });

  it('accepts a data edge between matching reference types', () => {
    const valid = isValidBoardConnection(
      {
        source: 'get-device',
        target: 'set-device',
        sourceHandle: VARIABLE_VALUE_HANDLE,
        targetHandle: VARIABLE_VALUE_HANDLE,
      },
      [getDevice, setDevice],
      'scenario',
    );
    expect(valid).toBe(true);
  });

  it('rejects a data edge between incompatible reference types', () => {
    const invalid = isValidBoardConnection(
      {
        source: 'get-device',
        target: 'set-mic',
        sourceHandle: VARIABLE_VALUE_HANDLE,
        targetHandle: VARIABLE_VALUE_HANDLE,
      },
      [getDevice, setMic],
      'scenario',
    );
    expect(invalid).toBe(false);
  });
});
